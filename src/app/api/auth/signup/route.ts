import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(128),
  role: z.literal("FOLLOWER").default("FOLLOWER"),
  referralCode: z.string().max(8).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP: 5 signups per 15 minutes
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const { allowed } = await checkRateLimit(
      `signup:${ip}`,
      5,
      15 * 60 * 1000
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Also check for ref query param as an alternative source
    const { searchParams } = new URL(req.url);
    const refParam = searchParams.get("ref");

    const data = signupSchema.parse(body);
    const normalizedEmail = data.email.toLowerCase().trim();
    const referralCode = data.referralCode || refParam || null;

    // Verify that email has been OTP-verified
    const verifiedOtp = await prisma.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        verified: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verifiedOtp) {
      return NextResponse.json(
        { error: "Email not verified. Please complete email verification first." },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Resolve referrer if a referral code was provided
    let referrerId: string | null = null;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode },
        select: { id: true },
      });
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: data.name,
        passwordHash,
        role: "FOLLOWER",
        emailVerified: true, // Email was verified via OTP
        ...(referrerId && { referredBy: referrerId }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // Create referral reward entry if the user was referred
    if (referrerId) {
      await prisma.referralReward.create({
        data: {
          earnerId: referrerId,
          referredId: user.id,
          amount: 0,
          status: "PENDING",
        },
      });
    }

    // Clean up used OTPs for this email
    await prisma.emailOtp.deleteMany({
      where: { email: normalizedEmail },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[signup] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
