import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyTOTP, verifyBackupCode } from "@/lib/totp";
import type { Role } from "@/config/constants";

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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("Invalid credentials");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        // Block suspended users from authenticating
        if (user.suspended) {
          throw new Error("Account suspended — contact support");
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
                throw new Error("Invalid 2FA code");
              }
            } else {
              throw new Error("Invalid 2FA code");
            }
          }
        }

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
        if (existingUser?.suspended) {
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Handle admin impersonation session update
      if (trigger === "update" && session) {
        if (session.impersonate) {
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
          select: { id: true, role: true, suspended: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role as Role;
          token.suspended = dbUser.suspended;
        }
      }

      // Periodically refresh suspended status from DB
      if (token.id && !user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { suspended: true, role: true },
        });
        if (dbUser) {
          token.suspended = dbUser.suspended;
          token.role = dbUser.role as Role;
        }
      }
      return token;
    },
    async session({ session, token }) {
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
