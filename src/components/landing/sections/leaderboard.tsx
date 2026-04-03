"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
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
    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium bg-white/5 text-[#787B86] ring-1 ring-white/10">
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
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2962FF] to-[#AB47BC] flex items-center justify-center text-white text-sm font-semibold shrink-0">
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
            <p className="text-white font-medium text-[15px] leading-tight">{trader.displayName}</p>
            <p className="text-[#787B86] text-xs mt-0.5">{trader.followers} followers</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-3 text-right">
        <span className="text-white font-semibold text-[15px]">
          {trader.winRate.toFixed(1)}%
        </span>
      </td>
      <td className="py-4 px-3 text-right hidden sm:table-cell">
        <span className="text-[#D1D4DC] text-[15px]">
          {trader.totalTrades.toLocaleString()}
        </span>
      </td>
      <td className="py-4 px-3 text-right">
        <span className={`font-semibold text-[15px] ${isPositive ? "text-[#26A69A]" : "text-[#EF5350]"}`}>
          {isPositive ? "+" : ""}${formatPnl(trader.totalPnl)}
        </span>
      </td>
      <td className="py-4 pl-3 pr-4 text-right hidden md:table-cell">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            trader.performancePct >= 0
              ? "bg-[#26A69A]/10 text-[#26A69A]"
              : "bg-[#EF5350]/10 text-[#EF5350]"
          }`}
        >
          {trader.performancePct >= 0 ? "\u2191" : "\u2193"}
          {Math.abs(trader.performancePct).toFixed(1)}%
        </span>
      </td>
    </motion.tr>
  );
}

function TraderCard({ trader, index }: { trader: LeaderboardTrader; index: number }) {
  const isPositive = trader.totalPnl >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-[#1E222D] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-all duration-300"
    >
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
            <p className="text-white font-medium text-[15px]">{trader.displayName}</p>
            <p className="text-[#787B86] text-xs">{trader.followers} followers</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            trader.performancePct >= 0
              ? "bg-[#26A69A]/10 text-[#26A69A]"
              : "bg-[#EF5350]/10 text-[#EF5350]"
          }`}
        >
          {trader.performancePct >= 0 ? "\u2191" : "\u2193"}
          {Math.abs(trader.performancePct).toFixed(1)}%
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.03] rounded-xl p-3 text-center">
          <p className="text-[#787B86] text-[11px] font-medium uppercase tracking-wider mb-1">Win Rate</p>
          <p className="text-white font-semibold text-[15px]">{trader.winRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3 text-center">
          <p className="text-[#787B86] text-[11px] font-medium uppercase tracking-wider mb-1">Trades</p>
          <p className="text-[#D1D4DC] font-semibold text-[15px]">{trader.totalTrades.toLocaleString()}</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3 text-center">
          <p className="text-[#787B86] text-[11px] font-medium uppercase tracking-wider mb-1">P&L</p>
          <p className={`font-semibold text-[15px] ${isPositive ? "text-[#26A69A]" : "text-[#EF5350]"}`}>
            {isPositive ? "+" : ""}${formatPnl(trader.totalPnl)}
          </p>
        </div>
      </div>
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
    <section ref={ref} className="relative py-24 lg:py-32 bg-[#131722]">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#131722] via-[#131722] to-[#1a1f2e] pointer-events-none" />

      <div className="relative max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <span className="inline-block text-[13px] font-semibold text-[#FF9800] uppercase tracking-[0.08em] mb-4">
            Top Performers
          </span>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-white leading-tight mb-4">
            Trader{" "}
            <span className="bg-gradient-to-r from-[#2962FF] to-[#26A69A] bg-clip-text text-transparent">
              Leaderboard
            </span>
          </h2>
          <p className="text-[#787B86] text-lg max-w-2xl mx-auto leading-relaxed">
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
            <p className="text-[#787B86] text-lg">Leaderboard data will appear once traders are active.</p>
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
            <div className="hidden md:block overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1E222D]/60 backdrop-blur-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-[11px] font-semibold text-[#787B86] uppercase tracking-wider py-3.5 pl-4 pr-2">
                      Rank
                    </th>
                    <th className="text-left text-[11px] font-semibold text-[#787B86] uppercase tracking-wider py-3.5 px-3">
                      Trader
                    </th>
                    <th className="text-right text-[11px] font-semibold text-[#787B86] uppercase tracking-wider py-3.5 px-3">
                      Win Rate
                    </th>
                    <th className="text-right text-[11px] font-semibold text-[#787B86] uppercase tracking-wider py-3.5 px-3 hidden sm:table-cell">
                      Trades
                    </th>
                    <th className="text-right text-[11px] font-semibold text-[#787B86] uppercase tracking-wider py-3.5 px-3">
                      P&L
                    </th>
                    <th className="text-right text-[11px] font-semibold text-[#787B86] uppercase tracking-wider py-3.5 pl-3 pr-4">
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
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#2962FF] to-[#2979FF] text-white font-semibold text-[15px] hover:shadow-[0_8px_30px_rgba(41,98,255,0.35)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
          >
            Start Copy Trading
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
          <p className="mt-5 text-[#787B86] text-sm">
            Join <span className="text-[#D1D4DC] font-medium">1,000+</span> traders on CopyTrade Pro
          </p>
        </motion.div>
      </div>
    </section>
  );
}
