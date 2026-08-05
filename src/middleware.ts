import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/c/landing") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/webhook") ||
    pathname.startsWith("/api/auth/verify-email") ||
    pathname.startsWith("/api/auth/resend-verification") ||
    pathname.startsWith("/api/deposits/webhook") ||
    pathname.startsWith("/api/traders/leaderboard") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/reset-password" ||
    pathname === "/forbidden" ||
    pathname === "/terms" ||
    pathname === "/privacy"
  ) {
    return NextResponse.next();
  }

  /**
   * NOTE ON TRUST: `getToken` only decrypts the session cookie — it does not
   * run NextAuth's `jwt` callback, so it cannot see database state and its
   * view of `suspended`/`revoked` is as stale as the last token refresh.
   *
   * Everything below is therefore a UX fast path, not a security boundary.
   * The real enforcement is `requireAuth()` (see lib/auth.ts), which
   * revalidates against the DB on every request. Never add a check here and
   * assume it protects data.
   */
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Revoked or suspended — bounce to login and clear the dead cookie so the
  // client stops replaying a session the server will keep rejecting.
  if (
    (token?.revoked === true || token?.suspended === true) &&
    pathname.startsWith("/dashboard")
  ) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "error",
      token?.revoked === true ? "session_revoked" : "suspended"
    );

    const response = NextResponse.redirect(loginUrl);

    // Cookie name is prefixed with __Secure- when NextAuth issues it over
    // HTTPS, so clear both spellings rather than guessing the environment.
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");

    return response;
  }

  // Redirect unauthenticated users to login
  if (!token && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (token && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Admin route protection
  if (pathname.startsWith("/dashboard/admin") && token?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/forbidden", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
