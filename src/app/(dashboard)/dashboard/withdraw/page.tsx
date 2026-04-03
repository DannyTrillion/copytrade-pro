"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
  Shield,
  AlertTriangle,
  Info,
  DollarSign,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { StatGridSkeleton, TableSkeleton } from "@/components/ui/chart-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollableTable } from "@/components/ui/scrollable-table";

interface WithdrawalRequest {
  id: string;
  amount: number;
  walletAddress: string;
  network: string;
  status: string;
  createdAt: string;
}

const NETWORKS = [
  "ERC20 (Ethereum)",
  "BEP20 (BSC)",
  "TRC20 (TRON)",
  "Solana",
  "Polygon",
  "Arbitrum",
  "Bitcoin",
];

const STATUS_STYLES: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  PENDING: { icon: Clock, color: "text-warning bg-warning/10 border-warning/20", label: "Pending" },
  APPROVED: { icon: CheckCircle2, color: "text-success bg-success/10 border-success/20", label: "Approved" },
  REJECTED: { icon: XCircle, color: "text-danger bg-danger/10 border-danger/20", label: "Rejected" },
};

export default function WithdrawPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [network, setNetwork] = useState(NETWORKS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/withdrawals");
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(data.withdrawals || []);
        setAvailableBalance(data.availableBalance || 0);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const executeWithdrawal = async () => {
    setShowConfirm(false);
    setSubmitting(true);

    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          walletAddress,
          network,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Withdrawal request submitted! Awaiting admin approval.");
        setAmount("");
        setWalletAddress("");
        fetchData();
      } else {
        toast.error(data.error || "Failed to submit");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = withdrawals.filter((w) => w.status === "PENDING").length;
  const totalWithdrawn = withdrawals.filter((w) => w.status === "APPROVED").reduce((sum, w) => sum + w.amount, 0);

  if (loading) {
    return (
      <div className="dashboard-section space-y-6">
        <StatGridSkeleton count={3} />
        <TableSkeleton />
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-section">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-lg font-semibold text-text-primary">Withdraw Funds</h2>
          <p className="text-sm text-text-tertiary mt-0.5">Request a withdrawal to your wallet</p>
        </motion.div>

        {/* ── Hero Balance Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600 p-5 md:p-7 text-white shadow-lg"
        >
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="wd-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M12 0v24M0 12h24" stroke="currentColor" strokeWidth="0.4" fill="none"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#wd-grid)"/>
          </svg>
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-white/70 text-xs font-medium tracking-wide uppercase mb-1">Available to Withdraw</p>
              <p className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight">{formatCurrency(availableBalance)}</p>
            </div>
            <div className="flex gap-4 md:gap-6">
              <div className="text-center">
                <p className="text-white/60 text-2xs font-medium uppercase tracking-wider">Pending</p>
                <p className="text-lg font-bold tabular-nums mt-0.5">{pendingCount}</p>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <p className="text-white/60 text-2xs font-medium uppercase tracking-wider">Total Withdrawn</p>
                <p className="text-lg font-bold tabular-nums mt-0.5">{formatCurrency(totalWithdrawn)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Withdrawal Form */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-2 glass-panel p-5 md:p-6"
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-brand/10">
                <ArrowUpRight className="w-4 h-4 text-brand" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">New Withdrawal</h3>
                <p className="text-2xs text-text-tertiary">Fill in the details below</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-tertiary">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field text-xl font-bold pl-8"
                    placeholder="0.00"
                    min="1"
                    max={availableBalance}
                    step="0.01"
                    required
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-2xs text-text-tertiary">
                    Available: <span className="text-text-primary font-semibold">{formatCurrency(availableBalance)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setAmount(String(availableBalance))}
                    className="text-xs text-brand hover:text-brand-dark font-semibold transition-colors px-2 py-0.5 rounded-md hover:bg-brand/5"
                  >
                    Max
                  </button>
                </div>
                {/* Quick amounts */}
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {[50, 100, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(Math.min(preset, availableBalance)))}
                      disabled={availableBalance < preset}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-30 ${
                        amount === String(preset)
                          ? "border-brand bg-brand/10 text-brand shadow-sm"
                          : "border-border bg-surface-1 text-text-tertiary hover:text-text-secondary hover:border-border-light"
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wallet Address */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Wallet Address</label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="input-field pl-10 font-mono text-xs"
                    placeholder="0x..."
                    required
                    minLength={10}
                  />
                </div>
              </div>

              {/* Network */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Network</label>
                <div className="flex flex-wrap gap-2">
                  {NETWORKS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNetwork(n)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                        network === n
                          ? "border-brand bg-brand/10 text-brand shadow-sm"
                          : "border-border bg-surface-1 text-text-secondary hover:border-border-light hover:text-text-primary"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-warning/5 border border-warning/15">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-2xs text-text-tertiary">
                  Double-check the wallet address and network. Sending to an incorrect address or wrong network may result in <span className="text-warning font-semibold">permanent loss</span> of funds.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !amount || !walletAddress || parseFloat(amount) > availableBalance}
                className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4" />
                    Request Withdrawal {amount && parseFloat(amount) > 0 ? `— ${formatCurrency(parseFloat(amount))}` : ""}
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Info Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Processing Info */}
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-lg bg-info/10">
                  <Info className="w-4 h-4 text-info" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">Processing Info</h3>
              </div>
              <div className="space-y-3 text-xs">
                {[
                  { label: "Admin Approval", value: "Required" },
                  { label: "Processing Time", value: "1–24 hours" },
                  { label: "Max Pending", value: "3 requests" },
                  { label: "Min Withdrawal", value: "$1.00" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-0.5">
                    <span className="text-text-tertiary">{row.label}</span>
                    <span className="text-text-primary font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Note */}
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Shield className="w-4 h-4 text-success" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">Security</h3>
              </div>
              <div className="space-y-2.5 text-2xs text-text-tertiary">
                <p>All withdrawals are manually reviewed by our team for security.</p>
                <p>Large withdrawals may require additional identity verification.</p>
                <p>Supported networks: ERC20, BEP20, TRC20, Solana, Polygon, Arbitrum, Bitcoin.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Withdrawal History */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel overflow-hidden"
        >
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-brand/10">
                <DollarSign className="w-3.5 h-3.5 text-brand" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Withdrawal History</h3>
              {withdrawals.length > 0 && (
                <span className="text-2xs px-2 py-0.5 rounded-full bg-surface-3 text-text-tertiary font-medium">
                  {withdrawals.length}
                </span>
              )}
            </div>
          </div>
          <ScrollableTable>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2/50">
                  <th className="table-header px-4 py-2.5 text-left">Address</th>
                  <th className="table-header px-4 py-2.5 text-left">Network</th>
                  <th className="table-header px-4 py-2.5 text-right">Amount</th>
                  <th className="table-header px-4 py-2.5 text-center">Status</th>
                  <th className="table-header px-4 py-2.5 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.length > 0 ? (
                  withdrawals.map((w) => {
                    const statusStyle = STATUS_STYLES[w.status] || STATUS_STYLES.PENDING;
                    const StatusIcon = statusStyle.icon;
                    return (
                      <tr key={w.id} className="table-row">
                        <td className="table-cell">
                          <code className="text-xs font-mono text-text-secondary bg-surface-2 px-2 py-0.5 rounded">
                            {w.walletAddress.slice(0, 8)}...{w.walletAddress.slice(-6)}
                          </code>
                        </td>
                        <td className="table-cell">
                          <span className="text-xs text-text-secondary font-medium">{w.network}</span>
                        </td>
                        <td className="table-cell text-right text-sm font-semibold text-text-primary tabular-nums">
                          {formatCurrency(w.amount)}
                        </td>
                        <td className="table-cell text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${statusStyle.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusStyle.label}
                          </span>
                        </td>
                        <td className="table-cell text-right text-xs text-text-tertiary">
                          {formatDate(w.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-2xl bg-surface-2 border border-border">
                          <ArrowUpRight className="w-8 h-8 text-text-tertiary/40" />
                        </div>
                        <p className="text-sm text-text-tertiary">No withdrawal requests yet</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollableTable>
        </motion.div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onCancel={() => setShowConfirm(false)}
        variant="warning"
        title="Confirm Withdrawal"
        message={`Withdraw ${formatCurrency(parseFloat(amount) || 0)} to ${walletAddress.slice(0, 10)}...${walletAddress.slice(-6)} on ${network}?`}
        confirmLabel="Withdraw"
        onConfirm={async () => {
          setShowConfirm(false);
          await executeWithdrawal();
        }}
      />
    </>
  );
}
