import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { enforceAccess } from "@/lib/security/enforcement";
import { getRequestContext } from "@/lib/security/events";
import { invalidateUserSecurityState } from "@/lib/security/session";

/* ─── Validation Schemas ─── */

const requestResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const performResetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number"),
});

/* ─── Constants ─── */

const TOKEN_BYTES = 32; // 32 bytes → 64-char hex string
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const BCRYPT_ROUNDS = 12;

/* ─── GET Handler — validate token without consuming it ─── */

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { valid: false, error: "No token provided" },
      { status: 400 },
    );
  }

  const resetRecord = await prisma.passwordReset.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
  });

  if (!resetRecord) {
    return NextResponse.json(
      { valid: false, error: "Token is invalid or expired" },
      { status: 400 },
    );
  }

  return NextResponse.json({ valid: true });
}

/* ─── POST Handler ─── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Determine which flow based on the shape of the body
    const hasToken = "token" in body && typeof body.token === "string";

    if (hasToken) {
      return handlePasswordReset(body);
    }
    return handleResetRequest(body, req);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Validation failed" },
        { status: 400 },
      );
    }
    console.error("[reset-password] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/* ─── Step 1: Request a password reset link ─── */

async function handleResetRequest(body: unknown, req: NextRequest) {
  const { email } = requestResetSchema.parse(body);
  const normalizedEmail = email.toLowerCase().trim();

  // Always return success to prevent email enumeration
  const successResponse = NextResponse.json(
    { message: "If an account exists with that email, a reset link has been sent." },
    { status: 200 },
  );

  const { allowed } = await checkRateLimit(
    `reset:${normalizedEmail}`,
    3,
    15 * 60 * 1000
  );
  if (!allowed) {
    return successResponse;
  }

  // Password reset is an account-recovery path, so it must respect the same
  // blacklists as login — otherwise a banned user could reset their way back
  // in. Denials return the same opaque success response as everything else
  // here, preserving the endpoint's non-enumerable behaviour.
  const permitted = await enforceAccess({
    surface: "PASSWORD_RESET",
    email: normalizedEmail,
    context: getRequestContext(req.headers),
  });

  if (!permitted) {
    return successResponse;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      suspended: true,
      bannedAt: true,
      deletedAt: true,
    },
  });

  if (!user || user.suspended || user.bannedAt || user.deletedAt) {
    return successResponse;
  }

  // Invalidate any existing tokens for this user
  await prisma.passwordReset.deleteMany({
    where: { userId: user.id },
  });

  // Generate a cryptographically secure token
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  sendPasswordResetEmail(user.email, user.name, token).catch(console.error);

  if (process.env.NODE_ENV === "development") {
    const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
    console.log("─────────────────────────────────────────────────");
    console.log(`[PASSWORD RESET] Email: ${user.email}`);
    console.log(`[PASSWORD RESET] Reset URL: ${resetUrl}`);
    console.log(`[PASSWORD RESET] Expires: ${expiresAt.toISOString()}`);
    console.log("─────────────────────────────────────────────────");
  }

  return successResponse;
}

/* ─── Step 2: Reset the password using a valid token ─── */

async function handlePasswordReset(body: unknown) {
  const { token, password } = performResetSchema.parse(body);

  const resetRecord = await prisma.passwordReset.findUnique({
    where: { token },
    include: {
      user: {
        select: { id: true, suspended: true, bannedAt: true, deletedAt: true },
      },
    },
  });

  if (!resetRecord) {
    return NextResponse.json(
      { error: "Invalid or expired reset token" },
      { status: 400 },
    );
  }

  if (resetRecord.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.passwordReset.delete({ where: { id: resetRecord.id } });
    return NextResponse.json(
      { error: "Reset token has expired. Please request a new one." },
      { status: 400 },
    );
  }

  // A token issued before the account was moderated must not still work.
  // The generic message avoids confirming which state applies.
  if (
    resetRecord.user.suspended ||
    resetRecord.user.bannedAt ||
    resetRecord.user.deletedAt
  ) {
    return NextResponse.json(
      { error: "Invalid or expired reset token" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Update password and delete the used token in a transaction.
  //
  // `sessionVersion` is incremented in the same statement so completing a reset
  // logs out every existing session. This matters most in the case the feature
  // exists for: if an attacker holds a live session on a compromised account,
  // changing the password alone would not evict them.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
    prisma.passwordReset.delete({
      where: { id: resetRecord.id },
    }),
    // Also clean up any other tokens for this user
    prisma.passwordReset.deleteMany({
      where: { userId: resetRecord.userId },
    }),
  ]);

  // Drop the cached session state so the bump above is visible immediately
  // rather than after the cache TTL elapses. Deliberately not
  // `revokeUserSessions` — that would increment a second time.
  await invalidateUserSecurityState(resetRecord.userId);

  return NextResponse.json(
    { message: "Password has been reset successfully." },
    { status: 200 },
  );
}
