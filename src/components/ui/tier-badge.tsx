"use client";

import { type TierConfig } from "@/config/constants";
import { cn } from "@/lib/utils";

const TIER_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  zinc: {
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    ring: "ring-zinc-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    ring: "ring-blue-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    ring: "ring-amber-500/20",
  },
};

interface TierBadgeProps {
  tier: TierConfig;
  size?: "sm" | "md";
  className?: string;
}

export function TierBadge({ tier, size = "sm", className }: TierBadgeProps) {
  const style = TIER_STYLES[tier.color] ?? TIER_STYLES.zinc;

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium ring-1 ring-inset rounded-full",
        style.bg,
        style.text,
        style.ring,
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        className
      )}
    >
      {tier.name}
    </span>
  );
}
