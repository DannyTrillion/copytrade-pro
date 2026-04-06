import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";
import { getUserTier, getTotalDeposited, getDailyTradeCount, getNextTier, getTierProgress } from "@/lib/tiers";

/**
 * GET /api/user/tier — Returns the current user's tier info, progress, and daily trade usage.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const [tier, totalDeposited, dailyTradeCount] = await Promise.all([
      getUserTier(user.id),
      getTotalDeposited(user.id),
      getDailyTradeCount(user.id),
    ]);

    const nextTier = getNextTier(tier.level);
    const progress = getTierProgress(totalDeposited, tier.level);

    return NextResponse.json({
      tier: {
        level: tier.level,
        name: tier.name,
        label: tier.label,
        color: tier.color,
        maxDailyTrades: tier.maxDailyTrades,
        commissionRate: tier.commissionRate,
        benefits: tier.benefits,
      },
      totalDeposited,
      dailyTradeCount,
      dailyTradesRemaining: tier.maxDailyTrades === -1
        ? -1
        : Math.max(0, tier.maxDailyTrades - dailyTradeCount),
      nextTier: nextTier
        ? {
            name: nextTier.name,
            minDeposit: nextTier.minDeposit,
            amountNeeded: Math.max(0, nextTier.minDeposit - totalDeposited),
          }
        : null,
      progress,
    });
  } catch {
    return unauthorizedResponse();
  }
}
