"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  Check,
  Sparkles,
  ArrowUpRight,
  Loader2,
  Zap,
  TrendingUp,
} from "lucide-react";
import { TIER_CONFIGS, TIERS, type TierConfig, type TierLevel } from "@/config/constants";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface UserTierResponse {
  tier: {
    level: TierLevel;
    name: string;
    label: string;
    color: string;
    maxDailyTrades: number;
    commissionRate: number;
    benefits: string[];
  };
  totalDeposited: number;
  dailyTradeCount: number;
  dailyTradesRemaining: number;
  nextTier: {
    name: string;
    minDeposit: number;
    amountNeeded: number;
  } | null;
  progress: number;
}

const TIER_ORDER: TierLevel[] = [TIERS.TIER_1, TIERS.TIER_2, TIERS.TIER_3];

const ACCENTS: Record<TierLevel, {
  ring: string;
  bg: string;
  text: string;
  glow: string;
  icon: string;
  gradient: string;
}> = {
  TIER_1: {
    ring: "ring-zinc-500/40",
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    glow: "shadow-zinc-500/10",
    icon: "text-zinc-300",
    gradient: "from-zinc-500/0 via-zinc-500/5 to-zinc-500/10",
  },
  TIER_2: {
    ring: "ring-brand/50",
    bg: "bg-brand/10",
    text: "text-brand",
    glow: "shadow-brand/20",
    icon: "text-brand",
    gradient: "from-brand/0 via-brand/5 to-brand/15",
  },
  TIER_3: {
    ring: "ring-amber-400/50",
    bg: "bg-amber-400/10",
    text: "text-amber-400",
    glow: "shadow-amber-400/20",
    icon: "text-amber-400",
    gradient: "from-amber-400/0 via-amber-400/5 to-amber-400/15",
  },
};

export default function TiersPage() {
  const [data, setData] = useState<UserTierResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/tier")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  const currentLevel = data?.tier.level;
  const totalDeposited = data?.totalDeposited ?? 0;

  return (
    <div className="dashboard-section space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h1 className="text-lg font-semibold text-text-primary">Tier Levels</h1>
        </div>
        <p className="text-sm text-text-tertiary">
          Unlock higher daily limits and lower commissions as you deposit more.
        </p>
      </motion.div>

      {/* Current tier summary */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "relative overflow-hidden glass-panel p-5 rounded-2xl ring-1",
            ACCENTS[data.tier.level].ring
          )}
        >
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-br pointer-events-none opacity-50",
              ACCENTS[data.tier.level].gradient
            )}
          />
          <div className="relative flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center",
                  ACCENTS[data.tier.level].bg
                )}
              >
                <Sparkles className={cn("w-5 h-5", ACCENTS[data.tier.level].icon)} />
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wider text-text-tertiary font-medium">
                  Your current tier
                </p>
                <p className="text-lg font-semibold text-text-primary">
                  {data.tier.name}{" "}
                  <span className="text-xs font-normal text-text-tertiary">
                    ({data.tier.label})
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 md:gap-6 text-right">
              <div>
                <p className="text-2xs uppercase tracking-wider text-text-tertiary">Deposited</p>
                <p className="text-sm font-semibold text-text-primary tabular-nums mt-0.5">
                  {formatCurrency(totalDeposited)}
                </p>
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wider text-text-tertiary">Commission</p>
                <p className="text-sm font-semibold text-text-primary tabular-nums mt-0.5">
                  {(data.tier.commissionRate * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wider text-text-tertiary">Trades left</p>
                <p className="text-sm font-semibold text-text-primary tabular-nums mt-0.5">
                  {data.tier.maxDailyTrades === -1
                    ? "∞"
                    : data.dailyTradesRemaining + " / " + data.tier.maxDailyTrades}
                </p>
              </div>
            </div>
          </div>

          {/* Progress to next tier */}
          {data.nextTier && (
            <div className="relative mt-5 pt-5 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-secondary">
                  Deposit{" "}
                  <span className="font-semibold text-text-primary">
                    {formatCurrency(data.nextTier.amountNeeded)}
                  </span>{" "}
                  more to reach{" "}
                  <span className={cn("font-semibold", ACCENTS[data.tier.level].text)}>
                    {data.nextTier.name}
                  </span>
                </p>
                <span className="text-xs font-semibold text-text-primary tabular-nums">
                  {data.progress.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand to-brand-light rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${data.progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Tier grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIER_ORDER.map((level, i) => {
          const tier: TierConfig = TIER_CONFIGS[level];
          const isCurrent = currentLevel === level;
          const isLocked =
            currentLevel === TIERS.TIER_1 && level === TIERS.TIER_3
              ? true
              : currentLevel === TIERS.TIER_2 && level === TIERS.TIER_3
              ? false
              : false;
          const isPast =
            (currentLevel === TIERS.TIER_2 && level === TIERS.TIER_1) ||
            (currentLevel === TIERS.TIER_3 && (level === TIERS.TIER_1 || level === TIERS.TIER_2));
          const amountNeeded = Math.max(0, tier.minDeposit - totalDeposited);

          return (
            <motion.div
              key={level}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className={cn(
                "relative overflow-hidden glass-panel p-5 rounded-2xl transition-all",
                isCurrent
                  ? cn(
                      "ring-2 shadow-lg scale-[1.01]",
                      ACCENTS[level].ring,
                      ACCENTS[level].glow
                    )
                  : "ring-1 ring-border hover:ring-border/60"
              )}
            >
              {/* Gradient sheen */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br pointer-events-none",
                  ACCENTS[level].gradient,
                  !isCurrent && "opacity-40"
                )}
              />

              <div className="relative">
                {/* Badges */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={cn(
                      "px-2 py-0.5 rounded-full text-2xs font-semibold",
                      ACCENTS[level].bg,
                      ACCENTS[level].text
                    )}
                  >
                    {tier.label}
                  </div>
                  {isCurrent && (
                    <div className="px-2 py-0.5 rounded-full bg-success/10 text-success text-2xs font-semibold flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" /> Current
                    </div>
                  )}
                  {isPast && !isCurrent && (
                    <div className="px-2 py-0.5 rounded-full bg-surface-3 text-text-tertiary text-2xs font-semibold">
                      Unlocked
                    </div>
                  )}
                </div>

                {/* Name */}
                <h3 className="text-xl font-bold text-text-primary">{tier.name}</h3>
                <div className="mt-1 mb-5">
                  {tier.minDeposit > 0 ? (
                    <p className="text-xs text-text-tertiary">
                      From{" "}
                      <span className="font-semibold text-text-secondary tabular-nums">
                        {formatCurrency(tier.minDeposit)}
                      </span>{" "}
                      deposited
                    </p>
                  ) : (
                    <p className="text-xs text-text-tertiary">Default for all members</p>
                  )}
                </div>

                {/* Key perks */}
                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Zap className={cn("w-3.5 h-3.5 shrink-0", ACCENTS[level].icon)} />
                    <span>
                      <span className="font-semibold text-text-primary">
                        {tier.maxDailyTrades === -1 ? "Unlimited" : tier.maxDailyTrades}
                      </span>{" "}
                      copy trades / day
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <TrendingUp className={cn("w-3.5 h-3.5 shrink-0", ACCENTS[level].icon)} />
                    <span>
                      <span className="font-semibold text-text-primary">
                        {(tier.commissionRate * 100).toFixed(0)}%
                      </span>{" "}
                      platform commission
                    </span>
                  </div>
                </div>

                {/* Benefits list */}
                <ul className="space-y-1.5 mb-5">
                  {tier.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-text-tertiary">
                      <Check
                        className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", ACCENTS[level].icon)}
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className="w-full py-2 rounded-xl bg-surface-2 text-center text-xs font-medium text-text-tertiary">
                    You&apos;re here
                  </div>
                ) : isPast ? (
                  <div className="w-full py-2 rounded-xl bg-surface-2 text-center text-xs font-medium text-text-tertiary">
                    Already unlocked
                  </div>
                ) : (
                  <Link
                    href="/dashboard/deposit"
                    className={cn(
                      "w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors",
                      ACCENTS[level].bg,
                      ACCENTS[level].text,
                      "hover:brightness-125"
                    )}
                  >
                    {amountNeeded > 0
                      ? `Deposit ${formatCurrency(amountNeeded)} to unlock`
                      : "Upgrade now"}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-2xs text-text-tertiary text-center pt-2"
      >
        Tier is calculated from confirmed deposits only — profits and withdrawals don&apos;t
        affect your level.
      </motion.p>
    </div>
  );
}
