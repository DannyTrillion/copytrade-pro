import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyTOTP, verifyBackupCode } from "@/lib/totp";
import type { Role } from "@/config/constants";
import { AUTH_RATE_LIMITS, GENERIC_AUTH_ERROR } from "@/config/security";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserSecurityState, validateSession } from "@/lib/security/session";
import { enforceAccess } from "@/lib/security/enforcement";
import { computeRiskScoreAsync } from "@/lib/security/risk/engine";
import {
  DEVICE_ID_HEADER,
  getRequestContext,
  logSecurityEventAsync,
  recordLoginAttemptAsync,
} from "@/lib/security/events";
import { parseUserAgent } from "@/lib/security/user-agent";
import { recordDeviceSighting } from "@/lib/security/devices";

/**
 * Build a Headers object from the request NextAuth hands to `authorize`.
 *
 * The shape differs between runtimes — a plain object under the Node adapter, a
 * `Headers` instance elsewhere — so this normalises it. Always returns a fresh
 * mutable copy: the caller injects the device fingerprint into it, and a
 * request's own headers may be immutable.
 */
function toHeaders(req: unknown): Headers {
  const headers = new Headers();
  const raw = (req as { headers?: Record<string, string | string[]> } | undefined)
    ?.headers;

  if (!raw) return headers;

  if (typeof (raw as unknown as Headers).forEach === "function") {
    (raw as unknown as Headers).forEach((value, key) => headers.set(key, value));
    return headers;
  }

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(","));
  }

  return headers;
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "2FA Code", type: "text" },
        deviceId: { label: "Device", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email.trim().toLowerCase();
        const headers = toHeaders(req);

        // next-auth's signIn() cannot set headers, so the browser sends the
        // fingerprint as a credential instead. Fold it into the header view so
        // downstream code has one uniform source for request context.
        const credentialDeviceId = credentials.deviceId?.trim();
        if (credentialDeviceId && !headers.get(DEVICE_ID_HEADER)) {
          headers.set(DEVICE_ID_HEADER, credentialDeviceId.slice(0, 128));
        }

        const context = getRequestContext(headers);
        const ua = parseUserAgent(context.userAgent);

        /**
         * Deny without disclosing which control fired. Distinguishing "wrong
         * password" from "banned" from "rate limited" hands an attacker a
         * free account-enumeration and ban-detection oracle, so every failure
         * returns the same string. The real cause goes to the security log.
         */
        const deny = (failureReason: string, userId?: string): never => {
          recordLoginAttemptAsync({
            email,
            success: false,
            userId,
            failureReason,
            context,
            browser: ua.browser,
            os: ua.os,
          });
          throw new Error(GENERIC_AUTH_ERROR);
        };

        // Two independent limits: per-identity stops targeted password
        // guessing, per-IP stops credential stuffing spread across accounts.
        const [emailLimit, ipLimit] = await Promise.all([
          checkRateLimit(
            `login:email:${email}`,
            AUTH_RATE_LIMITS.LOGIN_PER_EMAIL.attempts,
            AUTH_RATE_LIMITS.LOGIN_PER_EMAIL.windowMs
          ),
          context.ip
            ? checkRateLimit(
                `login:ip:${context.ip}`,
                AUTH_RATE_LIMITS.LOGIN_PER_IP.attempts,
                AUTH_RATE_LIMITS.LOGIN_PER_IP.windowMs
              )
            : Promise.resolve({ allowed: true } as const),
        ]);

        if (!emailLimit.allowed || !ipLimit.allowed) {
          logSecurityEventAsync({
            type: "RATE_LIMITED",
            severity: "MEDIUM",
            email,
            reason: !emailLimit.allowed
              ? "Login rate limit exceeded for identity"
              : "Login rate limit exceeded for address",
            context,
          });
          return deny("RATE_LIMITED");
        }

        // Network / identity / device blacklists. Device-to-banned-account
        // correlation is intentionally not applied on login — see the comment
        // in enforcement.ts; it would lock out households and public machines.
        const permitted = await enforceAccess({
          surface: "LOGIN",
          email,
          context,
        });

        if (!permitted) {
          return deny("BLOCKED_BY_SECURITY_RULE");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return deny("NO_SUCH_ACCOUNT");
        }

        // Compare the password before any state check. Short-circuiting on
        // ban status first would let an attacker probe account state without
        // knowing the password, and would leak timing information.
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return deny("BAD_PASSWORD", user.id);
        }

        if (user.deletedAt) {
          logSecurityEventAsync({
            type: "LOGIN_BLOCKED",
            severity: "MEDIUM",
            userId: user.id,
            email,
            reason: "Account deleted",
            context,
          });
          return deny("ACCOUNT_DELETED", user.id);
        }

        if (user.bannedAt) {
          logSecurityEventAsync({
            type: "LOGIN_BLOCKED",
            severity: "HIGH",
            userId: user.id,
            email,
            reason: "Account banned",
            context,
          });
          return deny("ACCOUNT_BANNED", user.id);
        }

        if (user.suspended) {
          logSecurityEventAsync({
            type: "LOGIN_BLOCKED",
            severity: "MEDIUM",
            userId: user.id,
            email,
            reason: "Account suspended",
            context,
          });
          return deny("ACCOUNT_SUSPENDED", user.id);
        }

        // Two-factor authentication check
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const twoFactorCode = credentials.twoFactorCode;

          if (!twoFactorCode) {
            throw new Error("2FA_REQUIRED");
          }

          const isValid2FA = verifyTOTP(user.twoFactorSecret, twoFactorCode);
          if (!isValid2FA) {
            // Fallback: try backup code verification
            if (user.twoFactorBackupCodes) {
              const hashedCodes: string[] = JSON.parse(user.twoFactorBackupCodes);
              const result = verifyBackupCode(twoFactorCode, hashedCodes);
              if (result.valid) {
                // Remove used backup code from storage
                await prisma.user.update({
                  where: { id: user.id },
                  data: {
                    twoFactorBackupCodes: JSON.stringify(result.remaining),
                  },
                });
              } else {
                return deny("BAD_2FA_CODE", user.id);
              }
            } else {
              return deny("BAD_2FA_CODE", user.id);
            }
          }
        }

        // Authentication succeeded — record history and refresh the device
        // record. Both are fire-and-forget: neither should be able to fail a
        // login that has already been authorised.
        recordLoginAttemptAsync({
          email,
          success: true,
          userId: user.id,
          context,
          browser: ua.browser,
          os: ua.os,
        });

        void recordDeviceSighting({ userId: user.id, context, ua }).catch(
          (error) => console.error("[security] Device sighting failed:", error)
        );

        void prisma.user
          .update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              lastLoginIp: context.ip,
              lastLoginCountry: context.country,
            },
          })
          .catch((error) =>
            console.error("[security] Failed to stamp last login:", error)
          );

        // Rescore in the background. Deliberately not awaited: the rules issue
        // a dozen queries between them, and no login should wait on advisory
        // analytics. The score is for admin review, not for gating this request.
        computeRiskScoreAsync(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user, account }) {
      // Handle OAuth provider sign-ins (Google, etc.)
      if (account?.provider && account.provider !== "credentials") {
        const email = user.email;
        if (!email) return false;

        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          // Create new user for OAuth sign-in
          await prisma.user.create({
            data: {
              email,
              name: user.name || email.split("@")[0],
              passwordHash: "", // OAuth users don't have a password
              role: "FOLLOWER",
              emailVerified: true, // Google verifies emails
            },
          });
        } else if (!existingUser.emailVerified) {
          // Mark email as verified for existing users signing in via Google
          await prisma.user.update({
            where: { email },
            data: { emailVerified: true },
          });
        }

        // Block suspended users
        // OAuth bypasses `authorize`, so account-state enforcement has to be
        // repeated here or Google sign-in becomes a hole straight through
        // every ban.
        if (existingUser?.deletedAt || existingUser?.bannedAt || existingUser?.suspended) {
          logSecurityEventAsync({
            type: "LOGIN_BLOCKED",
            severity: existingUser.bannedAt ? "HIGH" : "MEDIUM",
            userId: existingUser.id,
            email,
            reason: `OAuth sign-in blocked (${
              existingUser.deletedAt
                ? "deleted"
                : existingUser.bannedAt
                  ? "banned"
                  : "suspended"
            })`,
          });
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;

        // Stamp the current session version at sign-in. Every later refresh
        // compares against this, so a token minted before a ban is rejected
        // the moment the counter moves.
        const state = await getUserSecurityState(user.id);
        token.sessionVersion = state?.sessionVersion ?? 0;
        token.revoked = undefined;
        token.revokedReason = undefined;
      }

      // Handle admin impersonation session update
      if (trigger === "update" && session) {
        // Only an ADMIN token may start impersonating. Without this gate any
        // authenticated user could call session.update({ impersonate: {...} })
        // and assume an arbitrary account or escalate to ADMIN.
        if (session.impersonate && token.role === "ADMIN") {
          // Start impersonation
          token.impersonatorId = token.id as string;
          token.originalRole = token.role as Role;
          token.id = session.impersonate.userId;
          token.role = session.impersonate.role;
          token.isImpersonating = true;
        } else if (session.stopImpersonation) {
          // Stop impersonation — restore original admin
          token.id = token.impersonatorId as string;
          token.role = token.originalRole as Role;
          token.isImpersonating = undefined;
          token.impersonatorId = undefined;
          token.originalRole = undefined;
        }
      }

      // For OAuth users, token.id may not be set on first sign-in
      // Fetch user from DB by email to populate token fields
      if (!token.id && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, suspended: true, sessionVersion: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role as Role;
          token.suspended = dbUser.suspended;
          token.sessionVersion = dbUser.sessionVersion;
        }
      }

      /**
       * Revalidate against current database state on every refresh.
       *
       * This is the enforcement point for session revocation. It runs
       * server-side on each `getServerSession()` call, so a ban takes effect
       * on the banned user's very next request — the JWT stays
       * cryptographically valid but stops being *accepted*.
       *
       * Skipped while impersonating: the token then carries the target's id
       * but the admin's authority, so revalidating against the target would
       * be checking the wrong subject.
       */
      if (token.id && !user && !token.isImpersonating) {
        const result = await validateSession(
          token.id as string,
          token.sessionVersion
        );

        if (!result.valid) {
          token.revoked = true;
          token.revokedReason = result.reason;
          token.suspended = true;

          logSecurityEventAsync({
            type: "SESSION_REVOKED",
            severity: result.reason === "BANNED" ? "HIGH" : "MEDIUM",
            userId: token.id as string,
            email: token.email ?? null,
            reason: `Session rejected: ${result.reason}`,
          });

          return token;
        }

        token.revoked = undefined;
        token.revokedReason = undefined;
        token.suspended = result.state!.suspended;
        token.role = result.state!.role as Role;
        token.sessionVersion = result.state!.sessionVersion;
      }

      return token;
    },
    async session({ session, token }) {
      // A revoked token must not yield a usable session. Surfacing the flag
      // lets `requireAuth` reject server-side and lets the client detect the
      // state and sign out rather than sitting on a dead session.
      if (token.revoked) {
        session.revoked = true;
        return session;
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      // Pass impersonation flags to client session
      if (token.isImpersonating) {
        session.isImpersonating = true;
        session.impersonatorId = token.impersonatorId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
