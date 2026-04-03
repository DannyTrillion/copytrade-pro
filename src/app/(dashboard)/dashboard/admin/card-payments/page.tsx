"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Loader2,
  Search,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils";

/* ─── Types ─── */
interface CardPaymentRow {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  cardLast4: string | null;
  cardBrand: string | null;
  status: string;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

interface Stats {
  pendingCount: number;
  confirmedTotal: number;
  rejectedCount: number;
}

type FilterTab = "ALL" | "PENDING" | "CONFIRMED" | "REJECTED";

const FILTER_TABS: FilterTab[] = ["ALL", "PENDING", "CONFIRMED", "REJECTED"];

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; className: string }> = {
  PENDING: { icon: Clock, className: "text-warning bg-warning/10" },
  ADMIN_REVIEW: { icon: Clock, className: "text-amber-400 bg-amber-400/10" },
  CONFIRMED: { icon: CheckCircle2, className: "text-success bg-success/10" },
  REJECTED: { icon: XCircle, className: "text-danger bg-danger/10" },
};

/* ─── Page ─── */
export default function AdminCardPaymentsPage() {
  const [payments, setPayments] = useState<CardPaymentRow[]>([]);
  const [stats, setStats] = useState<Stats>({ pendingCount: 0, confirmedTotal: 0, rejectedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"CONFIRMED" | "REJECTED">("CONFIRMED");
  const [selectedPayment, setSelectedPayment] = useState<CardPaymentRow | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchPayments = useCallback(async (tab: FilterTab) => {
    try {
      const params = new URLSearchParams();
      if (tab !== "ALL") params.set("status", tab);
      const res = await fetch(`/api/admin/card-payments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setStats(data.stats || { pendingCount: 0, confirmedTotal: 0, rejectedCount: 0 });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPayments(activeTab);
  }, [activeTab, fetchPayments]);

  const openActionModal = (payment: CardPaymentRow, action: "CONFIRMED" | "REJECTED") => {
    setSelectedPayment(payment);
    setModalAction(action);
    setAdminNote("");
    setModalOpen(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedPayment) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/card-payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          action: modalAction,
          adminNote: adminNote.trim() || undefined,
        }),
      });
      if (res.ok) {
        setModalOpen(false);
        fetchPayments(activeTab);
      }
    } catch {
      // silent
    } finally {
      setProcessing(false);
    }
  };

  // Client-side search filter
  const filteredPayments = payments.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.user.name.toLowerCase().includes(q) ||
      p.user.email.toLowerCase().includes(q) ||
      (p.cardLast4 && p.cardLast4.includes(q)) ||
      (p.cardBrand && p.cardBrand.toLowerCase().includes(q))
    );
  });

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
            <CreditCard className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Card Payments</h2>
            <p className="text-sm text-text-tertiary">Review and confirm card deposits</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Pending"
          value={String(stats.pendingCount)}
          icon={Clock}
          iconColor="text-warning"
          delay={0}
        />
        <StatCard
          title="Total Confirmed"
          value={formatCurrency(stats.confirmedTotal)}
          icon={DollarSign}
          iconColor="text-success"
          delay={0.05}
        />
        <StatCard
          title="Total Rejected"
          value={String(stats.rejectedCount)}
          icon={XCircle}
          iconColor="text-danger"
          delay={0.1}
        />
      </div>

      {/* Filters & Search */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2">
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

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by user, email, card..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 text-sm w-full"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-1/30">
                <th className="table-header px-4 py-2.5 text-left">User</th>
                <th className="table-header px-4 py-2.5 text-left">Email</th>
                <th className="table-header px-4 py-2.5 text-right">Amount</th>
                <th className="table-header px-4 py-2.5 text-left">Card</th>
                <th className="table-header px-4 py-2.5 text-center">Status</th>
                <th className="table-header px-4 py-2.5 text-right">Date</th>
                <th className="table-header px-4 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredPayments.map((payment, index) => {
                  const statusCfg = STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <motion.tr
                      key={payment.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: index * 0.02 }}
                      className="table-row"
                    >
                      <td className="table-cell">
                        <p className="text-sm text-text-primary font-medium">{payment.user.name}</p>
                      </td>
                      <td className="table-cell">
                        <p className="text-sm text-text-tertiary">{payment.user.email}</p>
                      </td>
                      <td className="table-cell text-right">
                        <span className="text-sm font-medium text-success">
                          +{formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-text-tertiary" />
                          <span className="text-sm text-text-primary">
                            {payment.cardBrand || "Card"} {payment.cardLast4 ? `****${payment.cardLast4}` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusCfg.className}`}
                          title={payment.adminNote || undefined}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {payment.status}
                        </span>
                        {payment.status === "REJECTED" && payment.adminNote && (
                          <p className="text-2xs text-text-tertiary mt-0.5 max-w-[140px] truncate" title={payment.adminNote}>
                            {payment.adminNote}
                          </p>
                        )}
                      </td>
                      <td className="table-cell text-right text-xs text-text-tertiary">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="table-cell text-center">
                        {payment.status === "PENDING" || payment.status === "ADMIN_REVIEW" ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openActionModal(payment, "CONFIRMED")}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => openActionModal(payment, "REJECTED")}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-2xs text-text-tertiary">Reviewed</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <CreditCard className="w-8 h-8 text-text-tertiary/40 mx-auto mb-2" />
                    <p className="text-sm text-text-tertiary">No card payments found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalAction === "CONFIRMED" ? "Confirm Card Payment" : "Reject Card Payment"}
        size="sm"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-surface-2 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-tertiary">User</span>
                <span className="text-text-primary font-medium">{selectedPayment.user.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-tertiary">Amount</span>
                <span className="text-success font-medium">{formatCurrency(selectedPayment.amount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-tertiary">Card</span>
                <span className="text-text-primary">
                  {selectedPayment.cardBrand} ****{selectedPayment.cardLast4}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">
                Admin Note (optional)
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={
                  modalAction === "CONFIRMED"
                    ? "Payment verified and confirmed..."
                    : "Reason for rejection..."
                }
                rows={3}
                className="input-field w-full text-sm resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setModalOpen(false)}
                className="btn-secondary flex-1 text-sm"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAction}
                disabled={processing}
                className={`flex-1 text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  modalAction === "CONFIRMED"
                    ? "bg-success text-white hover:bg-success/90"
                    : "bg-danger text-white hover:bg-danger/90"
                } disabled:opacity-50`}
              >
                {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {modalAction === "CONFIRMED" ? "Confirm Payment" : "Reject Payment"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
