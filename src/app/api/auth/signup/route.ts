import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { notifyAdminNewSignup } from "@/lib/email";
import { enforceAccess } from "@/lib/security/enforcement";
import { getRequestContext } from "@/lib/security/events";
import { recordDeviceSighting } from "@/lib/security/devices";
import { parseUserAgent } from "@/lib/security/user-agent";

/**
 * Returned for every security denial. Identical to the "already registered"
 * response below by design — a distinct message would tell someone probing the
 * endpoint whether they were blocked by a rule or merely collided with an
 * existing account, which is exactly the signal a ban evader is looking for.
 */
const GENERIC_SIGNUP_DENIAL = "Unable to create an account with these details";

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
      return NextResponse.json({ error: GENERIC_SIGNUP_DENIAL }, { status: 409 });
    }

    /**
     * Layered ban-evasion check: IP and range blacklists, blacklisted email /
     * phone / device identifiers (including tombstones left behind by deleted
     * accounts), and device fingerprints previously seen on a banned account.
     *
     * Runs after OTP verification so an attacker cannot use this endpoint to
     * probe which identifiers are blacklisted without first controlling the
     * mailbox — and the response is indistinguishable from a duplicate-email
     * collision either way.
     */
    const securityContext = getRequestContext(req.headers);

    const permitted = await enforceAccess({
      surface: "SIGNUP",
      email: normalizedEmail,
      context: securityContext,
    });

    if (!permitted) {
      return NextResponse.json({ error: GENERIC_SIGNUP_DENIAL }, { status: 409 });
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

    // Bind the device fingerprint to the new account immediately, so a later
    // ban on this account can correlate back to the machine that created it.
    void recordDeviceSighting({
      userId: user.id,
      context: securityContext,
      ua: parseUserAgent(securityContext.userAgent),
    }).catch((error) =>
      console.error("[security] Signup device sighting failed:", error)
    );

    // Clean up used OTPs for this email
    await prisma.emailOtp.deleteMany({
      where: { email: normalizedEmail },
    });

    // Notify admin of new signup (non-blocking)
    notifyAdminNewSignup(data.name, normalizedEmail).catch(() => {});

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[signup] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
