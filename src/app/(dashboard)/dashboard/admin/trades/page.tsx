"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  Target,
  Download,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PnlChart } from "@/components/charts/pnl-chart";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { downloadCSV } from "@/lib/csv";

interface TraderTrade {
  id: string;
  tradeName: string;
  market: string;
  resultPercent: number;
  profitLoss: number;
  notes: string | null;
  tradeDate: string;
  createdAt: string;
  trader: {
    displayName: string;
    user: { name: string; email: string };
  };
  _count: { copyResults: number };
}

interface AdminStats {
  totalTraderTrades: number;
  totalCopyResults: number;
  totalTraderPnl: number;
  platformWinRate: number;
  totalTraders: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminTradesPage() {
  const [trades, setTrades] = useState<TraderTrade[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [tradesRes, statsRes] = await Promise.all([
        fetch("/api/admin?view=trades"),
        fetch("/api/admin?view=stats"),
      ]);

      if (tradesRes.ok) {
        const data = await tradesRes.json();
        setTrades(data.trades || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch trades:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build PnL chart from trades
  const pnlChartData =
    trades.length > 0
      ? trades
          .slice()
          .reverse()
          .reduce(
            (acc, t) => {
              const cumPnl = (acc.length > 0 ? acc[acc.length - 1].pnl : 0) + t.profitLoss;
              acc.push({
                date: new Date(t.tradeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                pnl: cumPnl,
              });
              return acc;
            },
            [] as { date: string; pnl: number }[]
          )
      : Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          pnl: 0,
        }));

  const handleExportCSV = () => {
    const headers = ["Trader", "Email", "Trade", "Market", "Result %", "P&L", "Copies", "Date"];
    const rows = trades.map((t) => [
      t.trader.displayName,
      t.trader.user.email,
      t.tradeName,
      t.market,
      String(t.resultPercent),
      String(t.profitLoss),
      String(t._count.copyResults),
      new Date(t.tradeDate).toLocaleDateString(),
    ]);
    downloadCSV("trades", headers, rows);
  };

  if (loading) {
    return (
      <div className="dashboard-section">
        {/* Header skeleton */}
        <div className="space-y-2 mb-6">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        {/* Stat cards skeleton */}
        <div className="stat-grid mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-panel p-4 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="glass-panel p-4 space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
        {/* Trades list skeleton */}
        <div className="glass-panel overflow-hidden">
          <div className="p-4 border-b border-border">
            <Skeleton className="h-5 w-28" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/50">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-section">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-text-primary">All Trades</h2>
          <p className="text-sm text-text-tertiary mt-0.5">Monitor all platform trading activity</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="btn-secondary btn-sm inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </motion.div>

      <div className="stat-grid">
        <StatCard
          title="Total Trader PnL"
          value={formatCurrency(stats?.totalTraderPnl ?? 0)}
          changeType={(stats?.totalTraderPnl ?? 0) >= 0 ? "positive" : "negative"}
          icon={DollarSign}
          iconColor={(stats?.totalTraderPnl ?? 0) >= 0 ? "text-success" : "text-danger"}
          delay={0}
        />
        <StatCard
          title="Total Trades"
          value={String(stats?.totalTraderTrades ?? trades.length)}
          icon={BarChart3}
          iconColor="text-brand"
          delay={0.05}
        />
        <StatCard
          title="Platform Win Rate"
          value={`${stats?.platformWinRate ?? 0}%`}
          icon={Target}
          iconColor="text-warning"
          delay={0.1}
        />
        <StatCard
          title="Total Copy Results"
          value={String(stats?.totalCopyResults ?? 0)}
          icon={Users}
          iconColor="text-info"
          delay={0.15}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-4"
      >
        <h3 className="text-sm font-medium text-text-primary mb-3">Cumulative Platform PnL</h3>
        <PnlChart data={pnlChartData} height={220} showGrid />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-panel overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-text-primary">Trade Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-1/30 sticky top-0 z-10">
                <th className="table-header px-4 py-2.5 text-left">Trader</th>
                <th className="table-header px-4 py-2.5 text-left">Trade</th>
                <th className="table-header px-4 py-2.5 text-left">Market</th>
                <th className="table-header px-4 py-2.5 text-right">Result %</th>
                <th className="table-header px-4 py-2.5 text-right">P&L</th>
                <th className="table-header px-4 py-2.5 text-right">Copies</th>
                <th className="table-header px-4 py-2.5 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {trades.length > 0 ? (
                trades.map((trade, i) => (
                  <motion.tr
                    key={trade.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.02 }}
                    className={`table-row ${i % 2 === 1 ? 'bg-surface-2/20' : ''}`}
                  >
                    <td className="table-cell">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{trade.trader.displayName}</p>
                        <p className="text-2xs text-text-tertiary">{trade.trader.user.email}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{trade.tradeName}</p>
                        {trade.notes && (
                          <p className="text-2xs text-text-tertiary truncate max-w-[180px]">{trade.notes}</p>
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
                        className={`flex items-center justify-end gap-1 text-sm font-medium ${
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
                      <span className={trade.profitLoss >= 0 ? "text-success" : "text-danger"}>
                        {trade.profitLoss >= 0 ? "+" : ""}
                        {formatCurrency(trade.profitLoss)}
                      </span>
                    </td>
                    <td className="table-cell text-right text-text-secondary">
                      {trade._count.copyResults}
                    </td>
                    <td className="table-cell text-right text-text-tertiary text-xs">
                      {timeAgo(trade.tradeDate)}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-sm text-text-tertiary">
                    No trades on the platform yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-border bg-surface-1/20">
          <p className="text-2xs text-text-tertiary">
            Showing {trades.length} trades
          </p>
        </div>
      </motion.div>
    </div>
  );
}
