"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { BadgeCheck, TrendingUp, BarChart3, Star, Users, Quote, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const TRADERS = [
  {
    name: "Alexander Whitfield",
    role: "Chief Investment Officer, Apex Capital",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    quote: "CopyTrade Pro fundamentally changed how we distribute alpha. Our followers receive the same entries in real time, and the commission model is the most transparent I've seen in 15 years of institutional trading.",
    stats: { experience: "15+ years", trades: "4,200+", winRate: "73%", followers: "1.2K" },
    pnl: "+847%",
  },
  {
    name: "Victoria Lancaster",
    role: "Head of Quantitative Strategy, Meridian Fund",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
    quote: "The Webull integration is flawless. Our signals execute across hundreds of follower accounts in under 200ms with zero slippage. This is genuinely institutional-grade infrastructure.",
    stats: { experience: "11+ years", trades: "2,800+", winRate: "71%", followers: "890" },
    pnl: "+623%",
  },
  {
    name: "Jonathan Ashworth",
    role: "Portfolio Manager, Vanguard Analytics",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face",
    quote: "I was initially skeptical, but the execution quality won me over immediately. The risk controls are sophisticated enough for institutional use while remaining accessible to retail traders.",
    stats: { experience: "9+ years", trades: "3,400+", winRate: "68%", followers: "650" },
    pnl: "+412%",
  },
  {
    name: "Catherine Harrington",
    role: "Director of Trading, Blackstone Macro",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
    quote: "We migrated our entire signal distribution to CopyTrade Pro. The tier system is equitable, commissions are fully transparent, and the analytics dashboard rivals Bloomberg terminal functionality.",
    stats: { experience: "18+ years", trades: "5,100+", winRate: "76%", followers: "2.1K" },
    pnl: "+1,240%",
  },
  {
    name: "Richard Thornton III",
    role: "Lead Algorithmic Strategist, Citadel Research",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    quote: "Finally a copy trading platform built with modern infrastructure. The API is robust, the UI is exceptionally clean, and our followers have complete confidence in the execution layer.",
    stats: { experience: "12+ years", trades: "6,800+", winRate: "69%", followers: "1.8K" },
    pnl: "+935%",
  },
  {
    name: "Sophia Montgomery",
    role: "Senior Macro Analyst, Wellington Partners",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
    quote: "What sets this platform apart is the radical transparency. Every follower can audit my complete track record before committing capital. It builds real trust and keeps me accountable.",
    stats: { experience: "8+ years", trades: "1,900+", winRate: "72%", followers: "430" },
    pnl: "+385%",
  },
];

/* ─── Featured card ─── */
function FeaturedCard({ trader, inView }: { trader: typeof TRADERS[number]; inView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease }}
      className="rounded-2xl border border-white/[0.05] p-7 lg:p-9"
      style={{ background: "rgba(255,255,255,0.015)" }}
    >
      <div className="flex flex-col md:flex-row gap-7 items-start">
        {/* Left: Avatar + info */}
        <div className="flex flex-col items-center md:items-start shrink-0 md:w-[200px]">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/[0.06]">
              <img src={trader.image} alt={trader.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#0D71FF] border-[2px] border-[#06060a]" />
          </div>

          <div className="text-center md:text-left">
            <div className="flex items-center gap-1.5 justify-center md:justify-start">
              <h3 className="text-sm font-semibold text-white">{trader.name}</h3>
              <BadgeCheck className="w-4 h-4 text-[#0D71FF] shrink-0" />
            </div>
            <p className="text-[11px] text-white/30 mt-0.5 leading-snug">{trader.role}</p>

            <div className="flex items-center gap-0.5 mt-2.5 justify-center md:justify-start">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
              ))}
            </div>

            <div className="flex items-center gap-1 mt-3 px-2.5 py-1 rounded-lg bg-[#0D71FF]/8 border border-[#0D71FF]/12 w-fit mx-auto md:mx-0">
              <ArrowUpRight className="w-3 h-3 text-[#0D71FF]" />
              <span className="text-xs font-semibold text-[#0D71FF]">{trader.pnl} ROI</span>
            </div>
          </div>
        </div>

        {/* Right: Quote + stats */}
        <div className="flex-1 min-w-0">
          <Quote className="w-6 h-6 text-white/[0.15] mb-3" />
          <p className="text-[14px] text-white/55 leading-[1.7] mb-6">
            &ldquo;{trader.quote}&rdquo;
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: "Experience", value: trader.stats.experience, icon: TrendingUp },
              { label: "Trades", value: trader.stats.trades, icon: BarChart3 },
              { label: "Win Rate", value: trader.stats.winRate, icon: TrendingUp },
              { label: "Followers", value: trader.stats.followers, icon: Users },
            ].map((stat, j) => (
              <motion.div
                key={j}
                initial={{ opacity: 0, y: 8 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 + j * 0.06, duration: 0.4, ease }}
                className="px-3 py-2 rounded-lg border border-white/[0.04] text-center"
                style={{ background: "rgba(255,255,255,0.01)" }}
              >
                <p className="text-xs font-semibold text-white tabular-nums">{stat.value}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main section ─── */
export function TestimonialsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  const [featuredIndex, setFeaturedIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFeaturedIndex((p) => (p + 1) % TRADERS.length), 8000);
    return () => clearInterval(timer);
  }, []);

  const gridTraders = TRADERS.filter((_, i) => i !== featuredIndex);

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden" style={{ background: "#06060a" }} ref={ref} id="testimonials">
      <div className="relative max-w-[1100px] mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease }}
          className="text-center mb-14"
        >
          <span className="inline-block text-xs font-medium text-[#0D71FF] uppercase tracking-[0.2em] mb-4">Testimonials</span>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white leading-tight mb-4">
            Trusted by <span className="text-white/30 italic">Elite Traders</span>
          </h2>
          <p className="text-sm text-white/30 max-w-[460px] mx-auto leading-relaxed">
            Real performance from verified professionals who share their strategies on CopyTrade Pro.
          </p>
        </motion.div>

        {/* Featured card carousel */}
        <div className="relative mb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={featuredIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35, ease }}
            >
              <FeaturedCard trader={TRADERS[featuredIndex]} inView={inView} />
            </motion.div>
          </AnimatePresence>

          {/* Nav arrows */}
          <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 -left-5 z-10">
            <button onClick={() => setFeaturedIndex((p) => (p - 1 + TRADERS.length) % TRADERS.length)}
              className="w-9 h-9 rounded-full border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 hover:border-white/[0.12] transition-all duration-200">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 -right-5 z-10">
            <button onClick={() => setFeaturedIndex((p) => (p + 1) % TRADERS.length)}
              className="w-9 h-9 rounded-full border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 hover:border-white/[0.12] transition-all duration-200">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {TRADERS.map((_, i) => (
              <button key={i} onClick={() => setFeaturedIndex(i)}
                className={`rounded-full transition-all duration-300 ${i === featuredIndex ? "w-5 h-1.5 bg-[#0D71FF]" : "w-1.5 h-1.5 bg-white/10 hover:bg-white/20"}`} />
            ))}
          </div>
        </div>

        {/* Grid of other traders */}
        <div className="hidden md:grid md:grid-cols-5 gap-3">
          {gridTraders.map((trader, i) => (
            <motion.button
              key={trader.name}
              onClick={() => setFeaturedIndex(TRADERS.indexOf(trader))}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + i * 0.05, duration: 0.4, ease }}
              className="text-left rounded-xl border border-white/[0.04] p-3.5 transition-all duration-200 hover:border-white/[0.08] hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.01)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/[0.06] shrink-0">
                  <img src={trader.image} alt={trader.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-white/60 truncate">{trader.name}</p>
                  <p className="text-[9px] text-white/20 truncate">{trader.role.split(",")[0]}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="w-2.5 h-2.5 text-[#0D71FF]" />
                <span className="text-[10px] font-semibold text-[#0D71FF]">{trader.pnl}</span>
                <span className="text-[9px] text-white/15 ml-1">{trader.stats.winRate} win</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Mobile scroll */}
        <div className="md:hidden -mx-6 px-6">
          <div className="flex gap-2.5 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
            {gridTraders.map((trader) => (
              <button key={trader.name} onClick={() => setFeaturedIndex(TRADERS.indexOf(trader))}
                className="snap-start shrink-0 w-[180px] text-left rounded-xl border border-white/[0.04] p-3 active:scale-[0.97]"
                style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-white/[0.06] shrink-0">
                    <img src={trader.image} alt={trader.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className="text-[10px] font-medium text-white/50 truncate">{trader.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-2.5 h-2.5 text-[#0D71FF]" />
                  <span className="text-[10px] font-semibold text-[#0D71FF]">{trader.pnl}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
