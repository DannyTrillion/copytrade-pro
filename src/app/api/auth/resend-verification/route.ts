import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

const resendSchema = z.object({
  email: z.string().email(),
});

const COOLDOWN_MS = 60_000; // 60 seconds between resends

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = resendSchema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json(
      { message: "If an account exists with that email, a verification link has been sent." },
      { status: 200 },
    );

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        emailVerificationExpiry: true,
      },
    });

    // User not found or already verified — return success silently
    if (!user || user.emailVerified) {
      return successResponse;
    }

    // Rate limit: skip if a token was created less than 60 seconds ago
    if (user.emailVerificationExpiry) {
      const tokenCreatedAt = new Date(
        user.emailVerificationExpiry.getTime() - 24 * 60 * 60 * 1000
      );
      if (Date.now() - tokenCreatedAt.getTime() < COOLDOWN_MS) {
        return successResponse;
      }
    }

    // Generate new token
    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: token,
        emailVerificationExpiry: expiry,
      },
    });

    sendVerificationEmail(user.email, user.name, token).catch(console.error);

    return successResponse;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Validation failed" },
        { status: 400 },
      );
    }
    console.error("[resend-verification] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
