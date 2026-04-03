"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Trophy,
  Clock,
  Flame,
  Loader2,
  Calendar,
  Target,
  CheckCircle2,
} from "lucide-react";
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { Skeleton } from "@/components/ui/loading-skeleton";
import Image from "next/image";

/* ─────────────────────────── Types ─────────────────────────── */

interface TraderProfilePanelProps {
  traderId: string | null;
  onClose: () => void;
  onRequestCopy?: (traderId: string, traderName: string) => void;
}

interface MarketBreakdownItem {
  market: string;
  count: number;
  pnl: number;
}

interface RecentTrade {
  id: string;
  tradeName: string;
  market: string;
  tradeType: string;
  resultPercent: number;
  profitLoss: number;
  tradeDate: string;
}

interface TraderProfileData {
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
  computedStats: {
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
    marketBreakdown: MarketBreakdownItem[];
  };
  recentTrades: RecentTrade[];
  reviews: {
    averageRating: number;
    totalReviews: number;
    list: Array<{
      userId: string;
      userName: string;
      userAvatar: string | null;
      rating: number;
      comment: string | null;
      createdAt: string;
    }>;
  };
  viewer?: {
    isFollowing: boolean;
    copyRequestStatus: string | null;
  };
}

/* ─────────────────────── Sparkline SVG ─────────────────────── */

function PnlSparkline({ trades }: { trades: RecentTrade[] }) {
  if (trades.length < 2) {
    return (
      <div className="flex items-center justify-center h-16 text-xs text-text-tertiary">
        Not enough data
      </div>
    );
  }

  const reversed = [...trades].reverse();
  const values = reversed.map((t) => t.profitLoss);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const WIDTH = 320;
  const HEIGHT = 64;
  const PADDING_Y = 4;
  const usableHeight = HEIGHT - PADDING_Y * 2;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * WIDTH;
    const y = PADDING_Y + usableHeight - ((v - min) / range) * usableHeight;
    return { x, y };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const lastValue = values[values.length - 1];
  const isPositive = lastValue >= 0;
  const strokeColor = isPositive ? "#34d399" : "#f87171";
  const gradientId = "sparkline-grad";

  const areaD = `${pathD} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full h-16"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current value dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        fill={strokeColor}
      />
    </svg>
  );
}

/* ─────────────────── Avatar Initials ──────────────────────── */

const AVATAR_GRADIENTS = [
  "from-blue-500 to-cyan-400",
  "from-violet-500 to-purple-400",
  "from-amber-500 to-orange-400",
  "from-emerald-500 to-teal-400",
  "from-rose-500 to-pink-400",
  "from-indigo-500 to-blue-400",
];

function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ─────────────── Loading Skeleton ──────────────────────────── */

function PanelSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-panel p-3 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
      {/* Chart */}
      <div className="glass-panel p-4 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full" />
      </div>
      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      {/* Button */}
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}

/* ───────────────────── Panel Component ─────────────────────── */

const SLIDE_DURATION = 0.35;
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function TraderProfilePanel({
  traderId,
  onClose,
  onRequestCopy,
}: TraderProfilePanelProps) {
  const [data, setData] = useState<TraderProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = traderId !== null;

  /* ── Fetch trader data ── */
  const fetchTrader = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/traders/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to load trader profile");
      }
      const json = await res.json();
      setData(json.trader);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (traderId) {
      fetchTrader(traderId);
    } else {
      setData(null);
      setError(null);
    }
  }, [traderId, fetchTrader]);

  /* ── Escape key ── */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  /* ── Derive connection status ── */
  const connectionStatus = data?.viewer
    ? data.viewer.isFollowing
      ? "following"
      : data.viewer.copyRequestStatus === "PENDING"
        ? "pending"
        : "none"
    : "none";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ duration: SLIDE_DURATION, ease: EASE }}
            className={cn(
              "relative z-10 h-full overflow-y-auto",
              "w-full max-w-md md:w-[28rem]",
              "bg-surface-1/95 backdrop-blur-xl",
              "border-l border-border-primary",
              "shadow-2xl shadow-black/40"
            )}
          >
            {/* Close button */}
            <div className="sticky top-0 z-20 flex justify-end p-4 pb-0">
              <button
                onClick={onClose}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  "bg-surface-3/80 backdrop-blur-sm",
                  "hover:bg-surface-4 text-text-tertiary hover:text-text-primary"
                )}
                aria-label="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            {loading && <PanelSkeleton />}

            {error && (
              <div className="flex flex-col items-center justify-center h-64 gap-3 px-6">
                <div className="text-red-400 text-sm text-center">{error}</div>
                <button
                  onClick={() => traderId && fetchTrader(traderId)}
                  className="text-sm text-accent-primary hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {data && !loading && (
              <div className="px-6 pb-8 space-y-6">
                {/* ── Header ── */}
                <div className="flex items-start gap-4">
                  {data.avatar ? (
                    <Image
                      src={data.avatar}
                      alt={data.displayName}
                      width={64}
                      height={64}
                      className="flex-shrink-0 w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className={cn(
                        "flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center",
                        "bg-gradient-to-br text-white font-bold text-xl",
                        getGradient(data.displayName)
                      )}
                    >
                      {getInitials(data.displayName)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-text-primary truncate">
                        {data.displayName}
                      </h2>
                      {data.isActive && (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active
                        </span>
                      )}
                    </div>
                    {data.bio && (
                      <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                        {data.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Performance badge ── */}
                {data.performancePct !== null && data.performancePct !== undefined && (
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg",
                      data.performancePct >= 0
                        ? "bg-emerald-500/10 border border-emerald-500/20"
                        : "bg-red-500/10 border border-red-500/20"
                    )}
                  >
                    {data.performancePct >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        data.performancePct >= 0 ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {formatPercent(data.performancePct)} Performance
                    </span>
                  </div>
                )}

                {/* ── Stats Grid ── */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Total PnL"
                    value={formatCurrency(data.totalPnl)}
                    icon={<TrendingUp className="w-4 h-4" />}
                    valueClassName={
                      data.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
                    }
                  />
                  <StatCard
                    label="Win Rate"
                    value={`${data.winRate.toFixed(1)}%`}
                    icon={<Trophy className="w-4 h-4" />}
                    valueClassName={
                      data.winRate >= 50 ? "text-emerald-400" : "text-amber-400"
                    }
                  />
                  <StatCard
                    label="Total Trades"
                    value={data.totalTrades.toLocaleString()}
                    icon={<BarChart3 className="w-4 h-4" />}
                    valueClassName="text-text-primary"
                  />
                  <StatCard
                    label="Followers"
                    value={data.followerCount.toLocaleString()}
                    icon={<Users className="w-4 h-4" />}
                    valueClassName="text-text-primary"
                  />
                </div>

                {/* ── Streak ── */}
                {data.computedStats.streak > 1 && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Flame
                      className={cn(
                        "w-4 h-4",
                        data.computedStats.streakType === "win"
                          ? "text-emerald-400"
                          : "text-red-400"
                      )}
                    />
                    <span>
                      {data.computedStats.streak}{" "}
                      {data.computedStats.streakType === "win" ? "win" : "loss"} streak
                    </span>
                  </div>
                )}

                {/* ── Mini PnL Chart ── */}
                {data.recentTrades.length >= 2 && (
                  <div className="glass-panel p-4 space-y-2">
                    <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                      Recent PnL
                    </h3>
                    <PnlSparkline trades={data.recentTrades} />
                  </div>
                )}

                {/* ── Description ── */}
                {data.description && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                      About
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {data.description}
                    </p>
                  </div>
                )}

                {/* ── Market Breakdown ── */}
                {data.computedStats.marketBreakdown.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                      Market Breakdown
                    </h3>
                    <div className="space-y-2">
                      {data.computedStats.marketBreakdown.map((item) => {
                        const maxCount = data.computedStats.marketBreakdown[0].count;
                        const pctWidth = (item.count / maxCount) * 100;
                        return (
                          <div key={item.market} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Target className="w-3.5 h-3.5 text-text-tertiary" />
                                <span className="text-text-primary font-medium">
                                  {item.market}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-text-tertiary text-xs">
                                  {item.count} trades
                                </span>
                                <span
                                  className={cn(
                                    "text-xs font-medium",
                                    item.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                                  )}
                                >
                                  {formatCurrency(item.pnl)}
                                </span>
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div className="h-1 rounded-full bg-surface-4 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  item.pnl >= 0 ? "bg-emerald-500/60" : "bg-red-500/60"
                                )}
                                style={{ width: `${pctWidth}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Connection Status & Action ── */}
                <div className="space-y-3 pt-2">
                  {/* Status indicator */}
                  {connectionStatus !== "none" && (
                    <div
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                        connectionStatus === "following"
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                      )}
                    >
                      {connectionStatus === "following" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      <span className="font-medium">
                        {connectionStatus === "following"
                          ? "You are following this trader"
                          : "Copy request pending approval"}
                      </span>
                    </div>
                  )}

                  {/* Action button */}
                  {connectionStatus === "none" && onRequestCopy && (
                    <button
                      onClick={() => onRequestCopy(data.id, data.displayName)}
                      className={cn(
                        "w-full py-3 px-4 rounded-lg font-medium text-sm transition-all",
                        "bg-accent-primary hover:bg-accent-primary/90",
                        "text-white shadow-lg shadow-accent-primary/20",
                        "hover:shadow-xl hover:shadow-accent-primary/30",
                        "active:scale-[0.98]"
                      )}
                    >
                      Request Copy Trading
                    </button>
                  )}

                  {connectionStatus === "pending" && (
                    <button
                      disabled
                      className={cn(
                        "w-full py-3 px-4 rounded-lg font-medium text-sm",
                        "bg-amber-500/15 text-amber-400 border border-amber-500/20",
                        "cursor-not-allowed flex items-center justify-center gap-2"
                      )}
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Pending Approval
                    </button>
                  )}

                  {connectionStatus === "following" && (
                    <button
                      disabled
                      className={cn(
                        "w-full py-3 px-4 rounded-lg font-medium text-sm",
                        "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
                        "cursor-not-allowed flex items-center justify-center gap-2"
                      )}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Following
                    </button>
                  )}
                </div>

                {/* ── Joined date ── */}
                <div className="flex items-center gap-2 pt-2 text-xs text-text-tertiary">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Joined {formatDate(data.joinedAt)}</span>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ────────────────── Stat Card Sub-component ────────────────── */

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClassName?: string;
}

function StatCard({ label, value, icon, valueClassName }: StatCardProps) {
  return (
    <div className="glass-panel p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-text-tertiary">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={cn("text-lg font-semibold", valueClassName)}>{value}</div>
    </div>
  );
}
