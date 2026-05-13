"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Lock, ArrowUpRight, Loader2 } from "lucide-react";
import { TIER_CONFIGS, TIERS, type TierLevel } from "@/config/constants";
import { formatCurrency } from "@/lib/utils";

interface UserTier {
  tier: { level: TierLevel; name: string };
  totalDeposited: number;
}

const TIER_RANK: Record<TierLevel, number> = {
  TIER_1: 0,
  TIER_2: 1,
  TIER_3: 2,
  TIER_4: 3,
};

interface TierGateProps {
  required: TierLevel;
  children: ReactNode;
  featureName: string;
  description?: string;
}

/**
 * Client-side tier gate. Renders children only if the current user is at or
 * above the required tier; otherwise shows a polished upgrade screen.
 */
export function TierGate({ required, children, featureName, description }: TierGateProps) {
  const [data, setData] = useState<UserTier | null>(null);
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
      <div className="dashboard-section flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    );
  }

  const userRank = data ? TIER_RANK[data.tier.level] : 0;
  const requiredRank = TIER_RANK[required];
  const requiredTier = TIER_CONFIGS[required];

  if (userRank >= requiredRank) return <>{children}</>;

  const shortfall = Math.max(0, requiredTier.minDeposit - (data?.totalDeposited ?? 0));

  return (
    <div className="dashboard-section">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden glass-panel p-10 md:p-14 rounded-2xl ring-1 ring-violet-400/30 max-w-2xl mx-auto"
      >
        {/* Gradient sheen */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />

        <div className="relative text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/15 ring-1 ring-violet-400/30 mb-5">
            <Sparkles className="w-7 h-7 text-violet-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-2xs font-semibold mb-3">
            <Lock className="w-3 h-3" />
            {requiredTier.name} exclusive
          </div>

          <h1 className="text-xl md:text-2xl font-bold text-text-primary">
            {featureName} is a {requiredTier.name} perk
          </h1>

          {description && (
            <p className="text-sm text-text-tertiary mt-2 max-w-md mx-auto leading-relaxed">
              {description}
            </p>
          )}

          <div className="mt-6 inline-flex items-baseline gap-1.5 px-4 py-2 rounded-xl bg-surface-1 border border-border">
            <span className="text-2xs text-text-tertiary">Deposit</span>
            <span className="text-base font-bold text-text-primary tabular-nums">
              {formatCurrency(shortfall)}
            </span>
            <span className="text-2xs text-text-tertiary">more to unlock</span>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
            <Link
              href="/dashboard/deposit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-colors"
            >
              Deposit now
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/dashboard/tiers"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-primary text-sm font-medium transition-colors border border-border"
            >
              View all tiers
            </Link>
          </div>

          <p className="mt-5 text-2xs text-text-tertiary">
            You&apos;re currently{" "}
            <span className="font-semibold text-text-secondary">
              {data?.tier.name ?? "Starter"}
            </span>
            . Reach {requiredTier.name} at{" "}
            <span className="font-semibold text-text-secondary">
              {formatCurrency(requiredTier.minDeposit)}
            </span>{" "}
            in total deposits.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// Re-export for convenience
export { TIERS };
