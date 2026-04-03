"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Check,
  X,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDate, shortenAddress } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WithdrawalRow {
  id: string;
  amount: number;
  walletAddress: string;
  network: string;
  status: string;
  createdAt: string;
  txHash: string | null;
  reviewedAt: string | null;
  user: { name: string; email: string };
}

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const STATUS_STYLES: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  PENDING: { icon: Clock, color: "text-warning bg-warning/10" },
  APPROVED: { icon: CheckCircle2, color: "text-success bg-success/10" },
  REJECTED: { icon: XCircle, color: "text-danger bg-danger/10" },
};

const FILTER_TABS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

const PAGE_SIZE = 15;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  /* Filter & pagination */
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  /* Confirm dialog state */
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    variant: "danger" | "warning";
    title: string;
    message: string;
    confirmLabel: string;
    withdrawalId: string;
    action: "APPROVED" | "REJECTED";
  }>({
    isOpen: false,
    variant: "warning",
    title: "",
    message: "",
    confirmLabel: "",
    withdrawalId: "",
    action: "APPROVED",
  });

  /* Payout modal state */
  const [payoutModal, setPayoutModal] = useState<{
    isOpen: boolean;
    withdrawalId: string;
    txHashInput: string;
    submitting: boolean;
  }>({
    isOpen: false,
    withdrawalId: "",
    txHashInput: "",
    submitting: false,
  });

  /* Copied tx hash feedback */
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin?view=withdrawals");
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(data.withdrawals || []);
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

  /* ---------------------------------------------------------------- */
  /*  Derived data                                                     */
  /* ---------------------------------------------------------------- */

  const filtered = useMemo(
    () =>
      statusFilter === "ALL"
        ? withdrawals
        : withdrawals.filter((w) => w.status === statusFilter),
    [withdrawals, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Reset to page 1 whenever filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const pendingCount = withdrawals.filter((w) => w.status === "PENDING").length;
  const totalPending = withdrawals
    .filter((w) => w.status === "PENDING")
    .reduce((sum, w) => sum + w.amount, 0);
  const totalApproved = withdrawals
    .filter((w) => w.status === "APPROVED")
    .reduce((sum, w) => sum + w.amount, 0);

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const openConfirm = (w: WithdrawalRow, action: "APPROVED" | "REJECTED") => {
    const isReject = action === "REJECTED";
    setConfirmDialog({
      isOpen: true,
      variant: isReject ? "danger" : "warning",
      title: isReject ? "Reject Withdrawal" : "Approve Withdrawal",
      message: isReject
        ? `Are you sure you want to reject the ${formatCurrency(w.amount)} withdrawal request from ${w.user.name}? This action cannot be undone.`
        : `Are you sure you want to approve the ${formatCurrency(w.amount)} withdrawal request from ${w.user.name}?`,
      confirmLabel: isReject ? "Reject" : "Approve",
      withdrawalId: w.id,
      action,
    });
  };

  const handleReview = async () => {
    const { withdrawalId, action } = confirmDialog;
    setProcessing(withdrawalId);
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    try {
      await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reviewWithdrawal", withdrawalId, status: action }),
      });
      fetchData();
    } catch {
      // silent
    } finally {
      setProcessing(null);
    }
  };

  const handlePayoutSubmit = async () => {
    const { withdrawalId, txHashInput } = payoutModal;
    if (!txHashInput.trim()) return;

    setPayoutModal((prev) => ({ ...prev, submitting: true }));
    try {
      await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "payoutWithdrawal", withdrawalId, txHash: txHashInput.trim() }),
      });
      setPayoutModal({ isOpen: false, withdrawalId: "", txHashInput: "", submitting: false });
      fetchData();
    } catch {
      setPayoutModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const copyTxHash = async (hash: string, id: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                    */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <>
      <div className="dashboard-section">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-lg font-semibold text-text-primary">Withdrawal Approvals</h2>
          <p className="text-sm text-text-tertiary mt-0.5">
            Review and approve withdrawal requests
          </p>
        </motion.div>

        {/* Stat cards */}
        <div className="stat-grid-3">
          <StatCard
            title="Pending Requests"
            value={String(pendingCount)}
            icon={Clock}
            iconColor="text-warning"
            delay={0}
          />
          <StatCard
            title="Pending Volume"
            value={formatCurrency(totalPending)}
            icon={ArrowUpRight}
            iconColor="text-danger"
            delay={0.05}
          />
          <StatCard
            title="Total Approved"
            value={formatCurrency(totalApproved)}
            icon={CheckCircle2}
            iconColor="text-success"
            delay={0.1}
          />
        </div>

        {/* Filter tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="flex items-center gap-1 p-1 rounded-lg bg-surface-1 border border-border w-fit"
        >
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                statusFilter === tab.value
                  ? "bg-surface-3 text-text-primary shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {tab.label}
              {tab.value !== "ALL" && (
                <span className="ml-1.5 text-2xs opacity-60">
                  {withdrawals.filter((w) =>
                    tab.value === "ALL" ? true : w.status === tab.value,
                  ).length}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Withdrawals table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-panel overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-1/30">
                  <th className="table-header px-4 py-2.5 text-left">User</th>
                  <th className="table-header px-4 py-2.5 text-right">Amount</th>
                  <th className="table-header px-4 py-2.5 text-left">Wallet</th>
                  <th className="table-header px-4 py-2.5 text-left">Network</th>
                  <th className="table-header px-4 py-2.5 text-center">Status</th>
                  <th className="table-header px-4 py-2.5 text-right">Date</th>
                  <th className="table-header px-4 py-2.5 text-center">Payout</th>
                  <th className="table-header px-4 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((w) => {
                  const statusStyle = STATUS_STYLES[w.status] || STATUS_STYLES.PENDING;
                  const StatusIcon = statusStyle.icon;
                  return (
                    <tr key={w.id} className="table-row">
                      {/* User */}
                      <td className="table-cell">
                        <p className="text-sm text-text-primary">{w.user.name}</p>
                        <p className="text-2xs text-text-tertiary">{w.user.email}</p>
                      </td>

                      {/* Amount */}
                      <td className="table-cell text-right text-sm font-medium text-danger">
                        -{formatCurrency(w.amount)}
                      </td>

                      {/* Wallet */}
                      <td className="table-cell">
                        <code className="text-xs font-mono text-text-secondary">
                          {shortenAddress(w.walletAddress)}
                        </code>
                      </td>

                      {/* Network */}
                      <td className="table-cell text-xs text-text-secondary">{w.network}</td>

                      {/* Status */}
                      <td className="table-cell text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusStyle.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {w.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="table-cell text-right">
                        <p className="text-xs text-text-tertiary">{formatDate(w.createdAt)}</p>
                        {w.reviewedAt && (
                          <p className="text-2xs text-text-tertiary/60 mt-0.5">
                            Reviewed {formatDate(w.reviewedAt)}
                          </p>
                        )}
                      </td>

                      {/* Payout (tx hash) */}
                      <td className="table-cell text-center">
                        {w.status === "APPROVED" && !w.txHash && (
                          <button
                            onClick={() =>
                              setPayoutModal({
                                isOpen: true,
                                withdrawalId: w.id,
                                txHashInput: "",
                                submitting: false,
                              })
                            }
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Set Payout
                          </button>
                        )}
                        {w.txHash && (
                          <div className="inline-flex items-center gap-1.5">
                            <code className="text-2xs font-mono text-text-secondary bg-surface-2 px-2 py-1 rounded">
                              {shortenAddress(w.txHash)}
                            </code>
                            <button
                              onClick={() => copyTxHash(w.txHash!, w.id)}
                              className="p-1 rounded hover:bg-surface-3 transition-colors text-text-tertiary hover:text-text-primary"
                              title="Copy tx hash"
                            >
                              {copiedId === w.id ? (
                                <CheckCircle2 className="w-3 h-3 text-success" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                        {w.status !== "APPROVED" && !w.txHash && (
                          <span className="text-2xs text-text-tertiary">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="table-cell text-center">
                        {w.status === "PENDING" ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openConfirm(w, "APPROVED")}
                              disabled={processing === w.id}
                              className="p-1.5 rounded-md hover:bg-success/10 transition-colors text-success"
                              title="Approve"
                            >
                              {processing === w.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => openConfirm(w, "REJECTED")}
                              disabled={processing === w.id}
                              className="p-1.5 rounded-md hover:bg-danger/10 transition-colors text-danger"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-2xs text-text-tertiary">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Empty state */}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-sm text-text-tertiary">
                      No withdrawal requests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-text-tertiary">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-text-secondary px-2 tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/*  Confirm Dialog                                               */}
      {/* ------------------------------------------------------------ */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        loading={processing !== null}
        onConfirm={handleReview}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* ------------------------------------------------------------ */}
      {/*  Payout Modal                                                 */}
      {/* ------------------------------------------------------------ */}
      <Modal
        isOpen={payoutModal.isOpen}
        onClose={() =>
          setPayoutModal({ isOpen: false, withdrawalId: "", txHashInput: "", submitting: false })
        }
        title="Set Payout Transaction"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Enter the blockchain transaction hash to record the payout for this withdrawal.
          </p>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Transaction Hash
            </label>
            <input
              type="text"
              value={payoutModal.txHashInput}
              onChange={(e) =>
                setPayoutModal((prev) => ({ ...prev, txHashInput: e.target.value }))
              }
              placeholder="0x..."
              className="input-field w-full font-mono text-sm"
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() =>
                setPayoutModal({
                  isOpen: false,
                  withdrawalId: "",
                  txHashInput: "",
                  submitting: false,
                })
              }
              disabled={payoutModal.submitting}
              className="btn-secondary flex-1 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handlePayoutSubmit}
              disabled={!payoutModal.txHashInput.trim() || payoutModal.submitting}
              className="btn-primary flex-1 text-sm"
            >
              {payoutModal.submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Payout"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
