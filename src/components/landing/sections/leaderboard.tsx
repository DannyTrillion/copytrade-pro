"use client";

import { motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { useRef, useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";

interface LeaderboardTrader {
  rank: number;
  displayName: string;
  avatar: string | null;
  performancePct: number;
  winRate: number;
  totalTrades: number;
  totalPnl: number;
  followers: number;
}

const RANK_BADGES: Record<number, { label: string; bg: string; text: string; ring: string }> = {
  1: { label: "1st", bg: "bg-[#FFD700]/15", text: "text-[#FFD700]", ring: "ring-[#FFD700]/30" },
  2: { label: "2nd", bg: "bg-[#C0C0C0]/15", text: "text-[#C0C0C0]", ring: "ring-[#C0C0C0]/30" },
  3: { label: "3rd", bg: "bg-[#CD7F32]/15", text: "text-[#CD7F32]", ring: "ring-[#CD7F32]/30" },
};

function RankBadge({ rank }: { rank: number }) {
  const badge = RANK_BADGES[rank];

  if (badge) {
    return (
      <span
        className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold ring-1 ${badge.bg} ${badge.text} ${badge.ring}`}
      >
        {badge.label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium bg-white/5 text-text-secondary ring-1 ring-white/10">
      #{rank}
    </span>
  );
}

function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-accent flex items-center justify-center text-white text-sm font-semibold shrink-0">
      {initials}
    </div>
  );
}

function formatPnl(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absValue >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(2);
}

function TraderRow({ trader, index }: { trader: LeaderboardTrader; index: number }) {
  const isPositive = trader.totalPnl >= 0;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors duration-200"
    >
      <td className="py-4 pl-4 pr-2">
        <RankBadge rank={trader.rank} />
      </td>
      <td className="py-4 px-3">
        <div className="flex items-center gap-3">
          {trader.avatar ? (
            <img
              src={trader.avatar}
              alt={trader.displayName}
              className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 shrink-0"
            />
          ) : (
            <AvatarPlaceholder name={trader.displayName} />
          )}
          <div>
            <p className="text-white font-medium text-sm leading-tight">{trader.displayName}</p>
            <p className="text-text-secondary text-xs mt-0.5">{trader.followers} followers</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-3 text-right">
        <span className="text-white font-semibold text-sm">
          {trader.winRate.toFixed(1)}%
        </span>
      </td>
      <td className="py-4 px-3 text-right hidden sm:table-cell">
        <span className="text-text-tertiary text-sm">
          {trader.totalTrades.toLocaleString()}
        </span>
      </td>
      <td className="py-4 px-3 text-right">
        <span className={`font-semibold text-sm ${isPositive ? "text-success" : "text-danger"}`}>
          {isPositive ? "+" : ""}${formatPnl(trader.totalPnl)}
        </span>
      </td>
      <td className="py-4 pl-3 pr-4 text-right hidden md:table-cell">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            trader.performancePct >= 0
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger"
          }`}
        >
          {trader.performancePct >= 0 ? "\u2191" : "\u2193"}
          {Math.abs(trader.performancePct).toFixed(1)}%
        </span>
      </td>
    </motion.tr>
  );
}

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useTransform(y, [0, 1], [3, -3]);
  const rotateY = useTransform(x, [0, 1], [-3, 3]);

  function handleMouse(e: MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  }

  function handleLeave() {
    x.set(0.5);
    y.set(0.5);
  }

  return (
    <motion.div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 800 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

function TraderCard({ trader, index }: { trader: LeaderboardTrader; index: number }) {
  const isPositive = trader.totalPnl >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
    <TiltCard className="bg-surface-2 border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <RankBadge rank={trader.rank} />
          {trader.avatar ? (
            <img
              src={trader.avatar}
              alt={trader.displayName}
              className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <AvatarPlaceholder name={trader.displayName} />
          )}
          <div>
            <p className="text-white font-medium text-sm">{trader.displayName}</p>
            <p className="text-text-secondary text-xs">{trader.followers} followers</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            trader.performancePct >= 0
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger"
          }`}
        >
          {trader.performancePct >= 0 ? "\u2191" : "\u2193"}
          {Math.abs(trader.performancePct).toFixed(1)}%
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.03] rounded-xl p-3 text-center">
          <p className="text-text-secondary text-2xs font-medium uppercase tracking-wider mb-1">Win Rate</p>
          <p className="text-white font-semibold text-sm">{trader.winRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3 text-center">
          <p className="text-text-secondary text-2xs font-medium uppercase tracking-wider mb-1">Trades</p>
          <p className="text-text-tertiary font-semibold text-sm">{trader.totalTrades.toLocaleString()}</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3 text-center">
          <p className="text-text-secondary text-2xs font-medium uppercase tracking-wider mb-1">P&L</p>
          <p className={`font-semibold text-sm ${isPositive ? "text-success" : "text-danger"}`}>
            {isPositive ? "+" : ""}${formatPnl(trader.totalPnl)}
          </p>
        </div>
      </div>
    </TiltCard>
    </motion.div>
  );
}

export function LeaderboardSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [traders, setTraders] = useState<LeaderboardTrader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch("/api/traders/leaderboard");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setTraders(data.traders ?? []);
      } catch (err) {
        console.error("[LeaderboardSection] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  return (
    <section ref={ref} className="relative py-24 lg:py-32 bg-surface-0">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-0 via-surface-0 to-surface-3 pointer-events-none" />

      <div className="relative max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <span className="inline-block text-xs font-semibold text-warning uppercase tracking-widest mb-4">
            Top Performers
          </span>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-white leading-tight mb-4">
            Trader{" "}
            <span className="bg-gradient-to-r from-brand to-success bg-clip-text text-transparent">
              Leaderboard
            </span>
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto leading-relaxed">
            Real performance from verified traders. Follow the best and let their expertise work for you.
          </p>
        </motion.div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-white/[0.03] rounded-xl animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && traders.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.04] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#787B86" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-text-secondary text-lg">Leaderboard data will appear once traders are active.</p>
          </motion.div>
        )}

        {/* Desktop table */}
        {!loading && traders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Table view for md+ */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-2/60 backdrop-blur-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-2xs font-semibold text-text-secondary uppercase tracking-wider py-3.5 pl-4 pr-2">
                      Rank
                    </th>
                    <th className="text-left text-2xs font-semibold text-text-secondary uppercase tracking-wider py-3.5 px-3">
                      Trader
                    </th>
                    <th className="text-right text-2xs font-semibold text-text-secondary uppercase tracking-wider py-3.5 px-3">
                      Win Rate
                    </th>
                    <th className="text-right text-2xs font-semibold text-text-secondary uppercase tracking-wider py-3.5 px-3 hidden sm:table-cell">
                      Trades
                    </th>
                    <th className="text-right text-2xs font-semibold text-text-secondary uppercase tracking-wider py-3.5 px-3">
                      P&L
                    </th>
                    <th className="text-right text-2xs font-semibold text-text-secondary uppercase tracking-wider py-3.5 pl-3 pr-4">
                      Performance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {traders.map((trader, i) => (
                    <TraderRow key={trader.rank} trader={trader} index={i} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card view for mobile */}
            <div className="md:hidden space-y-3">
              {traders.map((trader, i) => (
                <TraderCard key={trader.rank} trader={trader} index={i} />
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 text-center"
        >
          <Link
            href="/signup"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand to-brand-light text-white font-semibold text-sm hover:shadow-glow-lg transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            Start Copy Trading
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
          <p className="mt-5 text-text-secondary text-sm">
            Join <span className="text-text-tertiary font-medium">1,000+</span> traders on CopyTrade Pro
          </p>
        </motion.div>
      </div>
    </section>
  );
}
