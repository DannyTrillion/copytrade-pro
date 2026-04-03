"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Trophy,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LineChart,
  Filter,
  Activity,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatGridSkeleton, TableSkeleton } from "@/components/ui/chart-skeleton";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { staggerChildren, slideUp } from "@/lib/animations";
import Link from "next/link";

const ITEMS_PER_PAGE = 15;

const MARKET_COLORS: Record<string, { bg: string; text: string }> = {
  FOREX: { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400" },
  CRYPTO: { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400" },
  INDICES: { bg: "bg-purple-500/15", text: "text-purple-600 dark:text-purple-400" },
  COMMODITIES: { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400" },
  STOCKS: { bg: "bg-cyan-500/15", text: "text-cyan-600 dark:text-cyan-400" },
};

const DEFAULT_MARKET_COLOR = { bg: "bg-surface-3", text: "text-text-secondary" };

interface CopyResult {
  id: string;
  profitLoss: number;
  resultPercent: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  traderTrade: {
    tradeName: string;
    market: string;
    tradeType: string | null;
    resultPercent: number;
    tradeDate: string;
    trader: { displayName: string };
  };
}

function getMarketColor(market: string) {
  return MARKET_COLORS[market.toUpperCase()] ?? DEFAULT_MARKET_COLOR;
}

export default function TradesPage() {
  const [results, setResults] = useState<CopyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTrader, setActiveTrader] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/stats?include=copyResults");
      if (res.ok) {
        const data = await res.json();
        setResults(data.copyResults || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Derived: unique traders ── */
  const traders = useMemo(() => {
    const names = new Set<string>();
    results.forEach((r) => names.add(r.traderTrade.trader.displayName));
    return Array.from(names).sort();
  }, [results]);

  /* ── Filtered results ── */
  const filtered = useMemo(() => {
    if (activeTrader === "all") return results;
    return results.filter(
      (r) => r.traderTrade.trader.displayName === activeTrader
    );
  }, [results, activeTrader]);

  /* ── Stats from filtered ── */
  const totalPnl = filtered.reduce((sum, r) => sum + r.profitLoss, 0);
  const wins = filtered.filter((r) => r.profitLoss > 0).length;
  const winRate = filtered.length > 0 ? (wins / filtered.length) * 100 : 0;
  const bestTrade = filtered.length > 0
    ? filtered.reduce((best, r) => (r.profitLoss > best.profitLoss ? r : best), filtered[0])
    : null;

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedResults = filtered.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTrader]);

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="space-y-2 mb-6">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-44 w-full rounded-2xl mb-6" />
        <StatGridSkeleton count={4} />
        <TableSkeleton rows={8} cols={5} />
      </div>
    );
  }

  return (
    <div className="dashboard-section">
      {/* ── Header ── */}
      <motion.div
        {...staggerChildren(0)}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
      >
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Your Trades</h2>
          <p className="text-sm text-text-tertiary mt-0.5">Copy trading results and performance</p>
        </div>
      </motion.div>

      {/* ── Hero Performance Card ── */}
      <motion.div
        {...staggerChildren(0.04)}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand-dark to-brand-700 p-5 md:p-7 text-white shadow-2xl ring-1 ring-white/[0.08]"
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-white/70 text-xs font-medium tracking-wide uppercase mb-1">Net P&L</p>
            <p className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight">
              {totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl)}
            </p>
            {filtered.length > 0 && (
              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-white/20 text-xs font-semibold">
                <Activity className="w-3 h-3" />
                {filtered.length} trades · {winRate.toFixed(0)}% win rate
              </div>
            )}
          </div>
          <div className="flex gap-4 md:gap-6">
            <div className="text-center">
              <p className="text-white/60 text-2xs font-medium uppercase tracking-wider">Wins</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{wins}</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-white/60 text-2xs font-medium uppercase tracking-wider">Losses</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{filtered.length - wins}</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-white/60 text-2xs font-medium uppercase tracking-wider">Best Trade</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">
                {bestTrade ? formatCurrency(bestTrade.profitLoss) : "--"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div className="stat-grid">
        <StatCard
          title="Total Trades"
          value={String(filtered.length)}
          icon={BarChart3}
          iconColor="text-brand"
          delay={0.08}
        />
        <StatCard
          title="Net P&L"
          value={formatCurrency(totalPnl)}
          change={totalPnl >= 0 ? "Profit" : "Loss"}
          changeType={totalPnl >= 0 ? "positive" : "negative"}
          icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
          iconColor={totalPnl >= 0 ? "text-success" : "text-danger"}
          delay={0.1}
        />
        <StatCard
          title="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          change={`${wins}W / ${filtered.length - wins}L`}
          changeType="neutral"
          icon={Target}
          iconColor="text-info"
          delay={0.12}
        />
        <StatCard
          title="Best Trade"
          value={bestTrade ? formatCurrency(bestTrade.profitLoss) : "--"}
          change={bestTrade ? bestTrade.traderTrade.tradeName : undefined}
          changeType="positive"
          icon={Trophy}
          iconColor="text-warning"
          delay={0.14}
        />
      </div>

      {/* ── Trader Filter Tabs ── */}
      {traders.length > 1 && (
        <motion.div
          {...staggerChildren(0.12)}
          className="flex items-center gap-2 flex-wrap"
        >
          <div className="p-1.5 rounded-lg bg-surface-2 mr-1">
            <Filter className="w-3.5 h-3.5 text-text-tertiary" />
          </div>
          <button
            onClick={() => setActiveTrader("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              activeTrader === "all"
                ? "bg-brand text-white shadow-sm"
                : "bg-surface-2 text-text-tertiary border border-border hover:text-text-secondary hover:border-border-light"
            }`}
          >
            All Traders
          </button>
          {traders.map((name) => (
            <button
              key={name}
              onClick={() => setActiveTrader(name)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTrader === name
                  ? "bg-brand text-white shadow-sm"
                  : "bg-surface-2 text-text-tertiary border border-border hover:text-text-secondary hover:border-border-light"
              }`}
            >
              {name}
            </button>
          ))}
        </motion.div>
      )}

      {/* ── Trades Table ── */}
      <motion.div
        {...slideUp(0.15)}
        className="glass-panel overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-brand/10">
              <BarChart3 className="w-3.5 h-3.5 text-brand" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">Trade Results</h3>
            {filtered.length > 0 && (
              <span className="text-2xs px-2 py-0.5 rounded-full bg-surface-3 text-text-tertiary font-medium">
                {filtered.length}
              </span>
            )}
          </div>
          {totalPages > 1 && (
            <span className="text-2xs text-text-tertiary tabular-nums">
              Page {safeCurrentPage}/{totalPages}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-2/50 sticky top-0 z-10">
                <th className="table-header px-4 py-2.5 text-left">Trade</th>
                <th className="table-header px-4 py-2.5 text-left">Trader</th>
                <th className="table-header px-4 py-2.5 text-center">Market</th>
                <th className="table-header px-4 py-2.5 text-right">Allocated</th>
                <th className="table-header px-4 py-2.5 text-right">Result %</th>
                <th className="table-header px-4 py-2.5 text-right">P&L</th>
                <th className="table-header px-4 py-2.5 text-right">Balance</th>
                <th className="table-header px-4 py-2.5 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {paginatedResults.length > 0 ? (
                  paginatedResults.map((r, i) => {
                    const marketColor = getMarketColor(r.traderTrade.market);
                    return (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={`table-row ${i % 2 === 1 ? 'bg-surface-2/20' : ''}`}
                      >
                        <td className="table-cell text-sm font-medium text-text-primary">
                          {r.traderTrade.tradeName}
                        </td>
                        <td className="table-cell text-xs text-text-secondary">
                          {r.traderTrade.trader.displayName}
                        </td>
                        <td className="table-cell text-center">
                          <span
                            className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${marketColor.bg} ${marketColor.text}`}
                          >
                            {r.traderTrade.market}
                          </span>
                        </td>
                        <td className="table-cell text-right text-sm text-text-secondary tabular-nums">
                          {formatCurrency(r.balanceBefore)}
                        </td>
                        <td
                          className={`table-cell text-right text-sm font-semibold tabular-nums ${
                            r.resultPercent >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {r.resultPercent >= 0 ? "+" : ""}
                          {r.resultPercent.toFixed(1)}%
                        </td>
                        <td
                          className={`table-cell text-right text-sm font-semibold tabular-nums ${
                            r.profitLoss >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {r.profitLoss >= 0 ? "+" : ""}
                          {formatCurrency(r.profitLoss)}
                        </td>
                        <td className="table-cell text-right">
                          <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary tabular-nums">
                            {formatCurrency(r.balanceBefore, 0)}
                            <ArrowRight className="w-3 h-3 text-text-quaternary shrink-0" />
                            <span
                              className={
                                r.balanceAfter >= r.balanceBefore
                                  ? "text-success font-medium"
                                  : "text-danger font-medium"
                              }
                            >
                              {formatCurrency(r.balanceAfter, 0)}
                            </span>
                          </span>
                        </td>
                        <td className="table-cell text-right text-xs text-text-tertiary whitespace-nowrap">
                          {formatDate(r.createdAt)}
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-16">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="p-5 rounded-3xl bg-gradient-to-br from-surface-2 to-surface-3 border border-border shadow-sm">
                          <LineChart className="w-10 h-10 text-text-tertiary/40" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-text-secondary">
                            No trade results yet
                          </p>
                          <p className="text-xs text-text-tertiary mt-1 max-w-[280px]">
                            Start copy trading to see your trade history
                          </p>
                        </div>
                        <Link href="/dashboard/follower" className="btn-primary btn-sm mt-4">
                          Browse Traders
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-text-tertiary tabular-nums">
              Showing {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safeCurrentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="p-2.5 md:p-1.5 rounded-lg border border-border bg-surface-1 text-text-secondary transition-all duration-200 hover:bg-surface-2 hover:text-text-primary disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (safeCurrentPage <= 3) {
                  page = i + 1;
                } else if (safeCurrentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = safeCurrentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 md:w-8 md:h-8 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-lg text-xs font-medium transition-all ${
                      page === safeCurrentPage
                        ? "bg-brand text-white shadow-sm"
                        : "text-text-tertiary hover:bg-surface-2 hover:text-text-primary"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="p-2.5 md:p-1.5 rounded-lg border border-border bg-surface-1 text-text-secondary transition-all duration-200 hover:bg-surface-2 hover:text-text-primary disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
