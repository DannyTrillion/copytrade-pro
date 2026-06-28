import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendOtpEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit: 5 OTP requests per 15 minutes per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateCheck = await checkRateLimit(`otp:${ip}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Block if an account already exists for this email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in instead." },
        { status: 409 }
      );
    }

    // Generate a fresh 6-digit code (cryptographically random) and persist it,
    // replacing any prior pending code for this email.
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await prisma.emailOtp.deleteMany({ where: { email: normalizedEmail } });
    await prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        code,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        verified: false,
      },
    });

    // Deliver via Resend (verified copytradesplus.com sending domain)
    const sent = await sendOtpEmail(normalizedEmail, code);
    if (!sent.success) {
      console.error("[send-otp] Resend send failed:", sent.error);
      return NextResponse.json(
        { error: "Failed to send verification code. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Verification code sent to your email.",
      expiresIn: OTP_TTL_MS / 1000,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[send-otp] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
