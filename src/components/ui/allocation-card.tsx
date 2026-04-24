"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, TrendingUp, Users, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AllocationSummary {
  totalDeposits: number;
  allocationPercent: number;
  allocatedAmount: number;
  unallocatedDeposits: number;
  totalBalance: number;
  availableBalance: number;
  totalProfit: number;
  activeTraderCount: number;
  traders: Array<{
    traderId: string;
    traderName: string;
    allocationPercent: number;
    allocatedAmount: number;
  }>;
}

interface Props {
  refreshKey?: number; // bump to force re-fetch
  className?: string;
}

export function AllocationCard({ refreshKey = 0, className = "" }: Props) {
  const [data, setData] = useState<AllocationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/allocation")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setData(d);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading && !data) {
    return (
      <div className={`glass-panel p-5 rounded-2xl min-h-[200px] ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 bg-surface-3 rounded" />
          <div className="h-8 w-40 bg-surface-3 rounded" />
          <div className="h-2 w-full bg-surface-3 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasAllocation = data.allocationPercent > 0 && data.totalDeposits > 0;
  const topTrader =
    data.traders.length > 0
      ? [...data.traders].sort((a, b) => b.allocationPercent - a.allocationPercent)[0]
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden glass-panel p-5 rounded-2xl ${className}`}
    >
      {/* Decorative gradient */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-brand/10 blur-3xl pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <p className="text-2xs uppercase tracking-wider text-text-tertiary font-medium">
                Allocation
              </p>
              <p className="text-xs text-text-secondary">Based on total deposits</p>
            </div>
          </div>
          <div className="px-2 py-1 rounded-full bg-brand/10 text-brand text-2xs font-semibold tabular-nums">
            {data.allocationPercent.toFixed(0)}%
          </div>
        </div>

        {/* Main value */}
        <AnimatePresence mode="wait">
          <motion.div
            key={data.allocatedAmount.toFixed(2)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="text-2xl font-bold text-text-primary tabular-nums">
              {formatCurrency(data.allocatedAmount)}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              {hasAllocation ? (
                <>
                  <span className="font-semibold text-text-secondary">
                    {data.allocationPercent.toFixed(0)}%
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-text-secondary">
                    {formatCurrency(data.totalDeposits)}
                  </span>{" "}
                  total deposits
                </>
              ) : data.totalDeposits === 0 ? (
                "Make a deposit to start allocating"
              ) : (
                "No active allocation yet"
              )}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Allocation bar */}
        <div className="mt-4">
          <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-brand to-brand-light rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${data.allocationPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-2xs text-text-tertiary">
            <span>Allocated</span>
            <span>
              Unallocated:{" "}
              <span className="font-semibold text-text-secondary tabular-nums">
                {formatCurrency(data.unallocatedDeposits)}
              </span>
            </span>
          </div>
        </div>

        {/* Context row */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xs text-text-tertiary flex items-center gap-1">
              <Users className="w-3 h-3" /> Active traders
            </p>
            <p className="text-sm font-semibold text-text-primary mt-0.5 tabular-nums">
              {data.activeTraderCount}
            </p>
            {topTrader && data.activeTraderCount === 1 && (
              <p className="text-2xs text-text-tertiary truncate mt-0.5">
                {topTrader.traderName}
              </p>
            )}
          </div>
          <div>
            <p className="text-2xs text-text-tertiary flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Cumulative P&amp;L
            </p>
            <p
              className={`text-sm font-semibold mt-0.5 tabular-nums ${
                data.totalProfit > 0
                  ? "text-success"
                  : data.totalProfit < 0
                  ? "text-danger"
                  : "text-text-primary"
              }`}
            >
              {data.totalProfit > 0 ? "+" : ""}
              {formatCurrency(data.totalProfit)}
            </p>
          </div>
        </div>

        {/* Transparency note */}
        <div className="mt-3 flex items-start gap-1.5 text-2xs text-text-tertiary leading-relaxed">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            Each trade uses {data.allocationPercent.toFixed(0)}% of your deposits as base —
            profits don&apos;t compound the allocation.
          </span>
        </div>
      </div>
    </motion.div>
  );
}
