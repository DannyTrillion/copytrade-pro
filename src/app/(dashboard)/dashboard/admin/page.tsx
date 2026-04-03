"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  DollarSign,
  BarChart3,
  LineChart,
  UserCog,
  CandlestickChart,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Activity,
  RefreshCw,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

/* ---------- Types ---------- */

interface PlatformStats {
  totalUsers: number;
  totalTraders: number;
  totalFollowers: number;
  totalTraderTrades: number;
  totalCopyResults: number;
  totalPlatformBalance: number;
  totalAllocated: number;
  totalProfit: number;
  totalTraderPnl: number;
  totalDeposits: number;
  totalWithdrawals: number;
  platformWinRate: number;
}

interface DepositRow {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
}

interface WithdrawalRow {
  id: string;
  amount: number;
  network: string | null;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
}

interface ActivityItem {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  status: string;
  userName: string;
  createdAt: string;
}

/* ---------- Constants ---------- */

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle2,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-warning",
  CONFIRMED: "text-success",
  APPROVED: "text-success",
  REJECTED: "text-danger",
};

/* ---------- Component ---------- */

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [pendingDeposits, setPendingDeposits] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, depositsRes, withdrawalsRes] = await Promise.all([
        fetch("/api/admin?view=stats"),
        fetch("/api/admin?view=deposits"),
        fetch("/api/admin?view=withdrawals"),
      ]);

      if (!statsRes.ok || !depositsRes.ok || !withdrawalsRes.ok) {
        throw new Error("Failed to load admin data");
      }

      const statsData = await statsRes.json();
      const depositsData = await depositsRes.json();
      const withdrawalsData = await withdrawalsRes.json();

      setStats(statsData.stats);

      const deposits: DepositRow[] = depositsData.deposits || [];
      const withdrawals: WithdrawalRow[] = withdrawalsData.withdrawals || [];

      setPendingDeposits(deposits.filter((d) => d.status === "PENDING").length);
      setPendingWithdrawals(withdrawals.filter((w) => w.status === "PENDING").length);

      // Combine and sort recent activity (last 10)
      const combined: ActivityItem[] = [
        ...deposits.map((d) => ({
          id: d.id,
          type: "DEPOSIT" as const,
          amount: d.amount,
          status: d.status,
          userName: d.user.name || d.user.email,
          createdAt: d.createdAt,
        })),
        ...withdrawals.map((w) => ({
          id: w.id,
          type: "WITHDRAWAL" as const,
          amount: w.amount,
          status: w.status,
          userName: w.user.name || w.user.email,
          createdAt: w.createdAt,
        })),
      ]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      setRecentActivity(combined);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  /* ---------- Loading / Error ---------- */

  if (initialLoading) {
    return (
      <div className="space-y-8 pb-12">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        {/* Primary stat cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel p-4 md:p-5 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        {/* Secondary stat cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel p-4 md:p-5 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        {/* Quick Actions + Recent Activity skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="rounded-xl bg-surface-2 border border-border overflow-hidden divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <div className="text-right space-y-1.5">
                    <Skeleton className="h-4 w-20 ml-auto" />
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-danger text-sm">{error || "Failed to load stats"}</p>
      </div>
    );
  }

  /* ---------- Quick action cards ---------- */

  const quickActions = [
    {
      label: "Review Deposits",
      href: "/dashboard/admin/deposits",
      icon: ArrowDownToLine,
      badge: pendingDeposits,
      color: "text-emerald-400",
    },
    {
      label: "Review Withdrawals",
      href: "/dashboard/admin/withdrawals",
      icon: ArrowUpFromLine,
      badge: pendingWithdrawals,
      color: "text-amber-400",
    },
    {
      label: "Manage Users",
      href: "/dashboard/admin/users",
      icon: UserCog,
      color: "text-blue-400",
    },
    {
      label: "Manage Traders",
      href: "/dashboard/admin/manage-traders",
      icon: TrendingUp,
      color: "text-violet-400",
    },
    {
      label: "View Trades",
      href: "/dashboard/admin/trades",
      icon: CandlestickChart,
      color: "text-cyan-400",
    },
    {
      label: "Analytics",
      href: "/dashboard/admin/analytics",
      icon: BarChart3,
      color: "text-pink-400",
    },
    {
      label: "Audit Log",
      href: "/dashboard/admin/audit-log",
      icon: FileText,
      color: "text-slate-400",
    },
  ];

  /* ---------- Render ---------- */

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            Admin Dashboard
          </h1>
          <button
            onClick={() => fetchData()}
            className="p-2 rounded-lg hover:bg-surface-2 transition-colors text-text-tertiary hover:text-text-primary"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {lastUpdated && (
            <span className="text-2xs text-text-tertiary tabular-nums">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <p className="text-sm text-text-tertiary mt-1">
          Platform overview and quick actions
        </p>
      </motion.div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Link href="/dashboard/admin/users">
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={Users}
            iconColor="text-blue-400"
            delay={0}
            className="cursor-pointer"
          />
        </Link>
        <StatCard
          title="Active Traders"
          value={stats.totalTraders.toLocaleString()}
          icon={TrendingUp}
          iconColor="text-violet-400"
          delay={0.05}
        />
        <StatCard
          title="Platform Balance"
          value={formatCurrency(stats.totalPlatformBalance)}
          icon={Wallet}
          iconColor="text-emerald-400"
          delay={0.1}
        />
        <Link href="/dashboard/admin/deposits">
          <StatCard
            title="Pending Deposits"
            value={pendingDeposits.toLocaleString()}
            icon={ArrowDownToLine}
            iconColor="text-amber-400"
            delay={0.15}
            change={pendingDeposits > 0 ? "Action needed" : undefined}
            changeType={pendingDeposits > 0 ? "negative" : "neutral"}
            className="cursor-pointer"
          />
        </Link>
        <Link href="/dashboard/admin/withdrawals">
          <StatCard
            title="Pending Withdrawals"
            value={pendingWithdrawals.toLocaleString()}
            icon={ArrowUpFromLine}
            iconColor="text-orange-400"
            delay={0.2}
            change={pendingWithdrawals > 0 ? "Action needed" : undefined}
            changeType={pendingWithdrawals > 0 ? "negative" : "neutral"}
            className="cursor-pointer"
          />
        </Link>
        <StatCard
          title="Total Profit"
          value={formatCurrency(stats.totalProfit)}
          icon={DollarSign}
          iconColor="text-emerald-400"
          delay={0.25}
          change={stats.totalProfit >= 0 ? "Positive" : "Negative"}
          changeType={stats.totalProfit >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Followers"
          value={stats.totalFollowers.toLocaleString()}
          icon={Users}
          iconColor="text-cyan-400"
          delay={0.3}
        />
        <StatCard
          title="Total Deposits"
          value={formatCurrency(stats.totalDeposits)}
          icon={ArrowDownToLine}
          iconColor="text-emerald-400"
          delay={0.35}
        />
        <StatCard
          title="Total Withdrawals"
          value={formatCurrency(stats.totalWithdrawals)}
          icon={ArrowUpFromLine}
          iconColor="text-red-400"
          delay={0.4}
        />
        <StatCard
          title="Win Rate"
          value={`${stats.platformWinRate}%`}
          icon={LineChart}
          iconColor="text-brand"
          delay={0.45}
        />
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-1"
        >
          <h2 className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wider">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group relative flex items-center gap-3 p-4 rounded-xl bg-surface-2 border border-border hover:border-brand/40 hover:bg-surface-3 transition-all duration-200"
                >
                  <div className={`p-2 rounded-lg bg-surface-3 ${action.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-text-primary flex-1">
                    {action.label}
                  </span>
                  {action.badge !== undefined && action.badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-danger text-[11px] font-semibold text-white">
                      {action.badge}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-brand transition-colors" />
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-2"
        >
          <h2 className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wider">
            Recent Activity
          </h2>
          <div className="rounded-xl bg-surface-2 border border-border overflow-hidden">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
                <Activity className="w-8 h-8 mb-3 opacity-40" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentActivity.map((item) => {
                  const StatusIcon = STATUS_ICON[item.status] || Clock;
                  const statusColor = STATUS_COLOR[item.status] || "text-text-tertiary";
                  const isDeposit = item.type === "DEPOSIT";

                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-surface-3/50 transition-colors"
                    >
                      <div
                        className={`p-2 rounded-lg bg-surface-3 ${
                          isDeposit ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {isDeposit ? (
                          <ArrowDownToLine className="w-4 h-4" />
                        ) : (
                          <ArrowUpFromLine className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {item.userName}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {isDeposit ? "Deposit" : "Withdrawal"} &middot;{" "}
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-text-primary tabular-nums">
                          {isDeposit ? "+" : "-"}
                          {formatCurrency(item.amount)}
                        </p>
                        <div className={`flex items-center justify-end gap-1 ${statusColor}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span className="text-[11px] font-medium capitalize">
                            {item.status.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
