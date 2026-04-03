"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  txHash: string | null;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  DEPOSIT: { icon: ArrowDownLeft, color: "text-success bg-success/10", label: "Deposit" },
  WITHDRAWAL: { icon: ArrowUpRight, color: "text-danger bg-danger/10", label: "Withdrawal" },
  COPY_PROFIT: { icon: TrendingUp, color: "text-success bg-success/10", label: "Copy Profit" },
  COPY_LOSS: { icon: TrendingDown, color: "text-danger bg-danger/10", label: "Copy Loss" },
  ALLOCATION: { icon: ArrowUpRight, color: "text-brand bg-brand/10", label: "Allocated" },
  DEALLOCATION: { icon: ArrowDownLeft, color: "text-info bg-info/10", label: "Deallocated" },
};

const FILTER_OPTIONS = ["ALL", "DEPOSIT", "WITHDRAWAL", "COPY_PROFIT", "COPY_LOSS", "ALLOCATION"];

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/balance");
      if (res.ok) {
        const data = await res.json();
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

  const filtered = filter === "ALL"
    ? transactions
    : transactions.filter((t) => t.type === filter);

  if (loading) {
    return (
      <>
        <div className="dashboard-section">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="dashboard-section">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Transaction History</h2>
            <p className="text-sm text-text-tertiary mt-0.5">Complete record of all account activity</p>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className="flex items-center gap-1.5 flex-wrap"
        >
          <Filter className="w-3.5 h-3.5 text-text-tertiary" />
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2.5 py-1.5 rounded-md transition-colors ${
                filter === f
                  ? "bg-brand/10 text-brand"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-surface-3"
              }`}
            >
              {f === "ALL" ? "All" : f.replace("_", " ")}
            </button>
          ))}
        </motion.div>

        {/* Transactions List */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-2"
        >
          {filtered.length > 0 ? (
            filtered.map((tx, i) => {
              const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.DEPOSIT;
              const Icon = config.icon;

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.02 }}
                  className="glass-panel p-4 flex items-center gap-4"
                >
                  <div className={`p-2 rounded-lg shrink-0 ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text-primary">{config.label}</p>
                      <span className={`text-sm font-semibold ${
                        tx.amount >= 0 ? "text-success" : "text-danger"
                      }`}>
                        {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-2xs text-text-tertiary truncate">
                        {tx.description || "—"}
                      </p>
                      <div className="flex items-center gap-1 text-2xs text-text-tertiary shrink-0">
                        <Clock className="w-3 h-3" />
                        {new Date(tx.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="glass-panel py-12 flex flex-col items-center gap-3">
              <div className="p-5 rounded-3xl bg-gradient-to-br from-surface-2 to-surface-3 border border-border shadow-sm">
                <Clock className="w-10 h-10 text-text-tertiary/40" />
              </div>
              <div className="text-center">
                <p className="text-sm text-text-tertiary">No transactions found</p>
                <p className="text-xs text-text-tertiary/70 mt-1 max-w-[300px]">Your deposits, withdrawals, and trading activity will appear here</p>
              </div>
              <Link href="/dashboard/payment-methods" className="btn-primary btn-sm mt-4">
                Make a Deposit
              </Link>
            </div>
          )}
        </motion.div>

        <div className="text-center">
          <p className="text-2xs text-text-tertiary">
            Showing {filtered.length} of {transactions.length} transactions
          </p>
        </div>
      </div>
    </>
  );
}
