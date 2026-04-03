"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Target,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Upload,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { StatGridSkeleton, TableSkeleton } from "@/components/ui/chart-skeleton";
import { slideUp } from "@/lib/animations";
import Link from "next/link";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

interface TraderTrade {
  id: string;
  tradeName: string;
  market: string;
  resultPercent: number;
  profitLoss: number;
  notes: string | null;
  screenshotUrl: string | null;
  tradeDate: string;
  createdAt: string;
  trader: { displayName: string };
  _count: { copyResults: number };
}

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */

const MARKETS = ["All", "Crypto", "Forex", "Stocks", "Polymarket", "Options", "Futures", "Other"] as const;
const PAGE_SIZE = 15;

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */

export default function TraderTradesPage() {
  const [trades, setTrades] = useState<TraderTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMarket, setActiveMarket] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /* ─── Fetch trades ─── */
  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch("/api/trader-trades?limit=100");
      if (res.ok) {
        const data = await res.json();
        setTrades(data.trades || []);
      }
    } catch (err) {
      console.error("Failed to fetch trades:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  /* ─── Derived data ─── */
  const filteredTrades = useMemo(() => {
    let result = trades;

    if (activeMarket !== "All") {
      result = result.filter((t) => t.market === activeMarket);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.tradeName.toLowerCase().includes(q));
    }

    return result;
  }, [trades, activeMarket, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / PAGE_SIZE));
  const paginatedTrades = filteredTrades.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeMarket, searchQuery]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const totalPnl = trades.reduce((sum, t) => sum + t.profitLoss, 0);
    const wins = trades.filter((t) => t.resultPercent > 0).length;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    const avgResult =
      trades.length > 0
        ? trades.reduce((sum, t) => sum + t.resultPercent, 0) / trades.length
        : 0;

    return {
      totalTrades: trades.length,
      totalPnl,
      winRate: Math.round(winRate * 10) / 10,
      avgResult: Math.round(avgResult * 100) / 100,
    };
  }, [trades]);

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <StatGridSkeleton count={4} />
        <Skeleton className="h-10 w-full rounded-lg" />
        <TableSkeleton rows={6} cols={6} />
      </div>
    );
  }

  return (
    <div className="dashboard-section">
      {/* ═══ Header ═══ */}
      <motion.div
        {...slideUp(0)}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-text-primary">
            Trade History
          </h2>
          <p className="text-2xs text-text-tertiary mt-0.5">
            View and manage all your uploaded trades
          </p>
        </div>
        <Link href="/dashboard/trader/upload" className="btn-primary text-sm gap-2">
          <Upload className="w-3.5 h-3.5" />
          Upload Trade
        </Link>
      </motion.div>

      {/* ═══ Stats Row ═══ */}
      <div className="stat-grid">
        <StatCard
          title="Total Trades"
          value={String(stats.totalTrades)}
          icon={BarChart3}
          iconColor="text-brand"
          delay={0}
        />
        <StatCard
          title="Total PnL"
          value={formatCurrency(stats.totalPnl)}
          changeType={stats.totalPnl >= 0 ? "positive" : "negative"}
          icon={DollarSign}
          iconColor={stats.totalPnl >= 0 ? "text-success" : "text-danger"}
          delay={0.05}
        />
        <StatCard
          title="Win Rate"
          value={`${stats.winRate}%`}
          icon={Target}
          iconColor="text-info"
          delay={0.1}
        />
        <StatCard
          title="Avg Result %"
          value={`${stats.avgResult >= 0 ? "+" : ""}${stats.avgResult}%`}
          changeType={stats.avgResult >= 0 ? "positive" : "negative"}
          icon={TrendingUp}
          iconColor={stats.avgResult >= 0 ? "text-success" : "text-danger"}
          delay={0.15}
        />
      </div>

      {/* ═══ Filters ═══ */}
      <motion.div
        {...slideUp(0.18)}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
      >
        {/* Market tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {MARKETS.map((market) => (
            <button
              key={market}
              onClick={() => setActiveMarket(market)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeMarket === market
                  ? "bg-brand/15 text-brand border border-brand/30"
                  : "bg-surface-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-3 border border-transparent"
              }`}
            >
              {market}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-auto sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search trades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 pr-4 py-2 text-sm w-full sm:w-64"
          />
        </div>
      </motion.div>

      {/* ═══ Table ═══ */}
      <motion.div
        {...slideUp(0.22)}
        className="glass-panel overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-1/30 sticky top-0 z-10">
                <th className="table-header px-4 py-2.5 text-left">Trade Name</th>
                <th className="table-header px-4 py-2.5 text-left">Market</th>
                <th className="table-header px-4 py-2.5 text-right">Result %</th>
                <th className="table-header px-4 py-2.5 text-right">P&L</th>
                <th className="table-header px-4 py-2.5 text-right">Copied By</th>
                <th className="table-header px-4 py-2.5 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTrades.length > 0 ? (
                paginatedTrades.map((trade, i) => (
                  <motion.tr
                    key={trade.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 + i * 0.02 }}
                    className={`table-row ${i % 2 === 1 ? "bg-surface-2/20" : ""}`}
                  >
                    <td className="table-cell">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {trade.tradeName}
                        </p>
                        {trade.notes && (
                          <p className="text-2xs text-text-tertiary truncate max-w-[200px]">
                            {trade.notes}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="px-2 py-0.5 rounded-full bg-surface-3 text-xs text-text-secondary">
                        {trade.market}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <span
                        className={`flex items-center justify-end gap-1 text-sm font-medium tabular-nums ${
                          trade.resultPercent >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {trade.resultPercent >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {trade.resultPercent >= 0 ? "+" : ""}
                        {trade.resultPercent}%
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          trade.profitLoss >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {trade.profitLoss >= 0 ? "+" : ""}
                        {formatCurrency(trade.profitLoss)}
                      </span>
                    </td>
                    <td className="table-cell text-right text-text-secondary text-sm tabular-nums">
                      {trade._count?.copyResults ?? 0}
                    </td>
                    <td className="table-cell text-right text-text-tertiary text-xs tabular-nums">
                      {new Date(trade.tradeDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-warning/10 to-warning/5 flex items-center justify-center mx-auto border border-warning/10">
                        <BarChart3 className="w-6 h-6 text-text-tertiary/40" />
                      </div>
                      <p className="text-sm font-medium text-text-secondary mt-1">
                        {trades.length === 0
                          ? "No trades uploaded yet"
                          : "No trades match your filters"}
                      </p>
                      <p className="text-2xs text-text-tertiary">
                        {trades.length === 0
                          ? "Upload your first trade to get started."
                          : "Try adjusting your search or market filter."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination ─── */}
        {filteredTrades.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-text-tertiary">
              Showing{" "}
              <span className="text-text-secondary font-medium tabular-nums">
                {(currentPage - 1) * PAGE_SIZE + 1}
              </span>
              {" - "}
              <span className="text-text-secondary font-medium tabular-nums">
                {Math.min(currentPage * PAGE_SIZE, filteredTrades.length)}
              </span>{" "}
              of{" "}
              <span className="text-text-secondary font-medium tabular-nums">
                {filteredTrades.length}
              </span>{" "}
              trades
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .map((page, idx, arr) => {
                  const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                  return (
                    <span key={page} className="flex items-center">
                      {showEllipsis && (
                        <span className="px-1 text-xs text-text-tertiary">
                          ...
                        </span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200 ${
                          currentPage === page
                            ? "bg-brand/15 text-brand border border-brand/30"
                            : "text-text-tertiary hover:text-text-secondary hover:bg-surface-3"
                        }`}
                      >
                        {page}
                      </button>
                    </span>
                  );
                })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
