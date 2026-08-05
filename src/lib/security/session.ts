/**
 * Session revocation.
 *
 * NextAuth is configured with the JWT strategy, which means sessions are
 * stateless: the cookie is self-signed and remains cryptographically valid
 * until it expires. There is no server-side session table to delete rows from,
 * so "revoke all sessions" cannot be implemented by deleting anything.
 *
 * Instead every user carries a `sessionVersion` counter. It is stamped into
 * the JWT at sign-in and re-checked on every token refresh. Bumping the
 * counter makes every previously-issued token fail that comparison at once,
 * which is what gives us immediate, global revocation.
 *
 * Where this is enforced matters:
 *
 *   - The `jwt` callback is the real security boundary. It runs server-side on
 *     every `getServerSession()` call, so all API routes and server components
 *     revalidate against the database.
 *   - Middleware only decrypts the cookie via `getToken()` and never runs the
 *     `jwt` callback, so its view can lag. It is a fast-path redirect for UX,
 *     not a boundary — never rely on it alone to protect data.
 */

import { prisma } from "@/lib/prisma";
import { CACHE_NAMESPACE, SECURITY_CACHE_TTL_MS } from "@/config/security";
import { cached, securityCache } from "./cache";

export interface UserSecurityState {
  id: string;
  role: string;
  sessionVersion: number;
  suspended: boolean;
  banned: boolean;
  deleted: boolean;
}

/** Sentinel for "this user id does not resolve to a live account". */
const MISSING_USER: UserSecurityState = {
  id: "",
  role: "",
  sessionVersion: -1,
  suspended: true,
  banned: true,
  deleted: true,
};

/**
 * Read the security-relevant state of a user, cached for a few seconds.
 *
 * This replaces the previous uncached per-request lookup in the `jwt`
 * callback, so despite adding two more columns it issues strictly fewer
 * queries under load.
 */
export async function getUserSecurityState(
  userId: string
): Promise<UserSecurityState | null> {
  const state = await cached<UserSecurityState>(
    CACHE_NAMESPACE.USER_SECURITY,
    userId,
    SECURITY_CACHE_TTL_MS,
    async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          sessionVersion: true,
          suspended: true,
          bannedAt: true,
          deletedAt: true,
        },
      });

      if (!user) return MISSING_USER;

      return {
        id: user.id,
        role: user.role,
        sessionVersion: user.sessionVersion,
        suspended: user.suspended,
        banned: user.bannedAt !== null,
        deleted: user.deletedAt !== null,
      };
    }
  );

  return state.sessionVersion === -1 ? null : state;
}

/**
 * Drop a user's cached state so the next read hits the database.
 * Must be called by every write that changes ban, suspension or role.
 */
export async function invalidateUserSecurityState(userId: string): Promise<void> {
  await securityCache.delete(CACHE_NAMESPACE.USER_SECURITY, userId);
}

/**
 * Invalidate every active session for a user.
 *
 * Accepts an optional transaction client so a ban and its revocation commit
 * atomically — a ban that commits without the revocation would leave the
 * banned user holding a working session.
 */
export async function revokeUserSessions(
  userId: string,
  client: Pick<typeof prisma, "user"> = prisma
): Promise<number> {
  const updated = await client.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });

  await invalidateUserSecurityState(userId);

  return updated.sessionVersion;
}

export type AccessDenialReason =
  | "NOT_FOUND"
  | "SESSION_REVOKED"
  | "BANNED"
  | "SUSPENDED"
  | "DELETED";

export interface SessionValidationResult {
  valid: boolean;
  reason?: AccessDenialReason;
  state?: UserSecurityState;
}

/**
 * Validate a token's user id and session version against current DB state.
 *
 * Order matters for the audit trail: a deleted account reports DELETED rather
 * than SESSION_REVOKED, even though deletion also bumps the version, so events
 * record the underlying cause instead of its side effect.
 */
export async function validateSession(
  userId: string,
  tokenSessionVersion: number | undefined
): Promise<SessionValidationResult> {
  const state = await getUserSecurityState(userId);

  if (!state) return { valid: false, reason: "NOT_FOUND" };
  if (state.deleted) return { valid: false, reason: "DELETED", state };
  if (state.banned) return { valid: false, reason: "BANNED", state };
  if (state.suspended) return { valid: false, reason: "SUSPENDED", state };

  // A token minted before this field existed has no version. Treat it as
  // valid only against version 0 so legacy sessions survive the migration
  // but are still revocable by the first bump.
  const presented = tokenSessionVersion ?? 0;
  if (presented !== state.sessionVersion) {
    return { valid: false, reason: "SESSION_REVOKED", state };
  }

  return { valid: true, state };
}
