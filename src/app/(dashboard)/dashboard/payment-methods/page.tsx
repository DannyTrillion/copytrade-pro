"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  CreditCard,
  Plus,
  Trash2,
  Star,
  Edit3,
  Shield,
  Loader2,
  Copy,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";

// ── Types ────────────────────────────────────────────────────────────

interface PaymentMethod {
  id: string;
  type: "WALLET" | "CARD";
  label: string;
  walletAddress: string | null;
  network: string | null;
  walletType: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  cardExpiry: string | null;
  isDefault: boolean;
  createdAt: string;
}

type WalletFormData = {
  label: string;
  walletAddress: string;
  network: string;
  walletType: string;
};

type CardFormData = {
  cardNumber: string;
  cardholderName: string;
  expiry: string;
};

const NETWORKS = ["ERC20", "TRC20", "BEP20", "SOL", "Bitcoin"] as const;
const WALLET_TYPES = ["DEPOSIT", "WITHDRAWAL", "BOTH"] as const;

const NETWORK_COLORS: Record<string, string> = {
  ERC20: "bg-blue-500/15 text-blue-400",
  TRC20: "bg-red-500/15 text-red-400",
  BEP20: "bg-yellow-500/15 text-yellow-400",
  SOL: "bg-purple-500/15 text-purple-400",
  Bitcoin: "bg-orange-500/15 text-orange-400",
};

const WALLET_TYPE_COLORS: Record<string, string> = {
  DEPOSIT: "bg-emerald-500/15 text-emerald-400",
  WITHDRAWAL: "bg-sky-500/15 text-sky-400",
  BOTH: "bg-violet-500/15 text-violet-400",
};

// ── Card brand detection ─────────────────────────────────────────────

function detectCardBrand(number: string): string {
  const cleaned = number.replace(/\s/g, "");
  if (/^4/.test(cleaned)) return "Visa";
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return "Mastercard";
  if (/^3[47]/.test(cleaned)) return "Amex";
  if (/^6(?:011|5)/.test(cleaned)) return "Discover";
  if (/^35/.test(cleaned)) return "JCB";
  if (/^3(?:0[0-5]|[68])/.test(cleaned)) return "Diners";
  return "Card";
}

function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function truncateAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ── Stagger animation helpers ────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

// ── Main Component ───────────────────────────────────────────────────

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal states
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<PaymentMethod | null>(null);

  // Wallet form
  const [walletForm, setWalletForm] = useState<WalletFormData>({
    label: "",
    walletAddress: "",
    network: "ERC20",
    walletType: "BOTH",
  });

  // Card form
  const [cardForm, setCardForm] = useState<CardFormData>({
    cardNumber: "",
    cardholderName: "",
    expiry: "",
  });

  const [editLabel, setEditLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────

  const fetchMethods = useCallback(async () => {
    try {
      const res = await fetch("/api/payment-methods");
      if (res.ok) {
        const data = await res.json();
        setMethods(data.paymentMethods || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  // ── Flash message helper ───────────────────────────────────────────

  const flash = useCallback((type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "WALLET",
          label: walletForm.label,
          walletAddress: walletForm.walletAddress,
          network: walletForm.network,
          walletType: walletForm.walletType,
        }),
      });

      if (res.ok) {
        flash("success", "Wallet address saved successfully");
        setWalletModalOpen(false);
        setWalletForm({ label: "", walletAddress: "", network: "ERC20", walletType: "BOTH" });
        fetchMethods();
      } else {
        const data = await res.json();
        flash("error", data.error || "Failed to save wallet");
      }
    } catch {
      flash("error", "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const digits = cardForm.cardNumber.replace(/\D/g, "");
    const brand = detectCardBrand(digits);
    const last4 = digits.slice(-4);

    try {
      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CARD",
          label: `${brand} ending ${last4}`,
          cardLast4: last4,
          cardBrand: brand,
          cardExpiry: cardForm.expiry,
        }),
      });

      if (res.ok) {
        flash("success", "Card saved successfully");
        setCardModalOpen(false);
        setCardForm({ cardNumber: "", cardholderName: "", expiry: "" });
        fetchMethods();
      } else {
        const data = await res.json();
        flash("error", data.error || "Failed to save card");
      }
    } catch {
      flash("error", "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/payment-methods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isDefault: true }),
      });
      if (res.ok) {
        flash("success", "Default payment method updated");
        fetchMethods();
      } else {
        const data = await res.json();
        flash("error", data.error || "Failed to update");
      }
    } catch {
      flash("error", "Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/payment-methods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editModal.id, label: editLabel }),
      });
      if (res.ok) {
        flash("success", "Label updated");
        setEditModal(null);
        fetchMethods();
      } else {
        const data = await res.json();
        flash("error", data.error || "Failed to update");
      }
    } catch {
      flash("error", "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/payment-methods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        flash("success", "Payment method removed");
        fetchMethods();
      } else {
        const data = await res.json();
        flash("error", data.error || "Failed to delete");
      }
    } catch {
      flash("error", "Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopy = (address: string, id: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Derived data ───────────────────────────────────────────────────

  const wallets = methods.filter((m) => m.type === "WALLET");
  const cards = methods.filter((m) => m.type === "CARD");

  // ── Loading state ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <>
      <div className="dashboard-section">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-lg font-semibold text-text-primary">Payment Methods</h2>
          <p className="text-sm text-text-tertiary mt-1">
            Manage your wallet addresses and saved cards
          </p>
        </motion.div>

        {/* Flash message */}
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg ${
              msg.type === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            }`}
          >
            {msg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {msg.text}
          </motion.div>
        )}

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* ── Wallet Addresses Section ──────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel p-5 md:p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-brand" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">Wallet Addresses</h3>
              </div>
              <button
                onClick={() => setWalletModalOpen(true)}
                className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Wallet
              </button>
            </div>

            {wallets.length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {wallets.map((w) => (
                  <motion.div
                    key={w.id}
                    variants={itemVariants}
                    className="bg-surface-1 rounded-lg p-4 group hover:bg-surface-2 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-medium text-text-primary truncate">
                            {w.label}
                          </span>
                          {w.isDefault && (
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <code className="text-xs font-mono text-text-secondary">
                            {truncateAddress(w.walletAddress || "")}
                          </code>
                          <button
                            onClick={() => handleCopy(w.walletAddress || "", w.id)}
                            className="p-0.5 rounded hover:bg-surface-4 transition-colors text-text-tertiary hover:text-text-primary"
                            title="Copy address"
                          >
                            {copiedId === w.id ? (
                              <CheckCircle2 className="w-3 h-3 text-success" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-2xs px-2 py-0.5 rounded-full font-medium ${
                              NETWORK_COLORS[w.network || ""] || "bg-surface-4 text-text-tertiary"
                            }`}
                          >
                            {w.network}
                          </span>
                          <span
                            className={`text-2xs px-2 py-0.5 rounded-full font-medium ${
                              WALLET_TYPE_COLORS[w.walletType || ""] || "bg-surface-4 text-text-tertiary"
                            }`}
                          >
                            {w.walletType === "BOTH"
                              ? "Deposit & Withdrawal"
                              : w.walletType === "DEPOSIT"
                                ? "Deposit"
                                : "Withdrawal"}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!w.isDefault && (
                          <button
                            onClick={() => handleSetDefault(w.id)}
                            disabled={actionLoading === w.id}
                            className="p-1.5 rounded-md hover:bg-surface-4 transition-colors text-text-tertiary hover:text-amber-400"
                            title="Set as default"
                          >
                            {actionLoading === w.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Star className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditModal(w);
                            setEditLabel(w.label);
                          }}
                          className="p-1.5 rounded-md hover:bg-surface-4 transition-colors text-text-tertiary hover:text-text-primary"
                          title="Edit label"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(w.id)}
                          disabled={actionLoading === w.id}
                          className="p-1.5 rounded-md hover:bg-surface-4 transition-colors text-text-tertiary hover:text-red-400"
                          title="Delete"
                        >
                          {actionLoading === w.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center mb-3">
                  <Wallet className="w-6 h-6 text-text-tertiary" />
                </div>
                <p className="text-sm text-text-secondary font-medium mb-1">No wallets saved</p>
                <p className="text-xs text-text-tertiary">
                  Add a wallet address for faster deposits and withdrawals
                </p>
              </div>
            )}
          </motion.div>

          {/* ── Saved Cards Section ───────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel p-5 md:p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">Saved Cards</h3>
              </div>
              <button
                onClick={() => setCardModalOpen(true)}
                className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Card
              </button>
            </div>

            {cards.length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {cards.map((c) => (
                  <motion.div
                    key={c.id}
                    variants={itemVariants}
                    className="bg-surface-1 rounded-lg p-4 group hover:bg-surface-2 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-7 rounded bg-surface-3 flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4 text-text-secondary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-text-primary">
                              {c.cardBrand}
                            </span>
                            <span className="text-xs text-text-secondary font-mono">
                              **** {c.cardLast4}
                            </span>
                            {c.isDefault && (
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-text-tertiary">
                            Expires {c.cardExpiry}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!c.isDefault && (
                          <button
                            onClick={() => handleSetDefault(c.id)}
                            disabled={actionLoading === c.id}
                            className="p-1.5 rounded-md hover:bg-surface-4 transition-colors text-text-tertiary hover:text-amber-400"
                            title="Set as default"
                          >
                            {actionLoading === c.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Star className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={actionLoading === c.id}
                          className="p-1.5 rounded-md hover:bg-surface-4 transition-colors text-text-tertiary hover:text-red-400"
                          title="Remove card"
                        >
                          {actionLoading === c.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center mb-3">
                  <CreditCard className="w-6 h-6 text-text-tertiary" />
                </div>
                <p className="text-sm text-text-secondary font-medium mb-1">No cards saved</p>
                <p className="text-xs text-text-tertiary">
                  Add a card for quick and easy payments
                </p>
              </div>
            )}

            {/* Security note */}
            <div className="mt-4 flex items-start gap-2 bg-surface-1 rounded-lg px-3 py-2.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-2xs text-text-tertiary leading-relaxed">
                Card details are tokenized for security. We never store full card numbers.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Add Wallet Modal ──────────────────────────────────────── */}
      <Modal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} title="Add Wallet Address">
        <form onSubmit={handleAddWallet} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Label</label>
            <input
              type="text"
              value={walletForm.label}
              onChange={(e) => setWalletForm((p) => ({ ...p, label: e.target.value }))}
              className="input-field"
              placeholder="e.g. Main ETH Wallet"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Wallet Address
            </label>
            <input
              type="text"
              value={walletForm.walletAddress}
              onChange={(e) => setWalletForm((p) => ({ ...p, walletAddress: e.target.value }))}
              className="input-field font-mono text-xs"
              placeholder="0x..."
              required
              minLength={10}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Network</label>
            <select
              value={walletForm.network}
              onChange={(e) => setWalletForm((p) => ({ ...p, network: e.target.value }))}
              className="input-field appearance-none cursor-pointer"
            >
              {NETWORKS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Type</label>
            <select
              value={walletForm.walletType}
              onChange={(e) => setWalletForm((p) => ({ ...p, walletType: e.target.value }))}
              className="input-field appearance-none cursor-pointer"
            >
              {WALLET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "BOTH" ? "Deposit & Withdrawal" : t === "DEPOSIT" ? "Deposit" : "Withdrawal"}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full text-sm flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                Save Wallet
              </>
            )}
          </button>
        </form>
      </Modal>

      {/* ── Add Card Modal ────────────────────────────────────────── */}
      <Modal isOpen={cardModalOpen} onClose={() => setCardModalOpen(false)} title="Add Card">
        <form onSubmit={handleAddCard} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Card Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={cardForm.cardNumber}
                onChange={(e) =>
                  setCardForm((p) => ({ ...p, cardNumber: maskCardNumber(e.target.value) }))
                }
                className="input-field font-mono tracking-wider pr-20"
                placeholder="4242 4242 4242 4242"
                required
                maxLength={19}
              />
              {cardForm.cardNumber.replace(/\s/g, "").length >= 2 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-secondary">
                  {detectCardBrand(cardForm.cardNumber)}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Cardholder Name
            </label>
            <input
              type="text"
              value={cardForm.cardholderName}
              onChange={(e) =>
                setCardForm((p) => ({ ...p, cardholderName: e.target.value }))
              }
              className="input-field"
              placeholder="John Doe"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Expiry (MM/YY)
            </label>
            <input
              type="text"
              value={cardForm.expiry}
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, "").slice(0, 4);
                if (val.length >= 3) val = `${val.slice(0, 2)}/${val.slice(2)}`;
                setCardForm((p) => ({ ...p, expiry: val }));
              }}
              className="input-field font-mono"
              placeholder="MM/YY"
              required
              maxLength={5}
            />
          </div>

          <div className="flex items-start gap-2 bg-surface-1 rounded-lg px-3 py-2.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-2xs text-text-tertiary leading-relaxed">
              Card details are tokenized for security. We never store full card numbers.
              Only the last 4 digits are saved for identification.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || cardForm.cardNumber.replace(/\s/g, "").length < 13}
            className="btn-primary w-full text-sm flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Save Card
              </>
            )}
          </button>
        </form>
      </Modal>

      {/* ── Edit Label Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={editModal !== null}
        onClose={() => setEditModal(null)}
        title="Edit Label"
        size="sm"
      >
        <form onSubmit={handleEditLabel} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Label</label>
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="input-field"
              placeholder="Enter label"
              required
              maxLength={100}
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !editLabel.trim()}
            className="btn-primary w-full text-sm flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </button>
        </form>
      </Modal>
    </>
  );
}
