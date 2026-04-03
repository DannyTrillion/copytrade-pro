"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileText,
  Mail,
  Phone,
  UserCheck,
  Link2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

/* ─── Types ─── */
interface NextOfKinRecord {
  id: string;
  userId: string;
  fullName: string;
  relationship: string;
  email: string;
  phone: string | null;
  beneficiaryId: string | null;
  documentUrl: string | null;
  status: string;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

type FilterTab = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const FILTER_TABS: FilterTab[] = ["ALL", "PENDING", "APPROVED", "REJECTED"];

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; className: string; label: string }> = {
  PENDING: { icon: Clock, className: "text-warning bg-warning/10", label: "Pending Review" },
  APPROVED: { icon: CheckCircle2, className: "text-success bg-success/10", label: "Approved" },
  REJECTED: { icon: XCircle, className: "text-danger bg-danger/10", label: "Rejected" },
};

/* ─── Page ─── */
export default function AdminNextOfKinPage() {
  const [records, setRecords] = useState<NextOfKinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  // Action state per-card
  const [actionStates, setActionStates] = useState<
    Record<string, { note: string; processing: boolean; showNoteField: boolean }>
  >({});

  const fetchRecords = useCallback(async (tab: FilterTab) => {
    try {
      const params = new URLSearchParams();
      if (tab !== "ALL") params.set("status", tab);
      const res = await fetch(`/api/admin/next-of-kin?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchRecords(activeTab);
  }, [activeTab, fetchRecords]);

  const getActionState = (id: string) =>
    actionStates[id] || { note: "", processing: false, showNoteField: false };

  const updateActionState = (id: string, patch: Partial<{ note: string; processing: boolean; showNoteField: boolean }>) => {
    setActionStates((prev) => ({
      ...prev,
      [id]: { ...getActionState(id), ...patch },
    }));
  };

  const handleAction = async (record: NextOfKinRecord, action: "APPROVED" | "REJECTED") => {
    const state = getActionState(record.id);

    // If rejecting and note field not shown yet, show it first
    if (action === "REJECTED" && !state.showNoteField) {
      updateActionState(record.id, { showNoteField: true });
      return;
    }

    updateActionState(record.id, { processing: true });
    try {
      const res = await fetch("/api/admin/next-of-kin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          action,
          adminNote: state.note.trim() || undefined,
        }),
      });
      if (res.ok) {
        fetchRecords(activeTab);
      }
    } catch {
      // silent
    } finally {
      updateActionState(record.id, { processing: false });
    }
  };

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-section space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-brand/10">
            <Users className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Next of Kin Requests</h2>
            <p className="text-sm text-text-tertiary">Review beneficiary designations</p>
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 w-fit">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                activeTab === tab
                  ? "bg-brand text-white shadow-sm"
                  : "text-text-tertiary hover:text-text-primary hover:bg-surface-3"
              }`}
            >
              {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {records.map((record, index) => {
            const statusCfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusCfg.icon;
            const actionState = getActionState(record.id);

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
                className="glass-panel p-5 space-y-4"
              >
                {/* User Info + Status */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{record.user.name}</p>
                    <p className="text-2xs text-text-tertiary">{record.user.email}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusCfg.className}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusCfg.label}
                  </span>
                </div>

                {/* Beneficiary Details */}
                <div className="p-3 rounded-lg bg-surface-2 space-y-2.5">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Beneficiary Details
                  </p>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                    <span className="text-sm text-text-primary">{record.fullName}</span>
                    <span className="text-2xs text-text-tertiary px-1.5 py-0.5 rounded bg-surface-3">
                      {record.relationship}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                    <span className="text-sm text-text-tertiary">{record.email}</span>
                  </div>
                  {record.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                      <span className="text-sm text-text-tertiary">{record.phone}</span>
                    </div>
                  )}
                  {record.beneficiaryId && (
                    <div className="flex items-center gap-2">
                      <Link2 className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                      <span className="text-2xs text-text-tertiary font-mono">
                        Platform ID: {record.beneficiaryId}
                      </span>
                    </div>
                  )}
                  {record.documentUrl && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-brand shrink-0" />
                      <a
                        href={record.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand hover:text-brand-light transition-colors underline underline-offset-2"
                      >
                        View Document
                      </a>
                    </div>
                  )}
                </div>

                {/* Admin Note (if reviewed) */}
                {record.adminNote && record.status !== "PENDING" && (
                  <div className="p-2.5 rounded-lg bg-surface-1 border border-border">
                    <p className="text-2xs text-text-tertiary mb-0.5">Admin Note</p>
                    <p className="text-xs text-text-secondary">{record.adminNote}</p>
                  </div>
                )}

                {/* Date */}
                <p className="text-2xs text-text-tertiary">
                  Submitted {formatDate(record.createdAt)}
                </p>

                {/* Actions */}
                {record.status === "PENDING" && (
                  <div className="space-y-2.5 pt-1 border-t border-border">
                    {/* Note field (always show for approve, toggle for reject) */}
                    {(actionState.showNoteField || true) && (
                      <textarea
                        value={actionState.note}
                        onChange={(e) => updateActionState(record.id, { note: e.target.value })}
                        placeholder="Admin note (optional)..."
                        rows={2}
                        className="input-field w-full text-xs resize-none mt-2"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAction(record, "APPROVED")}
                        disabled={actionState.processing}
                        className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {actionState.processing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(record, "REJECTED")}
                        disabled={actionState.processing}
                        className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md bg-danger/10 text-danger hover:bg-danger/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {actionState.processing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {records.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel p-12 flex flex-col items-center justify-center text-center"
        >
          <Users className="w-10 h-10 text-text-tertiary/30 mb-3" />
          <p className="text-sm text-text-tertiary">No next of kin requests found</p>
          <p className="text-2xs text-text-tertiary/60 mt-1">
            {activeTab !== "ALL" ? `No ${activeTab.toLowerCase()} requests` : "Requests will appear here when users submit them"}
          </p>
        </motion.div>
      )}
    </div>
  );
}
