"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Gift,
  Copy,
  Check,
  Link2,
  Users,
  DollarSign,
  Loader2,
  Clock,
  CheckCircle2,
  Sparkles,
  Info,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ReferredUser {
  id: string;
  name: string;
  avatar: string | null;
  joinedAt: string;
}

interface Referral {
  id: string;
  referredUser: ReferredUser | null;
  amount: number;
  status: "PENDING" | "CREDITED";
  creditedAt: string | null;
  createdAt: string;
}

interface ReferralData {
  referralCode: string;
  referrals: Referral[];
  totalReferrals: number;
  totalRewardsEarned: number;
}

/* -------------------------------------------------------------------------- */
/*  Status config                                                             */
/* -------------------------------------------------------------------------- */

const STATUS_CONFIG: Record<
  string,
  { icon: typeof Clock; label: string; className: string }
> = {
  PENDING: {
    icon: Clock,
    label: "Pending",
    className: "text-amber-400 bg-amber-400/10",
  },
  CREDITED: {
    icon: CheckCircle2,
    label: "Credited",
    className: "text-emerald-400 bg-emerald-400/10",
  },
};

/* -------------------------------------------------------------------------- */
/*  CopyBox                                                                   */
/* -------------------------------------------------------------------------- */

function CopyBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm font-mono text-text-primary truncate select-all">
          {value}
        </code>
        <button
          onClick={handleCopy}
          className="btn-primary h-[42px] w-[42px] flex items-center justify-center shrink-0"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  /* ── Fetch referral data ── */
  const fetchReferrals = useCallback(async () => {
    try {
      const res = await fetch("/api/referrals");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  /* ── Generate referral code ── */
  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-code" }),
      });

      if (res.ok) {
        await fetchReferrals();
      }
    } catch {
      /* silent */
    } finally {
      setGenerating(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  /* ── No referral code — prompt to generate ── */
  if (!data?.referralCode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center justify-center h-[60vh] text-center px-4"
      >
        <div className="p-5 rounded-3xl bg-gradient-to-br from-brand/10 to-brand/5 border border-brand/20 shadow-sm mb-6 flex items-center justify-center">
          <Gift className="w-10 h-10 text-brand" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Start Referring Friends
        </h1>
        <p className="text-sm text-text-secondary max-w-md mb-8">
          Generate your unique referral code and earn rewards when your friends
          sign up and start trading.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary flex items-center gap-2 disabled:opacity-40"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Generate Referral Code
        </button>
      </motion.div>
    );
  }

  /* ── Main referral dashboard ── */
  const pendingCount = data.referrals.filter((r) => r.status === "PENDING").length;
  const creditedCount = data.referrals.filter((r) => r.status === "CREDITED").length;

  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/signup?ref=${data.referralCode}`
      : `/signup?ref=${data.referralCode}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Referrals</h1>
        <p className="text-sm text-text-secondary mt-1">
          Share your code and earn rewards for every friend who joins
        </p>
      </div>

      {/* ── How Referrals Work ── */}
      <div className="glass-panel p-4 flex items-start gap-3 mb-6">
        <div className="p-2 rounded-lg bg-info/10 shrink-0">
          <Info className="w-4 h-4 text-info" />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">How Referrals Work</p>
          <p className="text-xs text-text-tertiary mt-0.5">
            Share your referral link with friends. When they sign up and start trading,
            you earn a commission on their trading fees. Track your referrals and rewards below.
          </p>
        </div>
      </div>

      {/* ── Referral Code + Share Link ── */}
      <div className="glass-panel p-6 mb-6 space-y-5">
        <CopyBox
          label="Your Referral Code"
          value={data.referralCode}
          icon={Gift}
        />
        <CopyBox label="Share Link" value={shareLink} icon={Link2} />
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="glass-panel p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm font-medium text-text-secondary">
              Total Referrals
            </span>
          </div>
          <p className="text-3xl font-bold text-text-primary">
            {data.totalReferrals}
          </p>
          {data.totalReferrals > 0 && (
            <p className="text-xs text-text-tertiary mt-1">
              {pendingCount} pending, {creditedCount} credited
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="glass-panel p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-text-secondary">
              Rewards Earned
            </span>
          </div>
          <p className="text-3xl font-bold text-text-primary">
            {formatCurrency(data.totalRewardsEarned)}
          </p>
          {creditedCount > 0 && (
            <p className="text-xs text-text-tertiary mt-1">
              From {creditedCount} credited {creditedCount === 1 ? "referral" : "referrals"}
            </p>
          )}
        </motion.div>
      </div>

      {/* ── Referred Users Table ── */}
      <div className="glass-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">
            Referred Users
          </h2>
        </div>

        {data.referrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-surface-2 to-surface-3 border border-border shadow-sm mb-4">
              <Users className="w-10 h-10 text-text-tertiary/40" />
            </div>
            <p className="text-sm text-text-tertiary">No referrals yet</p>
            <p className="text-xs text-text-tertiary/70 mt-1 max-w-xs">
              Share your referral link to start earning rewards
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-text-tertiary uppercase tracking-wider px-5 py-3">
                      User
                    </th>
                    <th className="text-left text-xs font-medium text-text-tertiary uppercase tracking-wider px-5 py-3">
                      Date Joined
                    </th>
                    <th className="text-left text-xs font-medium text-text-tertiary uppercase tracking-wider px-5 py-3">
                      Reward
                    </th>
                    <th className="text-left text-xs font-medium text-text-tertiary uppercase tracking-wider px-5 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.referrals.map((referral, idx) => {
                    const cfg = STATUS_CONFIG[referral.status] ?? STATUS_CONFIG.PENDING;
                    const StatusIcon = cfg.icon;

                    return (
                      <motion.tr
                        key={referral.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: idx * 0.04,
                          duration: 0.25,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="hover:bg-surface-2/50 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-xs font-semibold text-text-secondary shrink-0">
                              {referral.referredUser?.name
                                ?.charAt(0)
                                ?.toUpperCase() ?? "?"}
                            </div>
                            <span className="text-sm font-medium text-text-primary truncate">
                              {referral.referredUser?.name ?? "Unknown User"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-text-secondary">
                          {referral.referredUser?.joinedAt
                            ? formatDate(referral.referredUser.joinedAt)
                            : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-text-primary">
                          {formatCurrency(referral.amount)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {data.referrals.map((referral, idx) => {
                const cfg = STATUS_CONFIG[referral.status] ?? STATUS_CONFIG.PENDING;
                const StatusIcon = cfg.icon;

                return (
                  <motion.div
                    key={referral.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: idx * 0.04,
                      duration: 0.25,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-xs font-semibold text-text-secondary shrink-0">
                          {referral.referredUser?.name
                            ?.charAt(0)
                            ?.toUpperCase() ?? "?"}
                        </div>
                        <span className="text-sm font-medium text-text-primary">
                          {referral.referredUser?.name ?? "Unknown User"}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-tertiary">
                      <span>
                        Joined{" "}
                        {referral.referredUser?.joinedAt
                          ? formatDate(referral.referredUser.joinedAt)
                          : "—"}
                      </span>
                      <span className="font-medium text-text-primary">
                        {formatCurrency(referral.amount)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Status legend */}
            <div className="px-5 py-3 border-t border-border flex items-center gap-4 text-2xs text-text-tertiary">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                Pending — awaiting first trade
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Credited — reward earned
              </span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
