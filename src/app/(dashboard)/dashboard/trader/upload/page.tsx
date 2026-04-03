"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Tag,
  BarChart3,
  Percent,
  DollarSign,
  Calendar,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Users,
  TrendingUp,
  TrendingDown,
  CheckSquare,
  Square,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { slideUp } from "@/lib/animations";
import Link from "next/link";

// ─── Types ───

interface TraderTrade {
  id: string;
  tradeName: string;
  market: string;
  resultPercent: number;
  profitLoss: number;
  notes: string | null;
  screenshotUrl: string | null;
  tradeDate: string;
  createdAt: string;
}

interface CopyRequest {
  id: string;
  status: string;
}

interface Follower {
  userId: string;
  name: string;
  email: string;
  allocationPercent: number;
  allocatedBalance: number;
  totalBalance: number;
}

const MARKETS = [
  "Crypto",
  "Forex",
  "Stocks",
  "Polymarket",
  "Options",
  "Futures",
  "Other",
] as const;

type TradeType = "" | "BUY" | "SELL";
type TargetMode = "ALL" | "SELECTED";

// ─── Component ───

export default function TradeUploadPage() {
  // Form state
  const [form, setForm] = useState({
    tradeName: "",
    market: "Crypto",
    tradeType: "" as TradeType,
    resultPercent: "",
    profitLoss: "",
    tradeAmount: "",
    tradeDate: new Date().toISOString().split("T")[0],
    screenshotUrl: "",
    notes: "",
  });

  // Target mode state
  const [targetMode, setTargetMode] = useState<TargetMode>("ALL");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{
    affectedFollowers: number;
  } | null>(null);

  // Data state
  const [approvedCount, setApprovedCount] = useState(0);
  const [recentTrades, setRecentTrades] = useState<TraderTrade[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // ─── Fetch sidebar data ───

  const fetchSidebarData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [requestsRes, tradesRes] = await Promise.all([
        fetch("/api/copy-requests"),
        fetch("/api/trader-trades?limit=3"),
      ]);

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        const requests: CopyRequest[] = data.requests || [];
        setApprovedCount(
          requests.filter((r) => r.status === "APPROVED").length
        );
      }

      if (tradesRes.ok) {
        const data = await tradesRes.json();
        setRecentTrades(data.trades || []);
      }
    } catch (err) {
      console.error("Failed to fetch sidebar data:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchSidebarData();
  }, [fetchSidebarData]);

  // ─── Fetch followers when SELECTED mode is chosen ───

  const fetchFollowers = useCallback(async () => {
    setLoadingFollowers(true);
    try {
      const res = await fetch("/api/trader-trades/followers");
      if (res.ok) {
        const data = await res.json();
        setFollowers(data.followers || []);
      }
    } catch (err) {
      console.error("Failed to fetch followers:", err);
    } finally {
      setLoadingFollowers(false);
    }
  }, []);

  useEffect(() => {
    if (targetMode === "SELECTED" && followers.length === 0) {
      fetchFollowers();
    }
  }, [targetMode, followers.length, fetchFollowers]);

  // ─── Form helpers ───

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const resetForm = () => {
    setForm({
      tradeName: "",
      market: "Crypto",
      tradeType: "",
      resultPercent: "",
      profitLoss: "",
      tradeAmount: "",
      tradeDate: new Date().toISOString().split("T")[0],
      screenshotUrl: "",
      notes: "",
    });
    setTargetMode("ALL");
    setSelectedUserIds([]);
    setSuccessData(null);
    setError("");
  };

  // ─── Follower selection helpers ───

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUserIds(followers.map((f) => f.userId));
  };

  const deselectAllUsers = () => {
    setSelectedUserIds([]);
  };

  // ─── Submit ───

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.tradeName.trim()) {
      setError("Trade name is required");
      return;
    }
    if (!form.resultPercent) {
      setError("Result % is required");
      return;
    }
    if (!form.profitLoss) {
      setError("Profit/Loss amount is required");
      return;
    }
    if (targetMode === "SELECTED" && selectedUserIds.length === 0) {
      setError("Please select at least one follower");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/trader-trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradeName: form.tradeName.trim(),
          market: form.market,
          tradeType: form.tradeType || undefined,
          resultPercent: parseFloat(form.resultPercent),
          profitLoss: parseFloat(form.profitLoss),
          tradeAmount: form.tradeAmount
            ? parseFloat(form.tradeAmount)
            : undefined,
          notes: form.notes.trim() || undefined,
          screenshotUrl: form.screenshotUrl.trim() || undefined,
          tradeDate: form.tradeDate
            ? new Date(form.tradeDate).toISOString()
            : undefined,
          targetMode: targetMode,
          targetUserIds:
            targetMode === "SELECTED" ? selectedUserIds : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to upload trade");
        return;
      }

      setSuccessData({ affectedFollowers: data.affectedFollowers });
      fetchSidebarData();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Parsed preview values ───

  const resultParsed = form.resultPercent
    ? parseFloat(form.resultPercent)
    : null;
  const plParsed = form.profitLoss ? parseFloat(form.profitLoss) : null;

  // ─── Render ───

  return (
    <div className="dashboard-section">
      {/* Header */}
      <motion.div
        {...slideUp(0)}
      >
        <h2 className="text-lg md:text-xl font-semibold text-text-primary">
          Upload Trade
        </h2>
        <p className="text-2xs text-text-tertiary mt-0.5">
          Record a completed trade and apply results to followers
        </p>
      </motion.div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Left Column: Form */}
        <motion.div
          {...slideUp(0.05)}
          className="lg:col-span-3"
        >
          <AnimatePresence mode="wait">
            {successData ? (
              /* Success State */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel p-6 md:p-8 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-success" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  Trade Uploaded Successfully
                </h3>
                <p className="text-sm text-text-secondary mb-6">
                  {successData.affectedFollowers} follower
                  {successData.affectedFollowers !== 1 ? "s" : ""} affected by
                  this trade.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={resetForm} className="btn-primary gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Another
                  </button>
                  <Link
                    href="/dashboard/trader"
                    className="btn-secondary gap-2 inline-flex items-center"
                  >
                    View Trades
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            ) : (
              /* Form */
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="glass-panel p-4 md:p-6"
              >
                {/* Error banner */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                      <p className="text-xs text-danger">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-4">
                  {/* Row 1: Trade Name + Market + Trade Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        Trade Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.tradeName}
                        onChange={(e) =>
                          updateField("tradeName", e.target.value)
                        }
                        placeholder="e.g. BTC Long, ETH Short"
                        className="input-field"
                        maxLength={100}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5" />
                        Market
                      </label>
                      <select
                        value={form.market}
                        onChange={(e) => updateField("market", e.target.value)}
                        className="input-field"
                      >
                        {MARKETS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        {form.tradeType === "BUY" ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : form.tradeType === "SELL" ? (
                          <TrendingDown className="w-3.5 h-3.5" />
                        ) : (
                          <Tag className="w-3.5 h-3.5" />
                        )}
                        Trade Type{" "}
                        <span className="text-text-tertiary font-normal normal-case tracking-normal">
                          (optional)
                        </span>
                      </label>
                      <select
                        value={form.tradeType}
                        onChange={(e) =>
                          updateField("tradeType", e.target.value)
                        }
                        className="input-field"
                      >
                        <option value="">---</option>
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Result % + P&L + Trade Amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5" />
                        Result % <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        value={form.resultPercent}
                        onChange={(e) =>
                          updateField("resultPercent", e.target.value)
                        }
                        placeholder="e.g. +10 or -5"
                        className="input-field"
                        step={0.1}
                        required
                      />
                      <p className="text-2xs text-text-tertiary mt-1">
                        Positive for profit, negative for loss
                      </p>
                    </div>

                    <div>
                      <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        Profit / Loss ($){" "}
                        <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        value={form.profitLoss}
                        onChange={(e) =>
                          updateField("profitLoss", e.target.value)
                        }
                        placeholder="e.g. 500 or -200"
                        className="input-field"
                        step={0.01}
                        required
                      />
                      <p className="text-2xs text-text-tertiary mt-1">
                        Your absolute P&L for this trade
                      </p>
                    </div>

                    <div>
                      <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        Trade Amount ($){" "}
                        <span className="text-text-tertiary font-normal normal-case tracking-normal">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="number"
                        value={form.tradeAmount}
                        onChange={(e) =>
                          updateField("tradeAmount", e.target.value)
                        }
                        placeholder="e.g. 5000"
                        className="input-field"
                        step={0.01}
                        min={0}
                      />
                      <p className="text-2xs text-text-tertiary mt-1">
                        Total capital deployed
                      </p>
                    </div>
                  </div>

                  {/* Row 3: Trade Date + Screenshot URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Trade Date
                      </label>
                      <input
                        type="date"
                        value={form.tradeDate}
                        onChange={(e) =>
                          updateField("tradeDate", e.target.value)
                        }
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" />
                        Screenshot URL{" "}
                        <span className="text-text-tertiary font-normal normal-case tracking-normal">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="url"
                        value={form.screenshotUrl}
                        onChange={(e) =>
                          updateField("screenshotUrl", e.target.value)
                        }
                        placeholder="https://..."
                        className="input-field"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Notes{" "}
                      <span className="text-text-tertiary font-normal normal-case tracking-normal">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      placeholder="Trade analysis, entry/exit rationale..."
                      className="input-field resize-none h-24"
                      maxLength={1000}
                    />
                    <div className="flex justify-end mt-1">
                      <span className="text-2xs text-text-tertiary tabular-nums">
                        {form.notes.length}/1000
                      </span>
                    </div>
                  </div>

                  {/* Target Mode Selector */}
                  <div className="space-y-3">
                    <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Target Followers
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetMode("ALL")}
                        className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                          targetMode === "ALL"
                            ? "bg-brand/10 border-brand/30 text-brand"
                            : "bg-surface-1 border-border text-text-secondary hover:bg-surface-2 hover:border-border-light"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div
                            className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              targetMode === "ALL"
                                ? "border-brand"
                                : "border-text-tertiary"
                            }`}
                          >
                            {targetMode === "ALL" && (
                              <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                            )}
                          </div>
                          Apply to All Followers
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTargetMode("SELECTED")}
                        className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                          targetMode === "SELECTED"
                            ? "bg-brand/10 border-brand/30 text-brand"
                            : "bg-surface-1 border-border text-text-secondary hover:bg-surface-2 hover:border-border-light"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div
                            className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              targetMode === "SELECTED"
                                ? "border-brand"
                                : "border-text-tertiary"
                            }`}
                          >
                            {targetMode === "SELECTED" && (
                              <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                            )}
                          </div>
                          Apply to Selected Users
                        </div>
                      </button>
                    </div>

                    {/* Selected Users Panel */}
                    <AnimatePresence>
                      {targetMode === "SELECTED" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-lg border border-border bg-surface-1 p-3 space-y-3">
                            {/* Header with Select/Deselect + Count */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={selectAllUsers}
                                  className="text-2xs text-brand hover:text-brand-light transition-colors font-medium"
                                >
                                  Select All
                                </button>
                                <span className="text-text-tertiary text-2xs">
                                  |
                                </span>
                                <button
                                  type="button"
                                  onClick={deselectAllUsers}
                                  className="text-2xs text-text-secondary hover:text-text-primary transition-colors font-medium"
                                >
                                  Deselect All
                                </button>
                              </div>
                              <span className="text-2xs text-text-tertiary tabular-nums">
                                {selectedUserIds.length} of {followers.length}{" "}
                                users selected
                              </span>
                            </div>

                            {/* Scrollable follower list */}
                            <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                              {loadingFollowers ? (
                                <div className="flex items-center justify-center py-6 gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
                                  <span className="text-xs text-text-tertiary">
                                    Loading followers...
                                  </span>
                                </div>
                              ) : followers.length === 0 ? (
                                <div className="text-center py-6">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand/10 to-brand/5 flex items-center justify-center mx-auto mb-2 border border-brand/10">
                                    <Users className="w-5 h-5 text-text-tertiary" />
                                  </div>
                                  <p className="text-xs text-text-tertiary">
                                    No followers found
                                  </p>
                                </div>
                              ) : (
                                followers.map((follower) => {
                                  const isSelected = selectedUserIds.includes(
                                    follower.userId
                                  );
                                  return (
                                    <button
                                      key={follower.userId}
                                      type="button"
                                      onClick={() =>
                                        toggleUser(follower.userId)
                                      }
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                                        isSelected
                                          ? "bg-brand/5 border border-brand/20"
                                          : "bg-surface-2 border border-transparent hover:bg-surface-3 hover:border-border"
                                      }`}
                                    >
                                      {isSelected ? (
                                        <CheckSquare className="w-4 h-4 text-brand shrink-0" />
                                      ) : (
                                        <Square className="w-4 h-4 text-text-tertiary shrink-0" />
                                      )}
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white text-2xs font-semibold shrink-0">
                                        {follower.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0 text-left">
                                        <p className="text-xs font-medium text-text-primary truncate">
                                          {follower.name}
                                        </p>
                                        <p className="text-2xs text-text-tertiary truncate">
                                          {follower.email}
                                        </p>
                                      </div>
                                      <span className="text-2xs text-text-secondary font-medium shrink-0 tabular-nums">
                                        {formatCurrency(
                                          follower.allocatedBalance
                                        )}
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary w-full gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {submitting
                      ? "Uploading..."
                      : targetMode === "SELECTED"
                        ? `Upload & Apply to ${selectedUserIds.length} Selected User${selectedUserIds.length !== 1 ? "s" : ""}`
                        : "Upload & Apply to Followers"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right Column: Preview + Recent Trades */}
        <motion.div
          {...slideUp(0.1)}
          className="lg:col-span-2 space-y-4"
        >
          {/* Live Preview Panel */}
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-brand/10">
                <BarChart3 className="w-3.5 h-3.5 text-brand" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">
                Live Preview
              </h3>
            </div>

            <div className="space-y-3">
              {/* Trade Type Badge */}
              {form.tradeType && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-1 border border-border">
                  <div className="flex items-center gap-2">
                    {form.tradeType === "BUY" ? (
                      <TrendingUp className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-danger" />
                    )}
                    <span className="text-xs text-text-secondary">
                      Trade Type
                    </span>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                      form.tradeType === "BUY"
                        ? "bg-success/10 text-success border border-success/20"
                        : "bg-danger/10 text-danger border border-danger/20"
                    }`}
                  >
                    {form.tradeType}
                  </span>
                </div>
              )}

              {/* Result % */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-1 border border-border">
                <div className="flex items-center gap-2">
                  <Percent className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-xs text-text-secondary">Result</span>
                </div>
                <span
                  className={`text-lg font-bold tabular-nums ${
                    resultParsed !== null
                      ? resultParsed >= 0
                        ? "text-success"
                        : "text-danger"
                      : "text-text-tertiary"
                  }`}
                >
                  {resultParsed !== null
                    ? `${resultParsed >= 0 ? "+" : ""}${form.resultPercent}%`
                    : "--"}
                </span>
              </div>

              {/* P&L */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-1 border border-border">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-xs text-text-secondary">P&L</span>
                </div>
                <span
                  className={`text-lg font-bold tabular-nums ${
                    plParsed !== null
                      ? plParsed >= 0
                        ? "text-success"
                        : "text-danger"
                      : "text-text-tertiary"
                  }`}
                >
                  {plParsed !== null
                    ? `${plParsed >= 0 ? "+" : ""}${formatCurrency(plParsed)}`
                    : "--"}
                </span>
              </div>

              {/* Followers affected */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-1 border border-border">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-xs text-text-secondary">
                    {targetMode === "SELECTED"
                      ? "Selected users"
                      : "Followers affected"}
                  </span>
                </div>
                <span className="text-lg font-bold tabular-nums text-text-primary">
                  {loadingData ? (
                    <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
                  ) : targetMode === "SELECTED" ? (
                    selectedUserIds.length
                  ) : (
                    approvedCount
                  )}
                </span>
              </div>
            </div>

            {/* Info callout */}
            <div className="mt-3 p-2.5 rounded-lg bg-brand/5 border border-brand/10">
              <p className="text-2xs text-text-tertiary leading-relaxed">
                {targetMode === "SELECTED" ? (
                  <>
                    <span className="text-brand font-medium">
                      {selectedUserIds.length} selected user
                      {selectedUserIds.length !== 1 ? "s" : ""}
                    </span>{" "}
                    will be affected by this trade based on their allocated
                    balance.
                  </>
                ) : (
                  <>
                    Results will be automatically applied to all{" "}
                    <span className="text-brand font-medium">
                      {approvedCount} approved
                    </span>{" "}
                    follower{approvedCount !== 1 ? "s" : ""} based on their
                    allocated balance.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Recent Trades */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-warning/10">
                  <BarChart3 className="w-3.5 h-3.5 text-warning" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Recent Trades
                </h3>
              </div>
              <Link
                href="/dashboard/trader"
                className="text-2xs text-brand hover:text-brand-light transition-colors flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loadingData ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : recentTrades.length > 0 ? (
              <div className="space-y-2">
                {recentTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="p-3 rounded-lg bg-surface-1 hover:bg-surface-3 transition-colors border border-border"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-text-primary truncate max-w-[140px]">
                        {trade.tradeName}
                      </span>
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          trade.resultPercent >= 0
                            ? "text-success"
                            : "text-danger"
                        }`}
                      >
                        {trade.resultPercent >= 0 ? "+" : ""}
                        {trade.resultPercent}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xs text-text-tertiary">
                        {trade.market} &middot;{" "}
                        {new Date(trade.tradeDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span
                        className={`text-2xs font-medium tabular-nums ${
                          trade.profitLoss >= 0
                            ? "text-success"
                            : "text-danger"
                        }`}
                      >
                        {trade.profitLoss >= 0 ? "+" : ""}
                        {formatCurrency(trade.profitLoss)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning/10 to-warning/5 flex items-center justify-center mx-auto mb-2 border border-warning/10">
                  <BarChart3 className="w-5 h-5 text-text-tertiary" />
                </div>
                <p className="text-xs text-text-tertiary">No trades yet</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
