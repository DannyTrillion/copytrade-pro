import { getUserTier } from "@/lib/tiers";
import { TIERS, type TierLevel } from "@/config/constants";

const RANK: Record<TierLevel, number> = {
  TIER_1: 0,
  TIER_2: 1,
  TIER_3: 2,
  TIER_4: 3,
};

/**
 * Server-side tier check. Returns true if the user meets the minimum tier.
 */
export async function userMeetsTier(userId: string, minTier: TierLevel): Promise<boolean> {
  const tier = await getUserTier(userId);
  return RANK[tier.level] >= RANK[minTier];
}

export { TIERS };
