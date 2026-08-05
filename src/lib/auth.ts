import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";
import type { Role } from "@/config/constants";

export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * The authoritative auth boundary for API routes and server components.
 *
 * `getSession()` runs the `jwt` callback, which revalidates the token's
 * session version against the database — so a banned or force-logged-out user
 * is rejected here even though their cookie is still cryptographically valid.
 * Middleware cannot do this (it only decrypts the cookie), which is why every
 * protected route must call this rather than trusting the middleware redirect.
 */
export async function requireAuth() {
  const session = await getSession();

  if (session?.revoked || !session?.user) {
    throw new Error("Unauthorized");
  }

  return session.user;
}

export async function requireRole(requiredRole: Role) {
  const user = await requireAuth();
  if (user.role !== requiredRole && user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return user;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
