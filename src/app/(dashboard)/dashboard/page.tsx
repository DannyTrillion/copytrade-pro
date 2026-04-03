"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  DollarSign,
  PiggyBank,
  ArrowRightLeft,
  Target,
  Upload,
  Copy,
  Activity,
  Wallet,
  PieChart,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityFeed } from "@/components/ui/activity-feed";
import { AnimatedCurrency } from "@/components/ui/animated-counter";
import { PnlChart } from "@/components/charts/pnl-chart";
import { MiniChart } from "@/components/charts/mini-chart";
import { PortfolioDonut } from "@/components/charts/portfolio-donut";
import { BalanceOverTimeChart, TradePerformanceChart, PnlBarChart } from "@/components/charts/trading-charts";
import { LiveMarketSection } from "@/components/charts/live-market-section";
import { formatCurrency } from "@/lib/utils";
import { StatGridSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/chart-skeleton";
import Link from "next/link";

interface FollowerStats {
  totalBalance: number;
  availableBalance: number;
  allocatedBalance: number;
  totalProfit: number;
  totalCopyPnl: number;
  winRate: number;
  totalCopiedTrades: number;
  following: number;
}

interface TraderStats {
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  activeFollowers: number;
}

interface BalanceTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

interface TraderTrade {
  id: string;
  tradeName: string;
  market: string;
  resultPercent: number;
  profitLoss: number;
  tradeDate: string;
  _count?: { copyResults: number };
}

interface TraderItem {
  name: string;
  pnl: number;
  winRate: number;
  followers: number;
}

const EASE = [0.16, 1, 0.3, 1] as const;

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function txTypeLabel(type: string): string {
  const map: Record<string, string> = {
    DEPOSIT: "Deposit",
    WITHDRAWAL: "Withdrawal",
    COPY_PROFIT: "Copy Profit",
    COPY_LOSS: "Copy Loss",
    ALLOCATION: "Allocated",
    DEALLOCATION: "Deallocated",
  };
  return map[type] || type;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const [followerStats, setFollowerStats] = useState<FollowerStats | null>(null);
  const [traderStats, setTraderStats] = useState<TraderStats | null>(null);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [traderTrades, setTraderTrades] = useState<TraderTrade[]>([]);
  const [traders, setTraders] = useState<TraderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const fetches: Promise<Response>[] = [fetch("/api/stats")];

      if (role === "FOLLOWER") {
        fetches.push(fetch("/api/balance"), fetch("/api/traders"));
      } else if (role === "MASTER_TRADER") {
        fetches.push(fetch("/api/trader-trades?limit=5"));
      }

      const responses = await Promise.all(fetches);

      if (responses[0].ok) {
        const data = await responses[0].json();
        if (role === "FOLLOWER") setFollowerStats(data.stats);
        else if (role === "MASTER_TRADER") setTraderStats(data.stats);
      }

      if (role === "FOLLOWER") {
        if (responses[1]?.ok) {
          const data = await responses[1].json();
          setTransactions(data.transactions || []);
        }
        if (responses[2]?.ok) {
          const data = await responses[2].json();
          setTraders(
            (data.traders || []).slice(0, 4).map((t: TraderItem) => ({
              name: t.name,
              pnl: t.pnl,
              winRate: t.winRate,
              followers: t.followers,
            }))
          );
        }
      } else if (role === "MASTER_TRADER") {
        if (responses[1]?.ok) {
          const data = await responses[1].json();
          setTraderTrades(data.trades || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (role) fetchData();
    if (!role) return;
    const interval = setInterval(() => {
      if (!document.hidden) fetchData();
    }, 30000);
    const handleVisibility = () => {
      if (!document.hidden && role) fetchData();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [role, fetchData]);

  // Chart data
  const pnlChartData = (() => {
    if (role === "FOLLOWER") {
      const copyTxs = transactions.filter(
        (t) => t.type === "COPY_PROFIT" || t.type === "COPY_LOSS"
      );
      if (copyTxs.length > 0) {
        return copyTxs.reverse().reduce(
          (acc, t) => {
            const cumPnl =
              (acc.length > 0 ? acc[acc.length - 1].pnl : 0) + t.amount;
            acc.push({
              date: new Date(t.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              pnl: cumPnl,
            });
            return acc;
          },
          [] as { date: string; pnl: number }[]
        );
      }
    }
    if (role === "MASTER_TRADER" && traderTrades.length > 0) {
      return traderTrades
        .slice()
        .reverse()
        .reduce(
          (acc, t) => {
            const cumPnl =
              (acc.length > 0 ? acc[acc.length - 1].pnl : 0) + t.profitLoss;
            acc.push({
              date: new Date(t.tradeDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              pnl: cumPnl,
            });
            return acc;
          },
          [] as { date: string; pnl: number }[]
        );
    }
    return Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric" }
      ),
      pnl: 0,
    }));
  })();

  const balanceChartData = (() => {
    if (role !== "FOLLOWER" || transactions.length === 0) return [];
    const sorted = [...transactions].reverse();
    return sorted.map((t) => ({
      date: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      balance: t.balanceAfter ?? 0,
    }));
  })();

  const tradePerformanceData = (() => {
    if (role !== "MASTER_TRADER" || traderTrades.length === 0) return [];
    const byDate = new Map<string, { profit: number; loss: number; cumulative: number }>();
    let cum = 0;
    [...traderTrades].reverse().forEach((t) => {
      const dateKey = new Date(t.tradeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const entry = byDate.get(dateKey) || { profit: 0, loss: 0, cumulative: 0 };
      if (t.profitLoss >= 0) entry.profit += t.profitLoss;
      else entry.loss += t.profitLoss;
      cum += t.profitLoss;
      entry.cumulative = cum;
      byDate.set(dateKey, entry);
    });
    return Array.from(byDate.entries()).map(([date, vals]) => ({ date, ...vals }));
  })();

  const pnlBarData = (() => {
    if (role !== "FOLLOWER") return [];
    const copyTxs = transactions.filter((t) => t.type === "COPY_PROFIT" || t.type === "COPY_LOSS");
    if (copyTxs.length === 0) return [];
    const byDate = new Map<string, number>();
    copyTxs.forEach((t) => {
      const dateKey = new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      byDate.set(dateKey, (byDate.get(dateKey) || 0) + t.amount);
    });
    return Array.from(byDate.entries()).map(([date, pnl]) => ({ date, pnl }));
  })();

  // Portfolio donut data
  const donutSegments = (() => {
    if (role === "FOLLOWER" && followerStats) {
      const segs = [];
      if (followerStats.availableBalance > 0)
        segs.push({ label: "Available", value: followerStats.availableBalance, color: "#26A69A" });
      if (followerStats.allocatedBalance > 0)
        segs.push({ label: "Allocated", value: followerStats.allocatedBalance, color: "#2962FF" });
      if (followerStats.totalProfit > 0)
        segs.push({ label: "Profit", value: followerStats.totalProfit, color: "#AB47BC" });
      return segs;
    }
    return [];
  })();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-56 bg-surface-2 rounded-lg animate-shimmer bg-shimmer bg-[length:200%_100%]" />
            <div className="h-4 w-40 bg-surface-2 rounded animate-shimmer bg-shimmer bg-[length:200%_100%]" />
          </div>
          <div className="h-10 w-36 bg-surface-2 rounded-lg animate-shimmer bg-shimmer bg-[length:200%_100%]" />
        </div>
        <StatGridSkeleton count={4} />
        <ChartSkeleton height={320} />
        <TableSkeleton rows={5} cols={4} />
      </div>
    );
  }

  const totalPnl =
    role === "FOLLOWER"
      ? (followerStats?.totalProfit ?? 0)
      : (traderStats?.totalPnl ?? 0);
  const dashboardLink =
    role === "MASTER_TRADER" ? "/dashboard/trader" : "/dashboard/follower";
  const firstName = session?.user?.name?.split(" ")[0] || "Trader";

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-5 md:space-y-6"
    >
      {/* ═══ Header with greeting & live clock ═══ */}
      <motion.div variants={staggerItem}>
        <DashboardHeader firstName={firstName}>
          {role === "FOLLOWER" && (
            <Link href="/dashboard/deposit" className="btn-secondary text-sm gap-2">
              <Wallet className="w-3.5 h-3.5" />
              Deposit
            </Link>
          )}
          <Link href={dashboardLink} className="btn-primary text-sm gap-2">
            {role === "MASTER_TRADER" ? (
              <>
                <Upload className="w-3.5 h-3.5" />
                Trader Hub
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Copy Trading
              </>
            )}
          </Link>
        </DashboardHeader>
      </motion.div>

      {/* ═══ Hero Balance Card + Stats ═══ */}
      {role === "FOLLOWER" && (
        <motion.div variants={staggerItem} className="space-y-4">
          {/* Hero card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand-dark to-brand-700 p-6 md:p-8 text-white shadow-lg">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNMCA0MEw0MCAwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiLz48L3N2Zz4=')] opacity-40" />
            <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Total Balance</p>
                <AnimatedCurrency
                  value={followerStats?.totalBalance ?? 0}
                  className="text-3xl md:text-4xl font-bold tracking-tight"
                />
                <div className="flex items-center gap-3 mt-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    totalPnl >= 0 ? "bg-white/20 text-white" : "bg-red-500/30 text-red-100"
                  }`}>
                    {totalPnl >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {formatCurrency(Math.abs(totalPnl))} profit
                  </span>
                  <span className="text-white/40 text-xs">
                    {followerStats?.following ?? 0} traders followed
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/dashboard/deposit" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-brand font-medium text-sm rounded-xl hover:bg-white/90 transition-all active:scale-[0.97] shadow-sm">
                  <Wallet className="w-4 h-4" />
                  Deposit
                </Link>
                <Link href="/dashboard/follower" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 text-white font-medium text-sm rounded-xl hover:bg-white/25 transition-all active:scale-[0.97] border border-white/10">
                  <Copy className="w-4 h-4" />
                  Copy Trade
                </Link>
              </div>
            </div>
          </div>

          {/* Stat cards below hero */}
          <div className="stat-grid">
            <StatCard title="Available" value={formatCurrency(followerStats?.availableBalance ?? 0)} numericValue={followerStats?.availableBalance ?? 0} isCurrency icon={PiggyBank} iconColor="text-success" delay={0} />
            <StatCard title="Allocated" value={formatCurrency(followerStats?.allocatedBalance ?? 0)} numericValue={followerStats?.allocatedBalance ?? 0} isCurrency icon={ArrowRightLeft} iconColor="text-brand" delay={0.04} />
            <StatCard title="Win Rate" value={`${followerStats?.winRate ?? 0}%`} numericValue={followerStats?.winRate ?? 0} icon={Target} iconColor="text-info" delay={0.08} />
            <StatCard title="Copied Trades" value={String(followerStats?.totalCopiedTrades ?? 0)} numericValue={followerStats?.totalCopiedTrades ?? 0} icon={Copy} iconColor="text-warning" delay={0.12} />
          </div>
        </motion.div>
      )}

      {role === "MASTER_TRADER" && (
        <motion.div variants={staggerItem} className="space-y-4">
          {/* Hero card for traders */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand-dark to-brand-700 p-6 md:p-8 text-white shadow-lg">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNMCA0MEw0MCAwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiLz48L3N2Zz4=')] opacity-40" />
            <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Total P&L</p>
                <AnimatedCurrency
                  value={traderStats?.totalPnl ?? 0}
                  className="text-3xl md:text-4xl font-bold tracking-tight"
                />
                <div className="flex items-center gap-3 mt-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-white/20">
                    <Users className="w-3 h-3" />
                    {traderStats?.activeFollowers ?? 0} followers
                  </span>
                  <span className="text-white/40 text-xs">
                    {traderStats?.winRate ?? 0}% win rate
                  </span>
                </div>
              </div>
              <Link href="/dashboard/trader/upload" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-brand font-medium text-sm rounded-xl hover:bg-white/90 transition-all active:scale-[0.97] shadow-sm">
                <Upload className="w-4 h-4" />
                Upload Trade
              </Link>
            </div>
          </div>

          <div className="stat-grid">
            <StatCard title="Total PnL" value={formatCurrency(traderStats?.totalPnl ?? 0)} numericValue={traderStats?.totalPnl ?? 0} isCurrency changeType={(traderStats?.totalPnl ?? 0) >= 0 ? "positive" : "negative"} icon={TrendingUp} iconColor={(traderStats?.totalPnl ?? 0) >= 0 ? "text-success" : "text-danger"} delay={0} />
            <StatCard title="Followers" value={String(traderStats?.activeFollowers ?? 0)} numericValue={traderStats?.activeFollowers ?? 0} icon={Users} iconColor="text-brand" delay={0.04} />
            <StatCard title="Total Trades" value={String(traderStats?.totalTrades ?? 0)} numericValue={traderStats?.totalTrades ?? 0} icon={BarChart3} iconColor="text-warning" delay={0.08} />
            <StatCard title="Win Rate" value={`${traderStats?.winRate ?? 0}%`} numericValue={traderStats?.winRate ?? 0} icon={Target} iconColor="text-info" delay={0.12} />
          </div>
        </motion.div>
      )}

      {/* ═══ Chart + Sidebar ═══ */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Main chart */}
        <div className="lg:col-span-2 glass-panel p-5 md:p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-text-tertiary" />
                <h3 className="text-sm font-semibold text-text-primary">
                  {role === "MASTER_TRADER"
                    ? "Trading Performance"
                    : "Portfolio Performance"}
                </h3>
                <LiveIndicator label="" className="ml-1" />
              </div>
              <div className="flex items-baseline gap-2.5">
                <AnimatedCurrency
                  value={totalPnl}
                  className={`text-2xl md:text-3xl font-bold tabular-nums tracking-tight ${
                    totalPnl >= 0 ? "text-success" : "text-danger"
                  }`}
                />
                {totalPnl !== 0 && (
                  <span
                    className={`text-xs font-medium flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
                      totalPnl >= 0
                        ? "text-success bg-success/10"
                        : "text-danger bg-danger/10"
                    }`}
                  >
                    {totalPnl >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {role === "FOLLOWER" ? "total profit" : "total PnL"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <PnlChart data={pnlChartData} height={240} showGrid />
        </div>

        {/* Sidebar cards */}
        <div className="space-y-4">
          {role === "FOLLOWER" && (
            <>
              {/* Copy Stats */}
              <div className="glass-panel p-4 md:p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">
                  Copy Stats
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      icon: Copy,
                      label: "Copied Trades",
                      value: followerStats?.totalCopiedTrades ?? 0,
                    },
                    {
                      icon: Target,
                      label: "Win Rate",
                      value: `${followerStats?.winRate ?? 0}%`,
                    },
                    {
                      icon: Users,
                      label: "Following",
                      value: followerStats?.following ?? 0,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-xs text-text-tertiary flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5" />
                        {item.label}
                      </span>
                      <span className="text-sm font-semibold text-text-primary tabular-nums">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Traders */}
              <div className="glass-panel p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-text-primary">
                    Top Traders
                  </h3>
                  <Link
                    href="/dashboard/follower"
                    className="text-2xs text-brand hover:text-brand-light font-medium transition-colors"
                  >
                    View all
                  </Link>
                </div>
                <div className="space-y-3">
                  {traders.length > 0 ? (
                    traders.map((trader, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.05, ease: EASE }}
                        className="flex items-center justify-between group cursor-default"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white text-xs font-bold shadow-sm group-hover:scale-110 transition-transform duration-200">
                            {trader.name[0]}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-text-primary group-hover:text-brand transition-colors">
                              {trader.name}
                            </p>
                            <p className="text-2xs text-text-tertiary">
                              {trader.winRate}% win
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-semibold tabular-nums ${
                            trader.pnl >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {formatCurrency(trader.pnl, 0)}
                        </span>
                      </motion.div>
                    ))
                  ) : (
                    <EmptyState variant="no-traders" />
                  )}
                </div>
              </div>
            </>
          )}

          {role === "MASTER_TRADER" && (
            <>
              {/* Recent Trades */}
              <div className="glass-panel p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-text-primary">
                    Recent Trades
                  </h3>
                  <Link
                    href="/dashboard/trader"
                    className="text-2xs text-brand hover:text-brand-light font-medium transition-colors"
                  >
                    View all
                  </Link>
                </div>
                <div className="space-y-2.5">
                  {traderTrades.length > 0 ? (
                    traderTrades.slice(0, 5).map((trade) => (
                      <div
                        key={trade.id}
                        className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                      >
                        <div>
                          <p className="text-xs font-semibold text-text-primary">
                            {trade.tradeName}
                          </p>
                          <p className="text-2xs text-text-tertiary">
                            {trade.market}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-xs font-semibold tabular-nums ${
                              trade.resultPercent >= 0
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            {trade.resultPercent >= 0 ? "+" : ""}
                            {trade.resultPercent}%
                          </p>
                          <p className="text-2xs text-text-tertiary">
                            {trade._count?.copyResults ?? 0} copies
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState variant="no-trades" />
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="glass-panel p-4 md:p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">
                  Summary
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      label: "Total PnL",
                      value: formatCurrency(traderStats?.totalPnl ?? 0),
                      color:
                        (traderStats?.totalPnl ?? 0) >= 0
                          ? "text-success"
                          : "text-danger",
                    },
                    {
                      label: "Win Rate",
                      value: `${traderStats?.winRate ?? 0}%`,
                      color: "text-text-primary",
                    },
                    {
                      label: "Followers",
                      value: String(traderStats?.activeFollowers ?? 0),
                      color: "text-text-primary",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs text-text-tertiary">
                        {item.label}
                      </span>
                      <span
                        className={`text-sm font-semibold tabular-nums ${item.color}`}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
                {pnlChartData.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <MiniChart
                      data={pnlChartData.map((d) => d.pnl)}
                      color={totalPnl >= 0 ? "success" : "danger"}
                      height={48}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* ═══ Portfolio Allocation Donut (Follower) ═══ */}
      {role === "FOLLOWER" && donutSegments.length > 1 && (
        <motion.div variants={staggerItem} className="glass-panel p-5 md:p-6">
          <div className="flex items-center gap-2 mb-5">
            <PieChart className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-semibold text-text-primary">Portfolio Allocation</h3>
          </div>
          <PortfolioDonut
            segments={donutSegments}
            centerLabel="Total Balance"
            centerValue={formatCurrency(followerStats?.totalBalance ?? 0)}
          />
        </motion.div>
      )}

      {/* ═══ Additional Charts ═══ */}
      {role === "FOLLOWER" && (balanceChartData.length > 1 || pnlBarData.length > 1) && (
        <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          {balanceChartData.length > 1 && (
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-info" />
                <h3 className="text-sm font-semibold text-text-primary">Balance Over Time</h3>
              </div>
              <BalanceOverTimeChart data={balanceChartData} height={220} />
            </div>
          )}
          {pnlBarData.length > 1 && (
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-semibold text-text-primary">Daily P&L</h3>
              </div>
              <PnlBarChart data={pnlBarData} height={220} />
            </div>
          )}
        </motion.div>
      )}

      {role === "MASTER_TRADER" && tradePerformanceData.length > 1 && (
        <motion.div variants={staggerItem} className="glass-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-semibold text-text-primary">Trade Performance</h3>
          </div>
          <TradePerformanceChart data={tradePerformanceData} height={260} />
        </motion.div>
      )}

      {/* ═══ Activity Feed + Recent Activity ═══ */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Live Activity Feed */}
        <ActivityFeed />

        {/* Recent Activity / Trade History */}
        <div className="lg:col-span-2 glass-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">
                {role === "MASTER_TRADER" ? "Trade History" : "Recent Activity"}
              </h3>
              <LiveIndicator label="" />
            </div>
            <Link
              href={dashboardLink}
              className="text-xs text-brand hover:text-brand-light font-medium transition-colors"
            >
              View all
            </Link>
          </div>

          {role === "FOLLOWER" && (
            <div className="divide-y divide-border/50">
              {transactions.length > 0 ? (
                transactions.slice(0, 6).map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.03, ease: EASE }}
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-1/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`p-2 rounded-lg ${
                          tx.type === "DEPOSIT" || tx.type === "COPY_PROFIT"
                            ? "bg-success/10"
                            : tx.type === "WITHDRAWAL" || tx.type === "COPY_LOSS"
                            ? "bg-danger/10"
                            : "bg-brand/10"
                        }`}
                      >
                        {tx.type === "DEPOSIT" || tx.type === "COPY_PROFIT" ? (
                          <TrendingUp className="w-4 h-4 text-success" />
                        ) : tx.type === "WITHDRAWAL" ||
                          tx.type === "COPY_LOSS" ? (
                          <TrendingDown className="w-4 h-4 text-danger" />
                        ) : (
                          <ArrowRightLeft className="w-4 h-4 text-brand" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {txTypeLabel(tx.type)}
                        </p>
                        {tx.description && (
                          <p className="text-2xs text-text-tertiary mt-0.5">
                            {tx.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold tabular-nums ${
                          tx.amount >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {formatCurrency(tx.amount)}
                      </p>
                      <p className="text-2xs text-text-tertiary mt-0.5">
                        {timeAgo(tx.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <EmptyState variant="no-activity" />
              )}
            </div>
          )}

          {role === "MASTER_TRADER" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-1/30">
                    <th className="table-header px-5 py-3 text-left">Trade</th>
                    <th className="table-header px-4 py-3 text-left">Market</th>
                    <th className="table-header px-4 py-3 text-right">Result</th>
                    <th className="table-header px-4 py-3 text-right">P&L</th>
                    <th className="table-header px-4 py-3 text-right">Copies</th>
                    <th className="table-header px-5 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {traderTrades.length > 0 ? (
                    traderTrades.map((trade, i) => (
                      <motion.tr
                        key={trade.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.03 }}
                        className="table-row"
                      >
                        <td className="table-cell px-5 font-semibold text-sm">
                          {trade.tradeName}
                        </td>
                        <td className="table-cell px-4">
                          <span className="px-2.5 py-1 rounded-full bg-surface-3 text-xs font-medium text-text-secondary">
                            {trade.market}
                          </span>
                        </td>
                        <td className="table-cell px-4 text-right">
                          <span
                            className={`flex items-center justify-end gap-1 text-sm font-semibold tabular-nums ${
                              trade.resultPercent >= 0
                                ? "text-success"
                                : "text-danger"
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
                        <td className="table-cell px-4 text-right">
                          <span
                            className={`font-semibold tabular-nums ${
                              trade.profitLoss >= 0
                                ? "text-success"
                                : "text-danger"
                            }`}
                          >
                            {trade.profitLoss >= 0 ? "+" : ""}
                            {formatCurrency(trade.profitLoss)}
                          </span>
                        </td>
                        <td className="table-cell px-4 text-right text-text-secondary">
                          {trade._count?.copyResults ?? 0}
                        </td>
                        <td className="table-cell px-5 text-right text-text-tertiary text-xs">
                          {new Date(trade.tradeDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState variant="no-trades" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══ Live Market Charts (TradingView) ═══ */}
      <motion.div variants={staggerItem}>
        <LiveMarketSection />
      </motion.div>
    </motion.div>
  );
}
