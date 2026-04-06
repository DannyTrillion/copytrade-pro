import { prisma } from "@/lib/prisma";
import { TIER_CONFIGS, TIERS, type TierLevel, type TierConfig } from "@/config/constants";

/**
 * Determine a user's tier based on their total confirmed deposits.
 * We sum all CONFIRMED deposit requests rather than relying on current balance
 * (which fluctuates with trades). This ensures tier is based on commitment, not PnL.
 */
export async function getUserTier(userId: string): Promise<TierConfig> {
  const totalDeposited = await getTotalDeposited(userId);
  return getTierFromAmount(totalDeposited);
}

/**
 * Pure function: resolve tier from a deposit amount (no DB call).
 */
export function getTierFromAmount(totalDeposited: number): TierConfig {
  if (totalDeposited >= TIER_CONFIGS.TIER_3.minDeposit) return TIER_CONFIGS.TIER_3;
  if (totalDeposited >= TIER_CONFIGS.TIER_2.minDeposit) return TIER_CONFIGS.TIER_2;
  return TIER_CONFIGS.TIER_1;
}

/**
 * Sum all confirmed deposits for a user.
 */
export async function getTotalDeposited(userId: string): Promise<number> {
  const result = await prisma.depositRequest.aggregate({
    where: { userId, status: "CONFIRMED" },
    _sum: { amount: true },
  });
  // Also include confirmed card payments
  const cardResult = await prisma.cardPayment.aggregate({
    where: { userId, status: "CONFIRMED" },
    _sum: { amount: true },
  });
  return (result._sum.amount ?? 0) + (cardResult._sum.amount ?? 0);
}

/**
 * Count how many copy trades a follower has received today.
 */
export async function getDailyTradeCount(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.copyResult.count({
    where: {
      userId,
      createdAt: { gte: startOfDay },
    },
  });
}

/**
 * Check whether a follower can receive another trade today based on their tier.
 * Returns { allowed, remaining, tier }.
 */
export async function canReceiveTrade(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  tier: TierConfig;
  dailyCount: number;
}> {
  const [tier, dailyCount] = await Promise.all([
    getUserTier(userId),
    getDailyTradeCount(userId),
  ]);

  if (tier.maxDailyTrades === -1) {
    return { allowed: true, remaining: -1, tier, dailyCount };
  }

  const remaining = Math.max(0, tier.maxDailyTrades - dailyCount);
  return {
    allowed: dailyCount < tier.maxDailyTrades,
    remaining,
    tier,
    dailyCount,
  };
}

/**
 * Get the next tier for a user (or null if already at max).
 */
export function getNextTier(currentTier: TierLevel): TierConfig | null {
  if (currentTier === TIERS.TIER_1) return TIER_CONFIGS.TIER_2;
  if (currentTier === TIERS.TIER_2) return TIER_CONFIGS.TIER_3;
  return null;
}

/**
 * Calculate progress toward the next tier (0–100).
 */
export function getTierProgress(totalDeposited: number, currentTier: TierLevel): number {
  const next = getNextTier(currentTier);
  if (!next) return 100; // Already at max tier

  const current = TIER_CONFIGS[currentTier];
  const range = next.minDeposit - current.minDeposit;
  const progress = totalDeposited - current.minDeposit;

  return Math.min(100, Math.max(0, (progress / range) * 100));
}
