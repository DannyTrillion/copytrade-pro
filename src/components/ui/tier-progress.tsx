"use client";

import { type TierConfig, type TierLevel } from "@/config/constants";
import { getNextTier, getTierProgress } from "@/lib/tiers";
import { TierBadge } from "./tier-badge";
import { cn } from "@/lib/utils";

const PROGRESS_COLORS: Record<string, string> = {
  zinc: "bg-zinc-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
};

interface TierProgressProps {
  tier: TierConfig;
  totalDeposited: number;
  className?: string;
}

export function TierProgress({ tier, totalDeposited, className }: TierProgressProps) {
  const nextTier = getNextTier(tier.level as TierLevel);
  const progress = getTierProgress(totalDeposited, tier.level as TierLevel);
  const barColor = PROGRESS_COLORS[tier.color] ?? PROGRESS_COLORS.zinc;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">Your Tier</span>
          <TierBadge tier={tier} size="md" />
        </div>
        {nextTier && (
          <span className="text-xs text-text-tertiary">
            ${(nextTier.minDeposit - totalDeposited).toLocaleString()} to {nextTier.name}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {nextTier ? (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", barColor)}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-text-tertiary">
            <span>${totalDeposited.toLocaleString()} deposited</span>
            <span>${nextTier.minDeposit.toLocaleString()} required</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-text-tertiary">
          You&apos;ve reached the highest tier — enjoy maximum benefits.
        </p>
      )}

      {/* Benefits */}
      <ul className="space-y-1">
        {tier.benefits.map((b) => (
          <li key={b} className="flex items-center gap-2 text-xs text-text-secondary">
            <span className={cn("w-1 h-1 rounded-full", barColor)} />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
