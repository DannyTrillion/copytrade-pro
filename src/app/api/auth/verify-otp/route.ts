import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code must be 6 digits"),
});

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = schema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit verification attempts per IP (anti brute-force on a 6-digit code)
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateCheck = await checkRateLimit(`otp-verify:${ip}`, 10, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    // Most recent pending code for this email
    const otp = await prisma.emailOtp.findFirst({
      where: { email: normalizedEmail, verified: false },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    if (otp.expiresAt < new Date()) {
      await prisma.emailOtp.deleteMany({ where: { email: normalizedEmail } });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      await prisma.emailOtp.deleteMany({ where: { email: normalizedEmail } });
      return NextResponse.json(
        { error: "Too many incorrect attempts. Please request a new code." },
        { status: 400 }
      );
    }

    if (otp.code !== code) {
      await prisma.emailOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json(
        { error: "Invalid verification code. Please try again." },
        { status: 400 }
      );
    }

    // Correct code — mark verified so the signup route can complete registration.
    await prisma.emailOtp.update({
      where: { id: otp.id },
      data: {
        verified: true,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min window to finish signup
      },
    });

    return NextResponse.json({ verified: true, email: normalizedEmail });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[verify-otp] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
