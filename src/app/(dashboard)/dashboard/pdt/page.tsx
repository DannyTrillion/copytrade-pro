"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  TrendingUp,
  Shield,
  Info,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  XCircle,
  Sparkles,
} from "lucide-react";
import { TierGate } from "@/components/ui/tier-gate";
import { TIERS } from "@/config/constants";
import { cn } from "@/lib/utils";

type PdtStatus = "available" | "requested" | "approved" | "denied";

interface PdtData {
  status: PdtStatus;
  requestedAt: string | null;
  dayTradeCount: number;
  maxBeforePDT: number;
}

const STATUS_META: Record<
  PdtStatus,
  { label: string; color: string; bg: string; ring: string; icon: typeof CheckCircle2; description: string }
> = {
  available: {
    label: "Available to activate",
    color: "text-text-secondary",
    bg: "bg-surface-2",
    ring: "ring-border",
    icon: Sparkles,
    description: "Request PDT account access to make unlimited day trades.",
  },
  requested: {
    label: "Under review",
    color: "text-warning",
    bg: "bg-warning/10",
    ring: "ring-warning/30",
    icon: Clock,
    description: "Your request is being reviewed by our compliance team — typically within 1 business day.",
  },
  approved: {
    label: "Active",
    color: "text-success",
    bg: "bg-success/10",
    ring: "ring-success/30",
    icon: CheckCircle2,
    description: "Pattern Day Trading is active. You can execute unlimited intraday trades.",
  },
  denied: {
    label: "Request denied",
    color: "text-danger",
    bg: "bg-danger/10",
    ring: "ring-danger/30",
    icon: XCircle,
    description: "Your most recent request was not approved. Contact your account manager for details.",
  },
};

export default function PdtPage() {
  return (
    <TierGate
      required={TIERS.TIER_4}
      featureName="PDT Account Access"
      description="Diamond members can request Pattern Day Trading status — the regulatory designation that allows unlimited intraday trades on a single account."
    >
      <PdtContent />
    </TierGate>
  );
}

function PdtContent() {
  const [data, setData] = useState<PdtData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/pdt")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRequest = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/pdt", { method: "POST" });
      if (res.ok) {
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Request failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
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

  if (!data) return null;

  const meta = STATUS_META[data.status];
  const StatusIcon = meta.icon;
  const remainingTrades = Math.max(0, data.maxBeforePDT - data.dayTradeCount);

  return (
    <div className="dashboard-section space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-violet-400" />
          <h1 className="text-lg font-semibold text-text-primary">Pattern Day Trading</h1>
        </div>
        <p className="text-sm text-text-tertiary">
          Unlock unlimited day trades — exclusive to Diamond members with eligible accounts.
        </p>
      </motion.div>

      {/* Status hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={cn("relative overflow-hidden glass-panel p-6 rounded-2xl ring-1", meta.ring)}
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", meta.bg)}>
              <StatusIcon className={cn("w-5 h-5", meta.color)} />
            </div>
            <div>
              <p className="text-2xs uppercase tracking-wider text-text-tertiary font-medium">
                PDT Status
              </p>
              <p className={cn("text-lg font-bold", meta.color)}>{meta.label}</p>
            </div>
          </div>

          {data.status === "available" && (
            <button
              onClick={handleRequest}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 active:scale-95"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Request PDT activation
            </button>
          )}

          {data.status === "approved" && (
            <div className="text-right">
              <p className="text-2xs text-text-tertiary">Day trades (last 5 days)</p>
              <p className="text-xl font-bold text-success tabular-nums">{data.dayTradeCount}</p>
            </div>
          )}
        </div>

        <p className={cn("relative text-sm mt-4", meta.color)}>{meta.description}</p>

        {error && (
          <p className="relative text-xs text-danger mt-2 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
      </motion.div>

      {/* Day trade counter (only if not approved) */}
      {data.status !== "approved" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-5 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-text-tertiary font-medium">
                Day trades remaining (5-day window)
              </p>
              <p className="text-2xs text-text-tertiary mt-0.5">
                Non-PDT accounts are limited to {data.maxBeforePDT} day trades per 5 business days.
              </p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-text-primary">
              {remainingTrades}
              <span className="text-sm font-normal text-text-tertiary"> / {data.maxBeforePDT}</span>
            </p>
          </div>
          <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                remainingTrades === 0
                  ? "bg-danger"
                  : remainingTrades <= 1
                  ? "bg-warning"
                  : "bg-success"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${(remainingTrades / data.maxBeforePDT) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      )}

      {/* Feature grid */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        {[
          {
            icon: TrendingUp,
            title: "Unlimited day trades",
            body: "Execute as many intraday trades as your strategy demands — no 3-per-5-day cap.",
          },
          {
            icon: Zap,
            title: "Faster execution",
            body: "PDT-flagged accounts get prioritized order routing for tighter fills.",
          },
          {
            icon: Shield,
            title: "Regulatory compliance",
            body: "$25,000 minimum equity required — automatic monitoring keeps you compliant.",
          },
        ].map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="glass-panel p-4 rounded-2xl"
          >
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center mb-3">
              <f.icon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">{f.title}</h3>
            <p className="text-xs text-text-tertiary leading-relaxed">{f.body}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Compliance note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex items-start gap-2 p-4 rounded-xl bg-surface-1 border border-border"
      >
        <Info className="w-4 h-4 text-text-tertiary shrink-0 mt-0.5" />
        <p className="text-2xs text-text-tertiary leading-relaxed">
          PDT designation is regulated by FINRA Rule 4210. Your account must maintain a minimum
          equity of $25,000. Falling below this threshold while PDT is active may result in a
          90-day trading restriction. Your dedicated account manager will guide you through
          activation and ongoing compliance.
        </p>
      </motion.div>
    </div>
  );
}
