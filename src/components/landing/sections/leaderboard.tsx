"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";

const ease = [0.22, 1, 0.36, 1] as const;

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

const RANK_BADGES: Record<number, { label: string; color: string }> = {
  1: { label: "1st", color: "#FFD700" },
  2: { label: "2nd", color: "#C0C0C0" },
  3: { label: "3rd", color: "#CD7F32" },
};

function RankBadge({ rank }: { rank: number }) {
  const badge = RANK_BADGES[rank];

  if (badge) {
    return (
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
        style={{ background: `${badge.color}15`, color: badge.color }}
      >
        {badge.label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium bg-white/[0.04] text-white/40">
      #{rank}
    </span>
  );
}

function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className="w-9 h-9 rounded-full bg-[#2962FF]/15 flex items-center justify-center text-[#2962FF] text-xs font-semibold shrink-0">
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

function TraderRow({ trader }: { trader: LeaderboardTrader }) {
  const isPositive = trader.totalPnl >= 0;

  return (
    <tr className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors duration-150">
      <td className="py-3.5 pl-4 pr-2">
        <RankBadge rank={trader.rank} />
      </td>
      <td className="py-3.5 px-3">
        <div className="flex items-center gap-3">
          {trader.avatar ? (
            <img src={trader.avatar} alt={trader.displayName} className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <AvatarPlaceholder name={trader.displayName} />
          )}
          <div>
            <p className="text-white font-medium text-sm leading-tight">{trader.displayName}</p>
            <p className="text-white/40 text-xs mt-0.5">{trader.followers} followers</p>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-3 text-right">
        <span className="text-white font-medium text-sm">{trader.winRate.toFixed(1)}%</span>
      </td>
      <td className="py-3.5 px-3 text-right hidden sm:table-cell">
        <span className="text-white/45 text-sm">{trader.totalTrades.toLocaleString()}</span>
      </td>
      <td className="py-3.5 px-3 text-right">
        <span className={`font-medium text-sm ${isPositive ? "text-[#26A69A]" : "text-[#EF5350]"}`}>
          {isPositive ? "+" : ""}${formatPnl(trader.totalPnl)}
        </span>
      </td>
      <td className="py-3.5 pl-3 pr-4 text-right hidden md:table-cell">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          trader.performancePct >= 0 ? "bg-[#26A69A]/10 text-[#26A69A]" : "bg-[#EF5350]/10 text-[#EF5350]"
        }`}>
          {trader.performancePct >= 0 ? "\u2191" : "\u2193"}
          {Math.abs(trader.performancePct).toFixed(1)}%
        </span>
      </td>
    </tr>
  );
}

function TraderCard({ trader }: { trader: LeaderboardTrader }) {
  const isPositive = trader.totalPnl >= 0;

  return (
    <div className="border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition-colors duration-200" style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <RankBadge rank={trader.rank} />
          {trader.avatar ? (
            <img src={trader.avatar} alt={trader.displayName} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <AvatarPlaceholder name={trader.displayName} />
          )}
          <div>
            <p className="text-white font-medium text-sm">{trader.displayName}</p>
            <p className="text-white/40 text-xs">{trader.followers} followers</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          trader.performancePct >= 0 ? "bg-[#26A69A]/10 text-[#26A69A]" : "bg-[#EF5350]/10 text-[#EF5350]"
        }`}>
          {trader.performancePct >= 0 ? "\u2191" : "\u2193"}
          {Math.abs(trader.performancePct).toFixed(1)}%
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Win Rate", value: `${trader.winRate.toFixed(1)}%` },
          { label: "Trades", value: trader.totalTrades.toLocaleString() },
          { label: "P&L", value: `${isPositive ? "+" : ""}$${formatPnl(trader.totalPnl)}`, color: isPositive ? "text-[#26A69A]" : "text-[#EF5350]" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/[0.03] rounded-lg p-3 text-center">
            <p className="text-[11px] text-white/40 font-medium uppercase tracking-wider mb-1">{stat.label}</p>
            <p className={`text-sm font-medium ${stat.color || "text-white"}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
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
    <section ref={ref} className="relative py-24 lg:py-32" style={{ background: "#080A12" }}>
      <div className="relative max-w-[1100px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease }}
          className="text-center mb-14"
        >
          <span className="inline-block text-xs font-medium text-white/40 uppercase tracking-[0.2em] mb-4">
            Top Performers
          </span>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white leading-tight mb-4">
            Trader Leaderboard
          </h2>
          <p className="text-white/50 text-base max-w-lg mx-auto leading-relaxed">
            Real performance from verified traders. Follow the best and let their expertise work for you.
          </p>
        </motion.div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && traders.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white/[0.04] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-white/45 text-base">Leaderboard data will appear once traders are active.</p>
          </div>
        )}

        {/* Table */}
        {!loading && traders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.15, ease }}
          >
            <div className="hidden md:block overflow-hidden rounded-xl border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Rank", "Trader", "Win Rate", "Trades", "P&L", "Performance"].map((col, i) => (
                      <th key={col} className={`text-[11px] font-medium text-white/40 uppercase tracking-wider py-3 ${
                        i === 0 ? "text-left pl-4 pr-2" :
                        i === 1 ? "text-left px-3" :
                        i === 3 ? "text-right px-3 hidden sm:table-cell" :
                        i === 5 ? "text-right pl-3 pr-4 hidden md:table-cell" :
                        "text-right px-3"
                      }`}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {traders.map((trader) => (
                    <TraderRow key={trader.rank} trader={trader} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {traders.map((trader) => (
                <TraderCard key={trader.rank} trader={trader} />
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.3, ease }}
          className="mt-12 text-center"
        >
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#2962FF] text-white font-semibold text-sm hover:bg-[#1a4fd4] transition-colors duration-200 active:scale-[0.97]"
          >
            Start Copy Trading
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
          <p className="mt-4 text-white/40 text-sm">
            Join <span className="text-white/60 font-medium">1,000+</span> traders on CopyTrade Pro
          </p>
        </motion.div>
      </div>
    </section>
  );
}
