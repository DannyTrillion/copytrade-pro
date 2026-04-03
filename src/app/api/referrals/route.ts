import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { z } from "zod";
import crypto from "crypto";

// ─── Constants ───

const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// ─── Validation ───

const actionSchema = z.object({
  action: z.literal("generate-code"),
});

// ─── Helpers ───

function generateReferralCode(): string {
  const bytes = crypto.randomBytes(REFERRAL_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += REFERRAL_CODE_CHARS[bytes[i] % REFERRAL_CODE_CHARS.length];
  }
  return code;
}

async function ensureReferralCode(userId: string): Promise<string> {
  // Check if user already has a code
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  if (user?.referralCode) {
    return user.referralCode;
  }

  // Generate a unique code with retry logic
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateReferralCode();

    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
      });
      return updated.referralCode!;
    } catch {
      // Unique constraint violation — retry with a new code
      continue;
    }
  }

  throw new Error("Failed to generate unique referral code");
}

// ─── GET — Return referral info for current user ───

export async function GET() {
  try {
    const user = await requireAuth();

    // Ensure the user has a referral code
    const referralCode = await ensureReferralCode(user.id);

    // Fetch referred users and reward status
    const [referrals, rewardAggregation] = await Promise.all([
      prisma.referralReward.findMany({
        where: { earnerId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          referredId: true,
          amount: true,
          status: true,
          creditedAt: true,
          createdAt: true,
        },
      }),
      prisma.referralReward.aggregate({
        where: { earnerId: user.id, status: "CREDITED" },
        _sum: { amount: true },
      }),
    ]);

    // Enrich with referred user details
    const referredUserIds = referrals.map((r) => r.referredId);
    const referredUsers = await prisma.user.findMany({
      where: { id: { in: referredUserIds } },
      select: { id: true, name: true, avatar: true, createdAt: true },
    });

    const userMap = new Map(referredUsers.map((u) => [u.id, u]));

    const enrichedReferrals = referrals.map((r) => {
      const referred = userMap.get(r.referredId);
      return {
        id: r.id,
        referredUser: referred
          ? { id: referred.id, name: referred.name, avatar: referred.avatar, joinedAt: referred.createdAt }
          : null,
        amount: r.amount,
        status: r.status,
        creditedAt: r.creditedAt,
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({
      referralCode,
      referrals: enrichedReferrals,
      totalReferrals: referrals.length,
      totalRewardsEarned: rewardAggregation._sum.amount ?? 0,
    });
  } catch {
    return unauthorizedResponse();
  }
}

// ─── POST — Generate referral code ───

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = actionSchema.parse(body);

    if (data.action === "generate-code") {
      const referralCode = await ensureReferralCode(user.id);
      return NextResponse.json({ referralCode }, { status: 201 });
    }

    return errorResponse("Invalid action");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to generate referral code");
  }
}
