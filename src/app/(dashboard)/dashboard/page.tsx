"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  ArrowRightLeft,
  Target,
  Upload,
  Copy,
  Activity,
  Wallet,
  Clock,
  Sparkles,
  CircleDollarSign,
  LineChart,
  RefreshCw,
  CheckCircle2,
  Signal,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedCurrency } from "@/components/ui/animated-counter";
import { PnlChart } from "@/components/charts/pnl-chart";
import { MiniChart } from "@/components/charts/mini-chart";
import { PortfolioDonut } from "@/components/charts/portfolio-donut";
import { BalanceOverTimeChart, PnlBarChart } from "@/components/charts/trading-charts";
import { LiveMarketSection } from "@/components/charts/live-market-section";
import { formatCurrency } from "@/lib/utils";
import { StatGridSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/chart-skeleton";
import { TierBadge } from "@/components/ui/tier-badge";
import { ChartRangeSelector, filterByRange, type ChartRange } from "@/components/ui/chart-range-selector";
import { TIER_CONFIGS, type TierLevel } from "@/config/constants";
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

function HeroSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 300;
  const h = 100;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h * 0.85 - h * 0.05;
    return `${x},${y}`;
  });
  const line = points.join(" ");
  const area = `0,${h} ${line} ${w},${h}`;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="hero-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#hero-spark-fill)" />
      <polyline points={line} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
    </svg>
  );
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
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [followedTraders, setFollowedTraders] = useState<{ name: string; isActive: boolean }[]>([]);
  const [chartRange, setChartRange] = useState<ChartRange>("30d");
  const [tierData, setTierData] = useState<{
    tier: { level: TierLevel; name: string; color: string; maxDailyTrades: number; commissionRate: number; benefits: string[] };
    totalDeposited: number;
    dailyTradeCount: number;
    dailyTradesRemaining: number;
    nextTier: { name: string; minDeposit: number; amountNeeded: number } | null;
    progress: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const fetches: Promise<Response>[] = [fetch("/api/stats")];

      if (role === "FOLLOWER") {
        fetches.push(fetch("/api/balance"), fetch("/api/traders"));
      } else if (role === "MASTER_TRADER") {
        fetches.push(fetch("/api/trader-trades?limit=10"));
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
            (data.traders || []).slice(0, 5).map((t: TraderItem) => ({
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
      // Fetch followed traders for header display
      if (role === "FOLLOWER") {
        fetch("/api/followers").then(async (r) => {
          if (r.ok) {
            const data = await r.json();
            setFollowedTraders(
              (data.following || []).map((f: { trader: { displayName: string; isActive: boolean } }) => ({
                name: f.trader.displayName,
                isActive: f.trader.isActive ?? true,
              }))
            );
          }
        }).catch(() => {});
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchData();
    setRefreshSuccess(true);
    setTimeout(() => setRefreshSuccess(false), 2000);
  }, [refreshing, fetchData]);

  useEffect(() => {
    if (role === "FOLLOWER") {
      fetch("/api/user/tier").then((r) => r.ok ? r.json() : null).then((d) => d && setTierData(d)).catch(() => {});
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

  // Chart data — filtered by selected range
  const rangedTransactions = filterByRange(transactions, chartRange, "createdAt");
  const rangedTrades = filterByRange(traderTrades, chartRange, "tradeDate");

  const pnlChartData = (() => {
    if (role === "FOLLOWER") {
      const copyTxs = rangedTransactions.filter((t) => t.type === "COPY_PROFIT" || t.type === "COPY_LOSS");
      if (copyTxs.length > 0) {
        return copyTxs.reverse().reduce((acc, t) => {
          const cumPnl = (acc.length > 0 ? acc[acc.length - 1].pnl : 0) + t.amount;
          acc.push({
            date: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            pnl: cumPnl,
          });
          return acc;
        }, [] as { date: string; pnl: number }[]);
      }
    }
    if (role === "MASTER_TRADER" && rangedTrades.length > 0) {
      return rangedTrades.slice().reverse().reduce((acc, t) => {
        const cumPnl = (acc.length > 0 ? acc[acc.length - 1].pnl : 0) + t.profitLoss;
        acc.push({
          date: new Date(t.tradeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          pnl: cumPnl,
        });
        return acc;
      }, [] as { date: string; pnl: number }[]);
    }
    return Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      pnl: 0,
    }));
  })();

  // Balance over time data
  const balanceChartData = rangedTransactions.length > 0
    ? rangedTransactions.slice().reverse().map((t) => ({
        date: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        balance: t.balanceAfter,
      }))
    : [];

  // PnL bar data
  const pnlBarData = (() => {
    if (role === "MASTER_TRADER" && rangedTrades.length > 0) {
      return rangedTrades.slice().reverse().map((t) => ({
        date: new Date(t.tradeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        pnl: t.profitLoss,
      }));
    }
    const copyTxs = rangedTransactions.filter((t) => t.type === "COPY_PROFIT" || t.type === "COPY_LOSS");
    if (copyTxs.length > 0) {
      return copyTxs.reverse().map((t) => ({
        date: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        pnl: t.amount,
      }));
    }
    return [];
  })();

  // Portfolio donut segments
  const donutSegments = (() => {
    if (!followerStats) return [];
    const segments = [];
    if (followerStats.availableBalance > 0) {
      segments.push({ label: "Available", value: followerStats.availableBalance, color: "#26A69A" });
    }
    if (followerStats.allocatedBalance > 0) {
      segments.push({ label: "Allocated", value: followerStats.allocatedBalance, color: "#2962FF" });
    }
    if (followerStats.totalProfit > 0) {
      segments.push({ label: "Profit", value: followerStats.totalProfit, color: "#AB47BC" });
    }
    if (segments.length === 0) {
      segments.push({ label: "Balance", value: 1, color: "#2962FF" });
    }
    return segments;
  })();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-56 skeleton" />
            <div className="h-4 w-40 skeleton" />
          </div>
          <div className="h-10 w-36 skeleton" />
        </div>
        <StatGridSkeleton count={4} />
        <ChartSkeleton height={320} />
        <TableSkeleton rows={5} cols={4} />
      </div>
    );
  }

  const totalPnl = role === "FOLLOWER" ? (followerStats?.totalProfit ?? 0) : (traderStats?.totalPnl ?? 0);
  const firstName = session?.user?.name?.split(" ")[0] || "Trader";

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6 md:space-y-8"
    >
      {/* ═══ Header ═══ */}
      <motion.div variants={staggerItem}>
        <DashboardHeader firstName={firstName} followedTraders={followedTraders}>
          {role === "FOLLOWER" && (
            <Link href="/dashboard/deposit" className="btn-primary text-sm gap-2">
              <Wallet className="w-3.5 h-3.5" />
              Deposit
            </Link>
          )}
          {role === "MASTER_TRADER" && (
            <Link href="/dashboard/trader/upload" className="btn-primary text-sm gap-2">
              <Upload className="w-3.5 h-3.5" />
              Upload Trade
            </Link>
          )}
        </DashboardHeader>
      </motion.div>

      {/* ═══ FOLLOWER DASHBOARD ═══ */}
      {role === "FOLLOWER" && (
        <>
          {/* Hero Balance Card */}
          <motion.div variants={staggerItem}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand-dark to-brand-700 p-6 md:p-8 text-white shadow-lg">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNMCA0MEw0MCAwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiLz48L3N2Zz4=')] opacity-40" />
              {/* Background sparkline */}
              {balanceChartData.length > 1 && (
                <div className="absolute bottom-0 right-0 w-[60%] h-[70%] opacity-[0.12] pointer-events-none">
                  <HeroSparkline data={balanceChartData.map((d) => d.balance)} />
                </div>
              )}
              <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Total Balance</p>
                    {lastUpdated && (
                      <span className="text-white/25 text-[10px] tabular-nums">
                        Updated {timeAgo(lastUpdated.toISOString())}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <AnimatedCurrency value={followerStats?.totalBalance ?? 0} className="text-3xl md:text-4xl font-bold tracking-tight" />
                    {/* Refresh button */}
                    <motion.button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh balance"
                      aria-label="Refresh balance"
                    >
                      <AnimatePresence mode="wait">
                        {refreshSuccess ? (
                          <motion.div key="check" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          </motion.div>
                        ) : (
                          <motion.div key="refresh" animate={refreshing ? { rotate: 360 } : {}} transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : {}}>
                            <RefreshCw className="w-4 h-4 text-white/70" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${totalPnl >= 0 ? "bg-white/20 text-white" : "bg-red-500/30 text-red-100"}`}>
                      {totalPnl >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {formatCurrency(Math.abs(totalPnl))} profit
                    </span>
                    <span className="text-white/40 text-xs">{followerStats?.following ?? 0} traders followed</span>
                    {tierData && <TierBadge tier={TIER_CONFIGS[tierData.tier.level]} size="sm" />}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/dashboard/deposit" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-brand font-medium text-sm rounded-xl hover:bg-white/90 transition-all active:scale-[0.97] shadow-sm">
                    <Wallet className="w-4 h-4" />
                    Deposit
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stat cards */}
          <motion.div variants={staggerItem} className="stat-grid">
            <StatCard title="Available" value={formatCurrency(followerStats?.availableBalance ?? 0)} numericValue={followerStats?.availableBalance ?? 0} isCurrency icon={PiggyBank} iconColor="text-success" delay={0} />
            <StatCard title="Allocated" value={formatCurrency(followerStats?.allocatedBalance ?? 0)} numericValue={followerStats?.allocatedBalance ?? 0} isCurrency icon={ArrowRightLeft} iconColor="text-brand" delay={0.04} />
            <StatCard title="Win Rate" value={`${followerStats?.winRate ?? 0}%`} numericValue={followerStats?.winRate ?? 0} icon={Target} iconColor="text-info" delay={0.08} />
            <StatCard title="Copied Trades" value={String(followerStats?.totalCopiedTrades ?? 0)} numericValue={followerStats?.totalCopiedTrades ?? 0} icon={Copy} iconColor="text-warning" delay={0.12} />
          </motion.div>

          {/* Main chart + Allocation donut + Tier */}
          <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
            {/* Performance chart — 8 cols */}
            <div className="md:col-span-8 glass-panel p-5 md:p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-text-tertiary" />
                    <h3 className="text-sm font-semibold text-text-primary">Portfolio Performance</h3>
                    <ChartRangeSelector value={chartRange} onChange={setChartRange} />
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <AnimatedCurrency value={totalPnl} className={`text-2xl md:text-3xl font-bold tabular-nums tracking-tight ${totalPnl >= 0 ? "text-success" : "text-danger"}`} />
                    {totalPnl !== 0 && (
                      <span className={`text-xs font-medium flex items-center gap-0.5 px-2 py-0.5 rounded-full ${totalPnl >= 0 ? "text-success bg-success/10" : "text-danger bg-danger/10"}`}>
                        {totalPnl >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        total profit
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <PnlChart data={pnlChartData} height={260} showGrid />
            </div>

            {/* Sidebar — 4 cols */}
            <div className="md:col-span-4 space-y-4">
              {/* Portfolio Allocation Donut */}
              <div className="glass-panel p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CircleDollarSign className="w-4 h-4 text-text-tertiary" />
                  <h3 className="text-sm font-semibold text-text-primary">Allocation</h3>
                </div>
                <PortfolioDonut
                  segments={donutSegments}
                  centerLabel="Total"
                  centerValue={formatCurrency(followerStats?.totalBalance ?? 0)}
                  size={140}
                />
              </div>

              {/* Tier Status */}
              {tierData && (
                <div className="glass-panel p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-text-tertiary" />
                      <h3 className="text-sm font-semibold text-text-primary">Your Tier</h3>
                    </div>
                    <TierBadge tier={TIER_CONFIGS[tierData.tier.level]} size="md" />
                  </div>
                  {tierData.nextTier && (
                    <div className="space-y-1.5 mb-3">
                      <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden" role="progressbar" aria-valuenow={tierData.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Tier progress: ${tierData.progress}%`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${tierData.progress}%` }}
                          transition={{ duration: 1, ease: EASE }}
                          className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-text-tertiary">
                        <span>${tierData.totalDeposited.toLocaleString()}</span>
                        <span>${tierData.nextTier.minDeposit.toLocaleString()} for {tierData.nextTier.name}</span>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-xs text-text-tertiary">Trades today</span>
                      <span className="text-xs font-semibold text-text-primary tabular-nums">
                        {tierData.dailyTradeCount} / {tierData.tier.maxDailyTrades === -1 ? "∞" : tierData.tier.maxDailyTrades}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-xs text-text-tertiary">Commission</span>
                      <span className="text-xs font-semibold text-text-primary tabular-nums">
                        {(tierData.tier.commissionRate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {tierData.nextTier && (
                    <Link href="/dashboard/deposit" className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-brand hover:text-brand-light transition-colors py-2 rounded-lg hover:bg-brand/5">
                      <ArrowUpRight className="w-3 h-3" />
                      Deposit to upgrade
                    </Link>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Additional charts row */}
          {(balanceChartData.length > 1 || pnlBarData.length > 1) && (
            <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              {balanceChartData.length > 1 && (
                <div className="glass-panel p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <LineChart className="w-4 h-4 text-text-tertiary" />
                    <h3 className="text-sm font-semibold text-text-primary">Balance History</h3>
                  </div>
                  <BalanceOverTimeChart data={balanceChartData} height={220} />
                </div>
              )}
              {pnlBarData.length > 1 && (
                <div className="glass-panel p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-text-tertiary" />
                    <h3 className="text-sm font-semibold text-text-primary">P&L per Trade</h3>
                  </div>
                  <PnlBarChart data={pnlBarData} height={220} />
                </div>
              )}
            </motion.div>
          )}

          {/* Activity + Top Traders row */}
          <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
            {/* Recent Activity — 8 cols */}
            <div className="md:col-span-8 glass-panel overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-text-tertiary" />
                  <h3 className="text-sm font-semibold text-text-primary">Recent Activity</h3>
                </div>
                <Link href="/dashboard/history" className="text-2xs text-brand hover:text-brand-light font-medium transition-colors">
                  View all
                </Link>
              </div>
              <div className="divide-y divide-border/50">
                {transactions.length > 0 ? (
                  transactions.slice(0, 8).map((tx, i) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.03, ease: EASE }}
                      className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-2/30 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`p-2 rounded-lg ${tx.type === "DEPOSIT" || tx.type === "COPY_PROFIT" ? "bg-success/10" : tx.type === "WITHDRAWAL" || tx.type === "COPY_LOSS" ? "bg-danger/10" : "bg-brand/10"}`}>
                          {tx.type === "DEPOSIT" || tx.type === "COPY_PROFIT" ? (
                            <TrendingUp className="w-4 h-4 text-success" />
                          ) : tx.type === "WITHDRAWAL" || tx.type === "COPY_LOSS" ? (
                            <TrendingDown className="w-4 h-4 text-danger" />
                          ) : (
                            <ArrowRightLeft className="w-4 h-4 text-brand" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{txTypeLabel(tx.type)}</p>
                          {tx.description && <p className="text-2xs text-text-tertiary mt-0.5">{tx.description}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold tabular-nums ${tx.amount >= 0 ? "text-success" : "text-danger"}`}>
                          {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                        </p>
                        <p className="text-2xs text-text-tertiary mt-0.5">{timeAgo(tx.createdAt)}</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <EmptyState variant="no-activity" />
                )}
              </div>
            </div>

            {/* Top Traders — 4 cols */}
            <div className="md:col-span-4 space-y-4">
              <div className="glass-panel p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-text-tertiary" />
                    <h3 className="text-sm font-semibold text-text-primary">Top Traders</h3>
                  </div>
                  <Link href="/dashboard/follower" className="text-2xs text-brand hover:text-brand-light font-medium transition-colors">
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
                            <p className="text-xs font-semibold text-text-primary group-hover:text-brand transition-colors">{trader.name}</p>
                            <p className="text-2xs text-text-tertiary">{trader.winRate}% win &bull; {trader.followers} followers</p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold tabular-nums ${trader.pnl >= 0 ? "text-success" : "text-danger"}`}>
                          {formatCurrency(trader.pnl, 0)}
                        </span>
                      </motion.div>
                    ))
                  ) : (
                    <EmptyState variant="no-traders" />
                  )}
                </div>
              </div>

              {/* Copy Stats */}
              <div className="glass-panel p-4 md:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Copy className="w-4 h-4 text-text-tertiary" />
                  <h3 className="text-sm font-semibold text-text-primary">Copy Stats</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: Copy, label: "Copied Trades", value: followerStats?.totalCopiedTrades ?? 0 },
                    { icon: Target, label: "Win Rate", value: `${followerStats?.winRate ?? 0}%` },
                    { icon: Users, label: "Following", value: followerStats?.following ?? 0 },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1">
                      <span className="text-xs text-text-tertiary flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5" />
                        {item.label}
                      </span>
                      <span className="text-sm font-semibold text-text-primary tabular-nums">{item.value}</span>
                    </div>
                  ))}
                </div>
                {pnlChartData.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <MiniChart data={pnlChartData.map((d) => d.pnl)} color={totalPnl >= 0 ? "success" : "danger"} height={48} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Live Market Charts */}
          <motion.div variants={staggerItem}>
            <LiveMarketSection />
          </motion.div>
        </>
      )}

      {/* ═══ TRADER DASHBOARD ═══ */}
      {role === "MASTER_TRADER" && (
        <>
          {/* Hero card */}
          <motion.div variants={staggerItem}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand-dark to-brand-700 p-6 md:p-8 text-white shadow-lg">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNMCA0MEw0MCAwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiLz48L3N2Zz4=')] opacity-40" />
              <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Total P&L</p>
                  <AnimatedCurrency value={traderStats?.totalPnl ?? 0} className="text-3xl md:text-4xl font-bold tracking-tight" />
                  <div className="flex items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-white/20">
                      <Users className="w-3 h-3" />
                      {traderStats?.activeFollowers ?? 0} followers
                    </span>
                    <span className="text-white/40 text-xs">{traderStats?.winRate ?? 0}% win rate</span>
                  </div>
                </div>
                <Link href="/dashboard/trader/upload" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-brand font-medium text-sm rounded-xl hover:bg-white/90 transition-all active:scale-[0.97] shadow-sm">
                  <Upload className="w-4 h-4" />
                  Upload Trade
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Stat cards */}
          <motion.div variants={staggerItem} className="stat-grid">
            <StatCard title="Total PnL" value={formatCurrency(traderStats?.totalPnl ?? 0)} numericValue={traderStats?.totalPnl ?? 0} isCurrency changeType={(traderStats?.totalPnl ?? 0) >= 0 ? "positive" : "negative"} icon={TrendingUp} iconColor={(traderStats?.totalPnl ?? 0) >= 0 ? "text-success" : "text-danger"} delay={0} />
            <StatCard title="Followers" value={String(traderStats?.activeFollowers ?? 0)} numericValue={traderStats?.activeFollowers ?? 0} icon={Users} iconColor="text-brand" delay={0.04} />
            <StatCard title="Total Trades" value={String(traderStats?.totalTrades ?? 0)} numericValue={traderStats?.totalTrades ?? 0} icon={BarChart3} iconColor="text-warning" delay={0.08} />
            <StatCard title="Win Rate" value={`${traderStats?.winRate ?? 0}%`} numericValue={traderStats?.winRate ?? 0} icon={Target} iconColor="text-info" delay={0.12} />
          </motion.div>

          {/* Chart + Summary */}
          <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
            <div className="md:col-span-8 glass-panel p-5 md:p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-text-tertiary" />
                    <h3 className="text-sm font-semibold text-text-primary">Trading Performance</h3>
                    <ChartRangeSelector value={chartRange} onChange={setChartRange} />
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <AnimatedCurrency value={totalPnl} className={`text-2xl md:text-3xl font-bold tabular-nums tracking-tight ${totalPnl >= 0 ? "text-success" : "text-danger"}`} />
                    {totalPnl !== 0 && (
                      <span className={`text-xs font-medium flex items-center gap-0.5 px-2 py-0.5 rounded-full ${totalPnl >= 0 ? "text-success bg-success/10" : "text-danger bg-danger/10"}`}>
                        {totalPnl >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        total PnL
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <PnlChart data={pnlChartData} height={260} showGrid />
            </div>

            <div className="md:col-span-4 space-y-4">
              <div className="glass-panel p-4 md:p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Summary</h3>
                <div className="space-y-3">
                  {[
                    { label: "Total PnL", value: formatCurrency(traderStats?.totalPnl ?? 0), color: (traderStats?.totalPnl ?? 0) >= 0 ? "text-success" : "text-danger" },
                    { label: "Win Rate", value: `${traderStats?.winRate ?? 0}%`, color: "text-text-primary" },
                    { label: "Followers", value: String(traderStats?.activeFollowers ?? 0), color: "text-text-primary" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-xs text-text-tertiary">{item.label}</span>
                      <span className={`text-sm font-semibold tabular-nums ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
                {pnlChartData.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <MiniChart data={pnlChartData.map((d) => d.pnl)} color={totalPnl >= 0 ? "success" : "danger"} height={48} />
                  </div>
                )}
              </div>

              {/* Recent Trades mini */}
              <div className="glass-panel p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-text-primary">Recent Trades</h3>
                  <Link href="/dashboard/trader" className="text-2xs text-brand hover:text-brand-light font-medium transition-colors">View all</Link>
                </div>
                <div className="space-y-2.5">
                  {traderTrades.length > 0 ? (
                    traderTrades.slice(0, 5).map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <div>
                          <p className="text-xs font-semibold text-text-primary">{trade.tradeName}</p>
                          <p className="text-2xs text-text-tertiary">{trade.market}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-semibold tabular-nums ${trade.resultPercent >= 0 ? "text-success" : "text-danger"}`}>
                            {trade.resultPercent >= 0 ? "+" : ""}{trade.resultPercent}%
                          </p>
                          <p className="text-2xs text-text-tertiary">{trade._count?.copyResults ?? 0} copies</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState variant="no-trades" />
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* PnL bar chart */}
          {pnlBarData.length > 1 && (
            <motion.div variants={staggerItem} className="glass-panel p-5 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-text-tertiary" />
                <h3 className="text-sm font-semibold text-text-primary">P&L per Trade</h3>
              </div>
              <PnlBarChart data={pnlBarData} height={220} />
            </motion.div>
          )}

          {/* Trade history table */}
          <motion.div variants={staggerItem} className="glass-panel overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-tertiary" />
                <h3 className="text-sm font-semibold text-text-primary">Trade History</h3>
              </div>
              <Link href="/dashboard/trader/trades" className="text-2xs text-brand hover:text-brand-light font-medium transition-colors">View all</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-2/30">
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
                      <motion.tr key={trade.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.03 }} className="table-row">
                        <td className="table-cell px-5 font-semibold text-sm">{trade.tradeName}</td>
                        <td className="table-cell px-4">
                          <span className="px-2.5 py-1 rounded-full bg-surface-3 text-xs font-medium text-text-secondary">{trade.market}</span>
                        </td>
                        <td className="table-cell px-4 text-right">
                          <span className={`flex items-center justify-end gap-1 text-sm font-semibold tabular-nums ${trade.resultPercent >= 0 ? "text-success" : "text-danger"}`}>
                            {trade.resultPercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {trade.resultPercent >= 0 ? "+" : ""}{trade.resultPercent}%
                          </span>
                        </td>
                        <td className={`table-cell px-4 text-right font-semibold tabular-nums ${trade.profitLoss >= 0 ? "text-success" : "text-danger"}`}>
                          {formatCurrency(trade.profitLoss)}
                        </td>
                        <td className="table-cell px-4 text-right">{trade._count?.copyResults ?? 0}</td>
                        <td className="table-cell px-5 text-right text-text-tertiary">
                          {new Date(trade.tradeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr><td colSpan={6}><EmptyState variant="no-trades" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Live Markets */}
          <motion.div variants={staggerItem}>
            <LiveMarketSection />
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
