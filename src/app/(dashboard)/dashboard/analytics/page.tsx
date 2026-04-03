"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PiggyBank,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Zap,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PnlChart } from "@/components/charts/pnl-chart";
import { StatGridSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/chart-skeleton";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { formatCurrency } from "@/lib/utils";
import { staggerChildren, slideUp } from "@/lib/animations";
import Link from "next/link";

interface BalanceData {
  totalBalance: number;
  availableBalance: number;
  allocatedBalance: number;
  totalProfit: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
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
  return map[type] || type.replace("_", " ");
}

function txIcon(type: string) {
  if (type === "DEPOSIT" || type === "COPY_PROFIT") return ArrowUpRight;
  if (type === "WITHDRAWAL" || type === "COPY_LOSS") return ArrowDownRight;
  return Wallet;
}

function txBg(type: string) {
  if (type === "DEPOSIT" || type === "COPY_PROFIT") return "bg-success/10";
  if (type === "WITHDRAWAL" || type === "COPY_LOSS") return "bg-danger/10";
  return "bg-brand/10";
}

function txColor(type: string) {
  if (type === "DEPOSIT" || type === "COPY_PROFIT") return "text-success";
  if (type === "WITHDRAWAL" || type === "COPY_LOSS") return "text-danger";
  return "text-brand";
}

function groupByDate(txs: Transaction[]): { label: string; transactions: Transaction[] }[] {
  const groups: Map<string, Transaction[]> = new Map();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const tx of txs) {
    const dateStr = new Date(tx.createdAt).toDateString();
    let label: string;
    if (dateStr === today) label = "Today";
    else if (dateStr === yesterday) label = "Yesterday";
    else label = new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(tx);
  }

  return Array.from(groups.entries()).map(([label, transactions]) => ({ label, transactions }));
}

export default function UserAnalyticsPage() {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/balance");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setTransactions(data.transactions || []);
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

  // Build chart data from transactions
  const chartData = transactions
    .slice()
    .reverse()
    .reduce((acc: { date: string; pnl: number }[], tx) => {
      const date = new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const lastVal = acc.length > 0 ? acc[acc.length - 1].pnl : 0;
      acc.push({ date, pnl: lastVal + tx.amount });
      return acc;
    }, []);

  const profitTxs = transactions.filter((t) => t.type === "COPY_PROFIT");
  const lossTxs = transactions.filter((t) => t.type === "COPY_LOSS");
  const todayStr = new Date().toDateString();
  const todayProfit = transactions
    .filter((t) => new Date(t.createdAt).toDateString() === todayStr && (t.type === "COPY_PROFIT" || t.type === "COPY_LOSS"))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalGains = profitTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalLosses = Math.abs(lossTxs.reduce((sum, t) => sum + t.amount, 0));

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="space-y-2 mb-6">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl mb-6" />
        <StatGridSkeleton count={4} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel p-4 space-y-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-7 w-28" />
            </div>
          ))}
        </div>
        <ChartSkeleton height={280} />
        <TableSkeleton rows={5} cols={3} />
      </div>
    );
  }

  return (
    <div className="dashboard-section">
      {/* ── Header ── */}
      <motion.div
        {...staggerChildren(0)}
      >
        <h2 className="text-lg font-semibold text-text-primary">Analytics</h2>
        <p className="text-sm text-text-tertiary mt-0.5">Performance overview and account insights</p>
      </motion.div>

      {/* ── Hero Account Card ── */}
      <motion.div
        {...staggerChildren(0.04)}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-5 md:p-7 text-white shadow-2xl ring-1 ring-white/[0.08]"
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-white/70 text-xs font-medium tracking-wide uppercase mb-1">Account Value</p>
              <p className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight">
                {formatCurrency(balance?.totalBalance || 0)}
              </p>
              {(balance?.totalProfit || 0) !== 0 && (
                <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  (balance?.totalProfit || 0) >= 0 ? "bg-white/20 text-white" : "bg-red-500/30 text-red-100"
                }`}>
                  {(balance?.totalProfit || 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {(balance?.totalProfit || 0) >= 0 ? "+" : ""}{formatCurrency(balance?.totalProfit || 0)} all time
                </div>
              )}
            </div>
            <div className="flex gap-4 md:gap-6">
              <div className="text-center">
                <p className="text-white/60 text-2xs font-medium uppercase tracking-wider">Today</p>
                <p className={`text-lg font-bold tabular-nums mt-0.5 ${todayProfit >= 0 ? "text-white" : "text-red-200"}`}>
                  {todayProfit >= 0 ? "+" : ""}{formatCurrency(todayProfit)}
                </p>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <p className="text-white/60 text-2xs font-medium uppercase tracking-wider">Gains</p>
                <p className="text-lg font-bold tabular-nums mt-0.5 text-emerald-200">+{formatCurrency(totalGains)}</p>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <p className="text-white/60 text-2xs font-medium uppercase tracking-wider">Losses</p>
                <p className="text-lg font-bold tabular-nums mt-0.5 text-red-200">-{formatCurrency(totalLosses)}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="stat-grid">
        <StatCard
          title="Total Balance"
          value={formatCurrency(balance?.totalBalance || 0)}
          icon={DollarSign}
          iconColor="text-brand"
          delay={0.08}
        />
        <StatCard
          title="Profit Today"
          value={formatCurrency(todayProfit)}
          change={todayProfit >= 0 ? "Positive" : "Negative"}
          changeType={todayProfit >= 0 ? "positive" : "negative"}
          icon={Activity}
          iconColor="text-info"
          delay={0.1}
        />
        <StatCard
          title="Total Gains"
          value={formatCurrency(totalGains)}
          icon={TrendingUp}
          iconColor="text-success"
          delay={0.12}
        />
        <StatCard
          title="Total Losses"
          value={formatCurrency(totalLosses)}
          icon={TrendingDown}
          iconColor="text-danger"
          delay={0.14}
        />
      </div>

      {/* Balance breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {[
          { label: "Available", icon: DollarSign, iconColor: "text-success", iconBg: "bg-success/10", value: balance?.availableBalance || 0 },
          { label: "Allocated", icon: PiggyBank, iconColor: "text-brand", iconBg: "bg-brand/10", value: balance?.allocatedBalance || 0 },
          { label: "Net P&L", icon: BarChart3, iconColor: "text-info", iconBg: "bg-info/10", value: balance?.totalProfit || 0, colored: true },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            {...staggerChildren(0.16 + idx * 0.04)}
            className="glass-panel p-4"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`p-1.5 rounded-lg ${item.iconBg}`}>
                <item.icon className={`w-4 h-4 ${item.iconColor}`} />
              </div>
              <span className="text-xs font-medium text-text-tertiary">{item.label}</span>
            </div>
            <p className={`text-xl font-bold number-value ${item.colored ? ((item.value) >= 0 ? "text-success" : "text-danger") : "text-text-primary"}`}>
              {formatCurrency(item.value)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Performance Chart */}
      <motion.div
        {...slideUp(0.2)}
        className="glass-panel overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand/10">
              <Zap className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Performance Chart</h3>
              <p className="text-2xs text-text-tertiary mt-0.5">Cumulative balance over time</p>
            </div>
          </div>
          {chartData.length > 1 && (
            <span className={`text-sm font-bold tabular-nums ${(chartData[chartData.length - 1]?.pnl ?? 0) >= 0 ? "text-success" : "text-danger"}`}>
              {(chartData[chartData.length - 1]?.pnl ?? 0) >= 0 ? "+" : ""}{formatCurrency(chartData[chartData.length - 1]?.pnl ?? 0)}
            </span>
          )}
        </div>
        <div className="px-4 pb-4">
          {chartData.length > 1 ? (
            <PnlChart data={chartData} height={280} showGrid />
          ) : (
            <div className="h-[280px] flex flex-col items-center justify-center gap-3">
              <div className="p-5 rounded-3xl bg-gradient-to-br from-surface-2 to-surface-3 border border-border shadow-sm">
                <BarChart3 className="w-10 h-10 text-text-tertiary/40" />
              </div>
              <div className="text-center">
                <p className="text-sm text-text-tertiary">Not enough data to display chart</p>
                <p className="text-xs text-text-tertiary/70 mt-1 max-w-[280px]">Complete a few transactions to see your performance trend</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Transaction History */}
      <motion.div
        {...slideUp(0.25)}
        className="glass-panel overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-brand/10">
              <Activity className="w-3.5 h-3.5 text-brand" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">Recent Transactions</h3>
            {transactions.length > 0 && (
              <span className="text-2xs px-2 py-0.5 rounded-full bg-surface-3 text-text-tertiary font-medium">
                {transactions.length}
              </span>
            )}
          </div>
        </div>

        {transactions.length > 0 ? (
          <div>
            {groupByDate(transactions).map((group) => (
              <div key={group.label}>
                <div className="sticky top-0 z-10 px-5 py-2 bg-surface-1 border-b border-border">
                  <p className="text-2xs font-semibold text-text-tertiary uppercase tracking-wider">{group.label}</p>
                </div>
                <div className="divide-y divide-border">
                  {group.transactions.map((tx) => {
                    const Icon = txIcon(tx.type);
                    return (
                      <div key={tx.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-2/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${txBg(tx.type)}`}>
                            <Icon className={`w-4 h-4 ${txColor(tx.type)}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">{txTypeLabel(tx.type)}</p>
                            <p className="text-2xs text-text-tertiary mt-0.5">
                              {tx.description || new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm font-semibold tabular-nums ${tx.amount >= 0 ? "text-success" : "text-danger"}`}>
                          {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-surface-2 to-surface-3 border border-border shadow-sm">
              <DollarSign className="w-10 h-10 text-text-tertiary/40" />
            </div>
            <div className="text-center">
              <p className="text-sm text-text-tertiary">No transactions yet</p>
              <p className="text-xs text-text-tertiary/70 mt-1 max-w-[300px]">Your deposits, withdrawals, and trading activity will appear here</p>
            </div>
            <Link href="/dashboard/payment-methods" className="btn-primary btn-sm mt-4">
              Make a Deposit
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
