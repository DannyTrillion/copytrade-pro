"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  ArrowLeft,
  Share2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  MessageSquare,
  ExternalLink,
  Check,
  AlertCircle,
  Target,
  Flame,
  Calendar,
  DollarSign,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent, formatDate, formatNumber } from "@/lib/utils";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { StarRating } from "@/components/ui/star-rating";

// ── Types ──

interface TraderTrade {
  id: string;
  tradeName: string;
  market: string;
  tradeType: string | null;
  resultPercent: number | null;
  profitLoss: number;
  tradeDate: string;
}

interface TraderReview {
  userId: string;
  userName: string | null;
  userAvatar: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface MarketBreakdown {
  market: string;
  count: number;
  pnl: number;
}

interface ComputedStats {
  totalTradesCount: number;
  wins: number;
  losses: number;
  computedWinRate: number;
  avgTradePercent: number;
  bestTrade: number;
  worstTrade: number;
  totalProfitFromTrades: number;
  streak: number;
  streakType: "win" | "loss" | "none";
  marketBreakdown: MarketBreakdown[];
}

interface TraderProfile {
  id: string;
  displayName: string;
  bio: string | null;
  description: string | null;
  avatar: string | null;
  performancePct: number | null;
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  isActive: boolean;
  followerCount: number;
  joinedAt: string;
  computedStats: ComputedStats;
  recentTrades: TraderTrade[];
  reviews: {
    averageRating: number;
    totalReviews: number;
    list: TraderReview[];
  };
  viewer?: {
    isFollowing: boolean;
    copyRequestStatus: string | null;
  };
}

// ── Animation variants ──

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: EASE_OUT_EXPO },
  }),
};

// ── Helpers ──

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const MARKET_COLORS: Record<string, { bg: string; text: string }> = {
  FOREX: { bg: "bg-blue-500/15", text: "text-blue-400" },
  CRYPTO: { bg: "bg-amber-500/15", text: "text-amber-400" },
  INDICES: { bg: "bg-purple-500/15", text: "text-purple-400" },
  COMMODITIES: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  STOCKS: { bg: "bg-cyan-500/15", text: "text-cyan-400" },
  POLYMARKET: { bg: "bg-orange-500/15", text: "text-orange-400" },
};

function getMarketColor(market: string) {
  return MARKET_COLORS[market.toUpperCase()] ?? { bg: "bg-surface-3", text: "text-text-secondary" };
}

// ── Component ──

export default function TraderProfilePage() {
  const params = useParams<{ traderId: string }>();
  const router = useRouter();
  const [trader, setTrader] = useState<TraderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const traderId = params.traderId;

  const fetchTrader = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/traders/${traderId}`);
      if (!res.ok) {
        setError(res.status === 404 ? "not_found" : "failed");
        return;
      }
      const data = await res.json();
      setTrader(data.trader);
    } catch {
      setError("failed");
    } finally {
      setLoading(false);
    }
  }, [traderId]);

  useEffect(() => {
    if (traderId) fetchTrader();
  }, [traderId, fetchTrader]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  // ── Error / Not Found ──
  if (error || !trader) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4 px-6"
        >
          <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-text-tertiary" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">
            {error === "not_found" ? "Trader Not Found" : "Something Went Wrong"}
          </h1>
          <p className="text-text-secondary text-sm max-w-sm">
            {error === "not_found"
              ? "This trader profile doesn't exist or may have been removed."
              : "We couldn't load this profile. Please try again."}
          </p>
          <button onClick={() => router.back()} className="btn-secondary text-sm mt-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  const cs = trader.computedStats;

  return (
    <div className="min-h-screen bg-surface-0">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 md:space-y-8">
        {/* ── Header bar ── */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-between"
        >
          <button
            onClick={() => router.back()}
            className="btn-secondary text-sm gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <button
            onClick={handleShare}
            className="btn-secondary text-sm gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-success" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </>
            )}
          </button>
        </motion.div>

        {/* ── Profile header ── */}
        <motion.div
          custom={0.05}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="glass-panel p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-brand to-success flex items-center justify-center flex-shrink-0 shadow-glow border-2 border-border">
              {trader.avatar ? (
                <Image
                  src={trader.avatar}
                  alt={trader.displayName}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {getInitials(trader.displayName)}
                </span>
              )}
            </div>

            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-2xl font-bold text-text-primary truncate">
                  {trader.displayName}
                </h1>
                {trader.isActive && (
                  <span className="badge-success self-center sm:self-auto">Active</span>
                )}
              </div>
              {trader.bio && (
                <p className="text-text-secondary text-sm mt-1.5 max-w-lg">
                  {trader.bio}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-3">
                {/* Performance badge */}
                {trader.performancePct !== null && trader.performancePct !== undefined && (
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border",
                    trader.performancePct >= 0
                      ? "bg-success/10 border-success/20"
                      : "bg-danger/10 border-danger/20"
                  )}>
                    {trader.performancePct >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-success" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-danger" />
                    )}
                    <span className={cn(
                      "text-sm font-semibold",
                      trader.performancePct >= 0 ? "text-success" : "text-danger"
                    )}>
                      {formatPercent(trader.performancePct)} Performance
                    </span>
                  </div>
                )}

                {/* Streak badge */}
                {cs.streak >= 2 && cs.streakType !== "none" && (
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border",
                    cs.streakType === "win"
                      ? "bg-success/10 border-success/20"
                      : "bg-danger/10 border-danger/20"
                  )}>
                    <Flame className={cn(
                      "w-4 h-4",
                      cs.streakType === "win" ? "text-success" : "text-danger"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
                      cs.streakType === "win" ? "text-success" : "text-danger"
                    )}>
                      {cs.streak} {cs.streakType === "win" ? "Win" : "Loss"} Streak
                    </span>
                  </div>
                )}

                {/* Joined date */}
                <div className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {formatDate(trader.joinedAt)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Stats row — 4 primary ── */}
        <motion.div
          custom={0.1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="stat-grid"
        >
          {[
            {
              label: "Total PnL",
              value: formatCurrency(trader.totalPnl),
              icon: DollarSign,
              color: trader.totalPnl >= 0 ? "text-success" : "text-danger",
            },
            {
              label: "Win Rate",
              value: `${trader.winRate.toFixed(1)}%`,
              sub: `${cs.wins}W / ${cs.losses}L`,
              icon: Target,
              color: "text-warning",
            },
            {
              label: "Total Trades",
              value: formatNumber(cs.totalTradesCount),
              icon: BarChart3,
              color: "text-brand",
            },
            {
              label: "Followers",
              value: formatNumber(trader.followerCount),
              icon: Users,
              color: "text-info",
            },
          ].map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2 rounded-lg bg-surface-3", stat.color)}>
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-semibold text-text-primary number-value">
                {stat.value}
              </p>
              <p className="text-xs text-text-tertiary mt-1">{stat.label}</p>
              {"sub" in stat && stat.sub && (
                <p className="text-2xs text-text-quaternary mt-0.5">{stat.sub}</p>
              )}
            </div>
          ))}
        </motion.div>

        {/* ── Extended stats row ── */}
        <motion.div
          custom={0.13}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            {
              label: "Avg Trade",
              value: `${cs.avgTradePercent >= 0 ? "+" : ""}${cs.avgTradePercent}%`,
              color: cs.avgTradePercent >= 0 ? "text-success" : "text-danger",
            },
            {
              label: "Best Trade",
              value: `+${cs.bestTrade}%`,
              color: "text-success",
            },
            {
              label: "Worst Trade",
              value: `${cs.worstTrade}%`,
              color: "text-danger",
            },
            {
              label: "Trade PnL",
              value: formatCurrency(cs.totalProfitFromTrades),
              color: cs.totalProfitFromTrades >= 0 ? "text-success" : "text-danger",
            },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-xl bg-surface-1 border border-border">
              <p className="text-2xs text-text-tertiary mb-1">{item.label}</p>
              <p className={cn("text-sm font-semibold tabular-nums", item.color)}>
                {item.value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* ── Two-column layout: About + Action ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* About section */}
          <motion.div
            custom={0.15}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="md:col-span-2 glass-panel p-6"
          >
            <h2 className="text-lg font-semibold text-text-primary mb-3">About</h2>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {trader.description || trader.bio || "This trader hasn't added a description yet."}
            </p>

            {/* Market breakdown */}
            {cs.marketBreakdown.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <PieChart className="w-4 h-4 text-text-tertiary" />
                  <h3 className="text-sm font-semibold text-text-primary">Markets Traded</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {cs.marketBreakdown.map((m) => {
                    const mc = getMarketColor(m.market);
                    return (
                      <div
                        key={m.market}
                        className="p-3 rounded-lg bg-surface-1 border border-border"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={cn(
                            "inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full",
                            mc.bg, mc.text
                          )}>
                            {m.market}
                          </span>
                          <span className="text-2xs text-text-tertiary">{m.count} trades</span>
                        </div>
                        <p className={cn(
                          "text-xs font-semibold tabular-nums",
                          m.pnl >= 0 ? "text-success" : "text-danger"
                        )}>
                          {m.pnl >= 0 ? "+" : ""}{formatCurrency(m.pnl)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* Action card */}
          <motion.div
            custom={0.2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="glass-panel p-6 flex flex-col justify-between"
          >
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Follow this Trader
              </h2>
              <p className="text-xs text-text-tertiary mb-4">
                Copy their trades automatically and track performance in real time.
              </p>
            </div>
            <div className="space-y-3">
              {trader.viewer?.isFollowing ? (
                <a
                  href={`/dashboard/messages`}
                  className="btn-primary w-full text-sm gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message Trader
                </a>
              ) : (
                <a
                  href={`/dashboard/follower`}
                  className="btn-primary w-full text-sm gap-2"
                >
                  <Users className="w-4 h-4" />
                  Start Copy Trading
                </a>
              )}

              {/* Reviews summary */}
              {trader.reviews.totalReviews > 0 && (
                <div className="p-3 rounded-lg bg-surface-1 border border-border text-center">
                  <StarRating rating={Math.round(trader.reviews.averageRating)} size="sm" />
                  <p className="text-xs text-text-secondary mt-1">
                    {trader.reviews.averageRating.toFixed(1)} / 5 ({trader.reviews.totalReviews} reviews)
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Recent Trades ── */}
        <motion.div
          custom={0.25}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="glass-panel overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Recent Trades</h2>
            <span className="text-xs text-text-tertiary">
              {trader.recentTrades.length} shown
            </span>
          </div>

          {trader.recentTrades.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <BarChart3 className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
              <p className="text-sm text-text-tertiary">No trades recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-surface-1/30">
                    <th className="table-header px-6 py-3 text-left">Trade</th>
                    <th className="table-header px-4 py-3 text-left">Market</th>
                    <th className="table-header px-4 py-3 text-center">Type</th>
                    <th className="table-header px-4 py-3 text-right">Result</th>
                    <th className="table-header px-4 py-3 text-right">P&L</th>
                    <th className="table-header px-6 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {trader.recentTrades.map((trade) => {
                    const mc = getMarketColor(trade.market);
                    return (
                      <tr key={trade.id} className="table-row">
                        <td className="table-cell px-6 font-medium text-text-primary">
                          {trade.tradeName}
                        </td>
                        <td className="table-cell px-4">
                          <span className={cn(
                            "inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full",
                            mc.bg, mc.text
                          )}>
                            {trade.market}
                          </span>
                        </td>
                        <td className="table-cell px-4 text-center">
                          {trade.tradeType ? (
                            <span className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded",
                              trade.tradeType === "BUY"
                                ? "bg-success/10 text-success"
                                : "bg-danger/10 text-danger"
                            )}>
                              {trade.tradeType}
                            </span>
                          ) : (
                            <span className="text-text-quaternary text-xs">—</span>
                          )}
                        </td>
                        <td
                          className={cn(
                            "table-cell px-4 text-right font-mono font-medium text-sm",
                            trade.resultPercent !== null && trade.resultPercent >= 0
                              ? "text-success"
                              : "text-danger"
                          )}
                        >
                          {trade.resultPercent !== null
                            ? `${trade.resultPercent >= 0 ? "+" : ""}${trade.resultPercent.toFixed(1)}%`
                            : "—"}
                        </td>
                        <td
                          className={cn(
                            "table-cell px-4 text-right font-medium text-sm tabular-nums",
                            trade.profitLoss >= 0 ? "text-success" : "text-danger"
                          )}
                        >
                          {trade.profitLoss >= 0 ? "+" : ""}{formatCurrency(trade.profitLoss)}
                        </td>
                        <td className="table-cell px-6 text-right text-text-secondary text-xs">
                          {formatDate(trade.tradeDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* ── Reviews section ── */}
        <motion.div
          custom={0.3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="glass-panel overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Reviews</h2>
              {trader.reviews.totalReviews > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <StarRating rating={Math.round(trader.reviews.averageRating)} size="sm" />
                  <span className="text-sm font-medium text-text-primary">
                    {trader.reviews.averageRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    ({trader.reviews.totalReviews}{" "}
                    {trader.reviews.totalReviews === 1 ? "review" : "reviews"})
                  </span>
                </div>
              )}
            </div>
            {!trader.viewer?.isFollowing && (
              <a
                href={`/dashboard/follower`}
                className="btn-secondary text-sm gap-2 self-start sm:self-auto"
              >
                <ExternalLink className="w-4 h-4" />
                Write a Review
              </a>
            )}
          </div>

          {trader.reviews.list.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <MessageSquare className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
              <p className="text-sm text-text-tertiary">
                No reviews yet. Be the first to review this trader.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {trader.reviews.list.map((review) => (
                <div key={`${review.userId}-${review.createdAt}`} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    {/* Reviewer avatar */}
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
                      {review.userAvatar ? (
                        <Image
                          src={review.userAvatar}
                          alt={review.userName || "User"}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-white">
                          {getInitials(review.userName)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-3">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {review.userName || "Anonymous"}
                        </span>
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                      {review.comment && (
                        <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                      <p className="text-xs text-text-tertiary mt-1.5">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ── Loading skeleton ──

function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-20 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
      <div className="glass-panel p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-8 w-36 rounded-md" />
          </div>
        </div>
      </div>
      <div className="stat-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-panel p-4 space-y-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="glass-panel p-6 space-y-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="glass-panel p-4">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
