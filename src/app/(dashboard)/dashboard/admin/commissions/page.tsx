"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowRightLeft,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PnlChart } from "@/components/charts/pnl-chart";
import { formatCurrency } from "@/lib/utils";

interface BalanceRow {
  id: string;
  totalBalance: number;
  availableBalance: number;
  allocatedBalance: number;
  totalProfit: number;
  user: { name: string; email: string; role: string };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

interface AdminStats {
  totalPlatformBalance: number;
  totalAllocated: number;
  totalProfit: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalUsers: number;
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
    ALLOCATION: "Allocation",
    DEALLOCATION: "Deallocation",
  };
  return map[type] || type;
}

function txTypeColor(type: string): string {
  if (type === "DEPOSIT" || type === "COPY_PROFIT") return "text-success";
  if (type === "WITHDRAWAL" || type === "COPY_LOSS") return "text-danger";
  return "text-brand";
}

export default function AdminCommissionsPage() {
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [balancesRes, statsRes] = await Promise.all([
        fetch("/api/admin?view=balances"),
        fetch("/api/admin?view=stats"),
      ]);

      if (balancesRes.ok) {
        const data = await balancesRes.json();
        setBalances(data.balances || []);
        setTransactions(data.transactions || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build deposit/profit chart from transactions
  const chartData = (() => {
    const profitTxs = transactions.filter(
      (t) => t.type === "COPY_PROFIT" || t.type === "COPY_LOSS" || t.type === "DEPOSIT"
    );
    if (profitTxs.length > 0) {
      return profitTxs.reverse().reduce(
        (acc, t) => {
          const cumPnl = (acc.length > 0 ? acc[acc.length - 1].pnl : 0) + t.amount;
          acc.push({
            date: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            pnl: cumPnl,
          });
          return acc;
        },
        [] as { date: string; pnl: number }[]
      );
    }
    return Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      pnl: 0,
    }));
  })();

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="h-8 w-64 bg-surface-2 rounded animate-pulse" />
        <div className="stat-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-2 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-section">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-text-primary">Platform Financials</h2>
          <p className="text-sm text-text-tertiary mt-0.5">Track platform balances, deposits, and profit flow</p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="stat-grid">
        <StatCard
          title="Total Platform Balance"
          value={formatCurrency(stats?.totalPlatformBalance ?? 0)}
          icon={DollarSign}
          iconColor="text-success"
          delay={0}
        />
        <StatCard
          title="Total Allocated"
          value={formatCurrency(stats?.totalAllocated ?? 0)}
          icon={ArrowRightLeft}
          iconColor="text-brand"
          delay={0.05}
        />
        <StatCard
          title="Total Deposits"
          value={formatCurrency(stats?.totalDeposits ?? 0)}
          icon={PiggyBank}
          iconColor="text-info"
          delay={0.1}
        />
        <StatCard
          title="Total Profit Generated"
          value={formatCurrency(stats?.totalProfit ?? 0)}
          changeType={(stats?.totalProfit ?? 0) >= 0 ? "positive" : "negative"}
          icon={TrendingUp}
          iconColor={(stats?.totalProfit ?? 0) >= 0 ? "text-success" : "text-danger"}
          delay={0.15}
        />
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-4"
      >
        <h3 className="text-sm font-medium text-text-primary mb-3">Platform Cash Flow</h3>
        <PnlChart data={chartData} height={220} showGrid />
      </motion.div>

      {/* User Balances Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-panel overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-medium text-text-primary">User Balances</h3>
          </div>
          <span className="text-xs text-text-tertiary">{balances.length} accounts</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-1/30">
                <th className="table-header px-4 py-2.5 text-left">User</th>
                <th className="table-header px-4 py-2.5 text-left">Role</th>
                <th className="table-header px-4 py-2.5 text-right">Total Balance</th>
                <th className="table-header px-4 py-2.5 text-right">Available</th>
                <th className="table-header px-4 py-2.5 text-right">Allocated</th>
                <th className="table-header px-4 py-2.5 text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {balances.length > 0 ? (
                balances.map((bal, i) => (
                  <motion.tr
                    key={bal.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.02 }}
                    className="table-row"
                  >
                    <td className="table-cell">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{bal.user.name}</p>
                        <p className="text-2xs text-text-tertiary">{bal.user.email}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          bal.user.role === "ADMIN"
                            ? "bg-danger/10 text-danger border-danger/20"
                            : bal.user.role === "MASTER_TRADER"
                            ? "bg-info/10 text-info border-info/20"
                            : "bg-surface-3 text-text-secondary border-border"
                        }`}
                      >
                        {bal.user.role === "MASTER_TRADER" ? "TRADER" : bal.user.role}
                      </span>
                    </td>
                    <td className="table-cell text-right font-medium">
                      {formatCurrency(bal.totalBalance)}
                    </td>
                    <td className="table-cell text-right text-text-secondary">
                      {formatCurrency(bal.availableBalance)}
                    </td>
                    <td className="table-cell text-right text-text-secondary">
                      {formatCurrency(bal.allocatedBalance)}
                    </td>
                    <td className="table-cell text-right">
                      <span className={bal.totalProfit >= 0 ? "text-success" : "text-danger"}>
                        {bal.totalProfit >= 0 ? "+" : ""}
                        {formatCurrency(bal.totalProfit)}
                      </span>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-text-tertiary">
                    No user balances yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-text-primary">Recent Platform Transactions</h3>
        </div>
        <div className="divide-y divide-border">
          {transactions.length > 0 ? (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-surface-1/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-lg ${
                      tx.type === "DEPOSIT" || tx.type === "COPY_PROFIT"
                        ? "bg-success/10"
                        : tx.type === "WITHDRAWAL" || tx.type === "COPY_LOSS"
                        ? "bg-danger/10"
                        : "bg-brand/10"
                    }`}
                  >
                    {tx.type === "DEPOSIT" || tx.type === "COPY_PROFIT" ? (
                      <TrendingUp className="w-3.5 h-3.5 text-success" />
                    ) : tx.type === "WITHDRAWAL" || tx.type === "COPY_LOSS" ? (
                      <TrendingDown className="w-3.5 h-3.5 text-danger" />
                    ) : (
                      <ArrowRightLeft className="w-3.5 h-3.5 text-brand" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{txTypeLabel(tx.type)}</p>
                      <span className="text-2xs text-text-tertiary">by {tx.user.name}</span>
                    </div>
                    {tx.description && (
                      <p className="text-2xs text-text-tertiary">{tx.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${txTypeColor(tx.type)}`}>
                    {tx.amount >= 0 ? "+" : ""}
                    {formatCurrency(tx.amount)}
                  </p>
                  <p className="text-2xs text-text-tertiary">{timeAgo(tx.createdAt)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-sm text-text-tertiary">
              No transactions on the platform yet
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
