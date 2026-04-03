"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Clock,
  Wallet,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Percent,
  UserCheck,
  MessageSquare,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { StatGridSkeleton, TableSkeleton } from "@/components/ui/chart-skeleton";
import { formatDate, shortenAddress } from "@/lib/utils";
import Link from "next/link";
import { slideUp } from "@/lib/animations";

// ─── Types ───────────────────────────────────────────────────────────

interface CopyRequest {
  id: string;
  userId: string;
  traderId: string;
  traderName: string;
  riskPercent: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  message: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    wallet: { address: string; isConnected: boolean } | null;
  };
}

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

// ─── Constants ───────────────────────────────────────────────────────

const PAGE_SIZE = 15;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "CANCELLED", label: "Cancelled" },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── Component ───────────────────────────────────────────────────────

export default function TraderFollowersPage() {
  const [requests, setRequests] = useState<CopyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Rejection confirm dialog
  const [rejectTarget, setRejectTarget] = useState<CopyRequest | null>(null);

  // ─── Data Fetching ───────────────────────────────────────────────

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/copy-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Failed to fetch copy requests:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ─── Actions ─────────────────────────────────────────────────────

  const handleAction = useCallback(
    async (requestId: string, action: "APPROVED" | "REJECTED") => {
      setProcessingId(requestId);
      try {
        const res = await fetch("/api/copy-requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId, action }),
        });
        if (res.ok) {
          setRequests((prev) =>
            prev.map((r) =>
              r.id === requestId
                ? { ...r, status: action, reviewedAt: new Date().toISOString() }
                : r
            )
          );
        }
      } catch (err) {
        console.error("Failed to process request:", err);
      } finally {
        setProcessingId(null);
        setRejectTarget(null);
      }
    },
    []
  );

  // ─── Derived Data ────────────────────────────────────────────────

  const counts = useMemo(() => {
    const approved = requests.filter((r) => r.status === "APPROVED");
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === "PENDING").length,
      approved: approved.length,
      rejected: requests.filter((r) => r.status === "REJECTED").length,
      totalAllocation: approved.reduce((sum, r) => sum + r.riskPercent, 0),
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    let result = requests;

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.user.name.toLowerCase().includes(q) ||
          r.user.email.toLowerCase().includes(q)
      );
    }

    return result;
  }, [requests, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const tabCounts: Record<StatusFilter, number> = {
    ALL: counts.total,
    PENDING: counts.pending,
    APPROVED: counts.approved,
    REJECTED: counts.rejected,
    CANCELLED: requests.filter((r) => r.status === "CANCELLED").length,
  };

  // ─── Loading State ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Skeleton className="h-8 w-36 rounded-full" />
        </div>
        <StatGridSkeleton count={3} />
        <div className="flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
        <TableSkeleton rows={5} cols={6} />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="dashboard-section">
      {/* ═══ Header ═══ */}
      <motion.div
        {...slideUp(0)}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-text-primary">
            Followers Management
          </h2>
          <p className="text-2xs text-text-tertiary mt-0.5">
            Review copy requests and manage your followers
          </p>
        </div>
        {counts.pending > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20">
            <Clock className="w-3 h-3 text-warning" />
            <span className="text-xs font-medium text-warning">
              {counts.pending} pending review
            </span>
          </div>
        )}
      </motion.div>

      {/* ═══ Stats Row ═══ */}
      <div className="stat-grid-3">
        <StatCard
          title="Total Followers"
          value={String(counts.approved)}
          icon={UserCheck}
          iconColor="text-success"
          delay={0}
        />
        <StatCard
          title="Pending Requests"
          value={String(counts.pending)}
          icon={Clock}
          iconColor="text-warning"
          delay={0.05}
        />
        <StatCard
          title="Total Allocation"
          value={`${counts.totalAllocation}%`}
          icon={Percent}
          iconColor="text-brand"
          delay={0.1}
        />
      </div>

      {/* ═══ Filters ═══ */}
      <motion.div
        {...slideUp(0.12)}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-1 border border-border">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`
                relative px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                ${
                  statusFilter === tab.key
                    ? "bg-surface-3 text-text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-secondary"
                }
              `}
            >
              {tab.label}
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-2xs ${
                  statusFilter === tab.key
                    ? "bg-brand/15 text-brand"
                    : "bg-surface-3 text-text-tertiary"
                }`}
              >
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="input-field pl-9 text-sm w-full"
          />
        </div>
      </motion.div>

      {/* ═══ Followers Table ═══ */}
      <motion.div
        {...slideUp(0.16)}
        className="glass-panel overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand/10">
              <Users className="w-3.5 h-3.5 text-brand" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">
              {statusFilter === "ALL" ? "All Requests" : `${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()} Requests`}
            </h3>
          </div>
          <span className="text-xs text-text-tertiary tabular-nums">
            {filteredRequests.length} result{filteredRequests.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-1/30 sticky top-0 z-10">
                <th className="table-header px-4 py-2.5 text-left">User</th>
                <th className="table-header px-4 py-2.5 text-left">Wallet</th>
                <th className="table-header px-4 py-2.5 text-right">Allocation %</th>
                <th className="table-header px-4 py-2.5 text-center">Status</th>
                <th className="table-header px-4 py-2.5 text-right">Requested</th>
                <th className="table-header px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {paginatedRequests.length > 0 ? (
                  paginatedRequests.map((req, i) => (
                    <motion.tr
                      key={req.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={`table-row ${i % 2 === 1 ? "bg-surface-2/20" : ""}`}
                    >
                      {/* User */}
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-sm">
                            {req.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {req.user.name}
                            </p>
                            <p className="text-2xs text-text-tertiary truncate">
                              {req.user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Wallet */}
                      <td className="table-cell">
                        {req.user.wallet ? (
                          <span className="flex items-center gap-1.5 text-xs">
                            <Wallet className="w-3 h-3 text-success" />
                            <span className="text-text-secondary tabular-nums">
                              {shortenAddress(req.user.wallet.address)}
                            </span>
                            {req.user.wallet.isConnected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                            )}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
                            <Wallet className="w-3 h-3" />
                            Not connected
                          </span>
                        )}
                      </td>

                      {/* Allocation */}
                      <td className="table-cell text-right">
                        <span className="text-sm font-medium text-text-primary tabular-nums">
                          {req.riskPercent}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="table-cell text-center">
                        <StatusBadge status={req.status} />
                      </td>

                      {/* Requested */}
                      <td className="table-cell text-right">
                        <span className="text-xs text-text-tertiary" title={formatDate(req.createdAt)}>
                          {timeAgo(req.createdAt)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="table-cell text-right">
                        {req.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAction(req.id, "APPROVED")}
                              disabled={processingId === req.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success/10 border border-success/20 hover:bg-success/20 text-success text-xs font-medium transition-all duration-200 disabled:opacity-50 active:scale-[0.97]"
                              title="Approve"
                            >
                              {processingId === req.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span className="hidden sm:inline">Approve</span>
                            </button>
                            <button
                              onClick={() => setRejectTarget(req)}
                              disabled={processingId === req.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-danger/10 border border-danger/20 hover:bg-danger/20 text-danger text-xs font-medium transition-all duration-200 disabled:opacity-50 active:scale-[0.97]"
                              title="Reject"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Reject</span>
                            </button>
                          </div>
                        ) : req.status === "APPROVED" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/dashboard/messages?userId=${req.user.id}&name=${encodeURIComponent(req.user.name)}`}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand/10 border border-brand/20 hover:bg-brand/20 text-brand text-xs font-medium transition-all duration-200 active:scale-[0.97]"
                              title="Message follower"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Message</span>
                            </Link>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/10 border border-success/20 text-success text-2xs font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          </div>
                        ) : req.status === "CANCELLED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-text-tertiary/10 border border-text-tertiary/20 text-text-tertiary text-2xs font-medium">
                            <XCircle className="w-3 h-3" />
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-danger/10 border border-danger/20 text-danger text-2xs font-medium">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        {searchQuery ? (
                          <>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand/10 to-brand/5 flex items-center justify-center mx-auto border border-brand/10">
                              <Search className="w-6 h-6 text-text-tertiary" />
                            </div>
                            <p className="text-sm font-medium text-text-secondary mt-1">
                              No results for &quot;{searchQuery}&quot;
                            </p>
                            <button
                              onClick={() => setSearchQuery("")}
                              className="text-xs text-brand hover:text-brand-light transition-colors"
                            >
                              Clear search
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand/10 to-brand/5 flex items-center justify-center mx-auto border border-brand/10">
                              <Users className="w-6 h-6 text-text-tertiary" />
                            </div>
                            <p className="text-sm font-medium text-text-secondary mt-1">
                              No {statusFilter !== "ALL" ? statusFilter.toLowerCase() : ""} requests found
                            </p>
                            <p className="text-2xs text-text-tertiary">
                              Copy requests from followers will appear here
                            </p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-text-tertiary">
              Showing{" "}
              <span className="tabular-nums font-medium text-text-secondary">
                {(currentPage - 1) * PAGE_SIZE + 1}
              </span>
              &ndash;
              <span className="tabular-nums font-medium text-text-secondary">
                {Math.min(currentPage * PAGE_SIZE, filteredRequests.length)}
              </span>{" "}
              of{" "}
              <span className="tabular-nums font-medium text-text-secondary">
                {filteredRequests.length}
              </span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md hover:bg-surface-3 text-text-tertiary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // Show first, last, current, and adjacent pages
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .reduce<(number | "ellipsis")[]>((acc, page, idx, arr) => {
                  if (idx > 0) {
                    const prev = arr[idx - 1];
                    if (page - prev > 1) acc.push("ellipsis");
                  }
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-1 text-xs text-text-tertiary"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item)}
                      className={`
                        w-8 h-8 rounded-md text-xs font-medium transition-all duration-200
                        ${
                          currentPage === item
                            ? "bg-brand text-white shadow-sm"
                            : "text-text-tertiary hover:bg-surface-3 hover:text-text-secondary"
                        }
                      `}
                    >
                      {item}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md hover:bg-surface-3 text-text-tertiary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ═══ Reject Confirmation Dialog ═══ */}
      <ConfirmDialog
        isOpen={!!rejectTarget}
        title="Reject Copy Request"
        message={
          rejectTarget
            ? `Are you sure you want to reject the copy request from ${rejectTarget.user.name} (${rejectTarget.user.email})? This follower will not copy your trades.`
            : ""
        }
        confirmLabel="Reject Request"
        cancelLabel="Cancel"
        variant="danger"
        loading={processingId === rejectTarget?.id}
        onConfirm={() => {
          if (rejectTarget) {
            handleAction(rejectTarget.id, "REJECTED");
          }
        }}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}

// ─── Status Badge Sub-component ──────────────────────────────────────

function StatusBadge({ status }: { status: CopyRequest["status"] }) {
  const configs: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; classes: string }> = {
    PENDING: {
      icon: Clock,
      label: "Pending",
      classes: "bg-warning/10 text-warning border-warning/20",
    },
    APPROVED: {
      icon: CheckCircle2,
      label: "Approved",
      classes: "bg-success/10 text-success border-success/20",
    },
    REJECTED: {
      icon: XCircle,
      label: "Rejected",
      classes: "bg-danger/10 text-danger border-danger/20",
    },
    CANCELLED: {
      icon: XCircle,
      label: "Cancelled",
      classes: "bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20",
    },
  };

  const config = configs[status] || configs.PENDING;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-2xs font-medium ${config.classes}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
