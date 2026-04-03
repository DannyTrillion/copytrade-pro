"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  ChevronDown, TrendingUp, Activity, ArrowUpRight,
  Users, Wallet,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  TradingView-style hero: CENTERED content, full 100vh               */
/*  Trading UI panels floating in BACKGROUND behind centered text      */
/*  CEO block bottom-left, no video                                    */
/* ------------------------------------------------------------------ */

/** Design-system color tokens for SVG attributes that can't use Tailwind classes */
const COLORS = {
  brand: "#2962FF",
  success: "#26A69A",
  danger: "#EF5350",
} as const;

const ease = [0.22, 1, 0.36, 1] as const;

/* Mini sparkline */
function Spark({ data, color, w = 56, h = 20 }: { data: number[]; color: string; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data), r = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / r) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

/* Candlestick chart SVG */
function CandleChart({ candles, height = 140 }: { candles: { o: number; c: number; h: number; l: number }[]; height?: number }) {
  const maxV = Math.max(...candles.map(c => c.h)) + 5;
  const minV = Math.min(...candles.map(c => c.l)) - 5;
  const s = (v: number) => height - ((v - minV) / (maxV - minV)) * height;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${candles.length * 14 + 6} ${height}`} className="block">
      {candles.map((c, i) => {
        const x = i * 14 + 5, bull = c.c >= c.o, col = bull ? COLORS.success : COLORS.danger;
        const bT = s(Math.max(c.o, c.c)), bB = s(Math.min(c.o, c.c));
        return (
          <g key={i}>
            <line x1={x} y1={s(c.h)} x2={x} y2={s(c.l)} stroke={col} strokeWidth="0.8" opacity="0.7" />
            <rect x={x - 3} y={bT} width="6" height={Math.max(bB - bT, 1)} fill={col} rx="0.5" opacity="0.85" />
          </g>
        );
      })}
    </svg>
  );
}

/* Chart data sets */
const chartA = [
  { o: 58, c: 70, h: 76, l: 54 }, { o: 70, c: 64, h: 74, l: 60 }, { o: 64, c: 78, h: 83, l: 62 },
  { o: 78, c: 73, h: 82, l: 68 }, { o: 73, c: 86, h: 90, l: 71 }, { o: 86, c: 80, h: 89, l: 76 },
  { o: 80, c: 93, h: 97, l: 78 }, { o: 93, c: 88, h: 96, l: 84 }, { o: 88, c: 100, h: 105, l: 86 },
  { o: 100, c: 96, h: 106, l: 92 }, { o: 96, c: 108, h: 113, l: 94 }, { o: 108, c: 103, h: 112, l: 98 },
  { o: 103, c: 116, h: 120, l: 101 }, { o: 116, c: 110, h: 118, l: 106 }, { o: 110, c: 123, h: 128, l: 108 },
  { o: 123, c: 118, h: 126, l: 114 }, { o: 118, c: 130, h: 134, l: 116 }, { o: 130, c: 126, h: 136, l: 122 },
];
const chartB = [
  { o: 40, c: 45, h: 48, l: 38 }, { o: 45, c: 42, h: 47, l: 40 }, { o: 42, c: 50, h: 53, l: 41 },
  { o: 50, c: 47, h: 52, l: 44 }, { o: 47, c: 55, h: 58, l: 45 }, { o: 55, c: 52, h: 57, l: 49 },
  { o: 52, c: 60, h: 63, l: 50 }, { o: 60, c: 56, h: 62, l: 53 }, { o: 56, c: 64, h: 68, l: 54 },
  { o: 64, c: 61, h: 67, l: 58 }, { o: 61, c: 70, h: 74, l: 59 }, { o: 70, c: 66, h: 72, l: 63 },
  { o: 66, c: 75, h: 78, l: 64 }, { o: 75, c: 72, h: 77, l: 69 },
];

export function HeroSection() {
  return (
    <section className="relative h-screen min-h-[700px] flex flex-col overflow-hidden bg-[#131722]">

      {/* ===== BACKGROUND — TradingView actual assets ===== */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-space.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[30%_80%] md:object-bottom"
          quality={90}
        />
        {/* Top fade — subtle on mobile to keep astronaut area bright */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#131722]/60 via-[#131722]/20 to-transparent md:from-[#131722]/10 md:via-transparent" />
        {/* Bottom subtle vignette — lighter on mobile */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#131722]/30 via-transparent to-transparent md:hidden" />
      </div>
      <div className="absolute inset-0 z-[1] pointer-events-none opacity-25">
        <Image src="/hero-aurora.webp" alt="" fill sizes="100vw" className="object-cover object-center mix-blend-screen" quality={90} />
      </div>

      {/* ===== BACKGROUND TRADING UI — floating panels behind text ===== */}
      <div className="absolute inset-0 z-[2] pointer-events-none hidden lg:block overflow-hidden">

        {/* === LEFT SIDE — Chart panel + market list === */}
        {/* Large chart panel — left */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease }}
          className="absolute top-[12%] left-[-2%] w-[420px]"
        >
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}>
            <div className="rounded-xl border border-white/[0.06] overflow-hidden backdrop-blur-sm shadow-[0_16px_60px_rgba(0,0,0,0.3)]" style={{ background: "rgba(19,23,34,0.6)" }}>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-white/50">TRUMP 2028</span>
                  <span className="text-[10px] font-mono text-success">$0.42</span>
                  <span className="flex items-center text-[9px] font-mono text-success"><ArrowUpRight className="w-2.5 h-2.5" />+12.3%</span>
                </div>
                <div className="flex items-center gap-1">
                  {["1H", "4H", "1D"].map((tf, i) => (
                    <span key={tf} className={`px-1.5 py-0.5 text-[8px] rounded ${i === 2 ? "bg-brand/60 text-white/70" : "text-white/20"}`}>{tf}</span>
                  ))}
                </div>
              </div>
              <div className="p-2">
                <CandleChart candles={chartA} height={150} />
              </div>
              <div className="px-3 py-1 border-t border-white/[0.04] flex items-center gap-3">
                <span className="text-[8px] text-white/15">Vol 24.5M</span>
                <span className="text-[8px] text-white/15">RSI <span className="text-success/60">62.4</span></span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Market list panel — left lower */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.6, ease }}
          className="absolute top-[52%] left-[1%] w-[220px]"
        >
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
            <div className="rounded-xl border border-white/[0.06] overflow-hidden backdrop-blur-sm shadow-[0_12px_48px_rgba(0,0,0,0.25)]" style={{ background: "rgba(19,23,34,0.55)" }}>
              <div className="px-3 py-1.5 border-b border-white/[0.05]">
                <span className="text-[9px] font-semibold text-white/30 uppercase tracking-wider">Markets</span>
              </div>
              {[
                { s: "BTC > 100K", p: "$0.78", c: "+5.1%", up: true, d: [60, 62, 65, 70, 72, 75, 78, 80] },
                { s: "ETH MERGE", p: "$0.65", c: "-2.4%", up: false, d: [80, 78, 72, 68, 65, 67, 63, 60] },
                { s: "FED RATE", p: "$0.33", c: "+8.7%", up: true, d: [20, 25, 28, 27, 32, 35, 33, 38] },
                { s: "S&P ATH", p: "$0.56", c: "+1.2%", up: true, d: [45, 48, 47, 52, 55, 53, 56, 60] },
                { s: "AI BUBBLE", p: "$0.21", c: "-6.8%", up: false, d: [40, 35, 32, 28, 25, 22, 20, 18] },
              ].map((m, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-[5px] border-b border-white/[0.02]">
                  <div>
                    <p className="text-[9px] font-semibold text-white/50">{m.s}</p>
                    <p className="text-[8px] text-white/20 font-mono">{m.p}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Spark data={m.d} color={m.up ? COLORS.success : COLORS.danger} w={28} h={12} />
                    <span className={`text-[8px] font-mono ${m.up ? "text-success/70" : "text-danger/70"}`}>{m.c}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* === RIGHT SIDE — Copy trade panel + small chart + order === */}
        {/* Copy trade panel — right upper */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease }}
          className="absolute top-[10%] right-[-1%] w-[280px]"
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
            <div className="rounded-xl border border-white/[0.06] overflow-hidden backdrop-blur-sm shadow-[0_16px_60px_rgba(0,0,0,0.3)]" style={{ background: "rgba(19,23,34,0.6)" }}>
              <div className="px-3 py-1.5 border-b border-white/[0.05]">
                <span className="text-[9px] font-semibold text-white/30 uppercase tracking-wider">Top Traders</span>
              </div>
              <div className="p-2 space-y-1.5">
                {[
                  { name: "AlphaTrader", pnl: "+$45.2K", wr: "72%", a: "A", d: [20, 25, 22, 30, 28, 35, 32, 40, 38, 45] },
                  { name: "CryptoKing", pnl: "+$38.1K", wr: "68%", a: "C", d: [15, 18, 22, 20, 26, 24, 30, 28, 32, 36] },
                  { name: "MarketPro", pnl: "+$29.8K", wr: "65%", a: "M", d: [10, 14, 12, 18, 16, 22, 20, 24, 26, 30] },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-white/[0.03]">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white/80 flex-shrink-0 bg-gradient-to-br from-brand to-success">
                      {t.a}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-white/50">{t.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-success/70">{t.pnl}</span>
                        <span className="text-[8px] text-white/18">{t.wr}</span>
                      </div>
                    </div>
                    <Spark data={t.d} color={COLORS.success} w={36} h={14} />
                    <span className="px-1.5 py-0.5 text-[8px] font-semibold bg-brand/50 text-white/60 rounded-md">Copy</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Small chart panel — right mid */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.7, ease }}
          className="absolute top-[48%] right-[2%] w-[300px]"
        >
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}>
            <div className="rounded-xl border border-white/[0.06] overflow-hidden backdrop-blur-sm shadow-[0_12px_48px_rgba(0,0,0,0.25)]" style={{ background: "rgba(19,23,34,0.55)" }}>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-white/45">BTC &gt; 100K</span>
                  <span className="text-[10px] font-mono text-success/70">$0.78</span>
                </div>
              </div>
              <div className="p-2">
                <CandleChart candles={chartB} height={100} />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Order panel — right lower */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.9, ease }}
          className="absolute bottom-[16%] right-[6%] w-[200px]"
        >
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 3 }}>
            <div className="rounded-xl border border-white/[0.06] overflow-hidden backdrop-blur-sm shadow-[0_12px_48px_rgba(0,0,0,0.25)]" style={{ background: "rgba(19,23,34,0.55)" }}>
              <div className="px-3 py-1.5 border-b border-white/[0.05]">
                <span className="text-[9px] font-semibold text-white/25 uppercase tracking-wider">Quick Trade</span>
              </div>
              <div className="p-2.5">
                <div className="flex gap-1 mb-2">
                  <span className="flex-1 py-1 text-[9px] font-semibold bg-success/50 text-white/60 rounded-md text-center">Buy Yes</span>
                  <span className="flex-1 py-1 text-[9px] font-semibold bg-white/[0.04] text-white/25 rounded-md text-center">Buy No</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/20">Amount</span>
                    <span className="text-[10px] font-mono text-white/40">$500</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/20">Return</span>
                    <span className="text-[10px] font-mono text-success/60">+$690</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Floating stat cards */}
        {/* Active users — bottom left-center */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1, ease }}
          className="absolute bottom-[22%] left-[18%]"
        >
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.05] backdrop-blur-sm" style={{ background: "rgba(19,23,34,0.5)" }}>
              <Users className="w-3.5 h-3.5 text-[#AB47BC]/60" />
              <div>
                <p className="text-[11px] font-bold text-white/45">2,847</p>
                <p className="text-[8px] text-white/18">Online now</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Portfolio card — top center-right */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1, ease }}
          className="absolute top-[18%] right-[32%]"
        >
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.05] backdrop-blur-sm" style={{ background: "rgba(19,23,34,0.5)" }}>
              <Wallet className="w-3.5 h-3.5 text-brand/60" />
              <div>
                <p className="text-[11px] font-bold text-white/45">$48,234</p>
                <p className="text-[8px] text-success/50">+10.3% today</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Live signal — center left */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 1.2, ease }}
          className="absolute top-[38%] left-[8%]"
        >
          <motion.div animate={{ y: [0, 4, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.05] backdrop-blur-sm" style={{ background: "rgba(19,23,34,0.5)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <Activity className="w-3 h-3 text-success/60" />
              <div>
                <p className="text-[9px] font-semibold text-white/40">BUY TRUMP 2028</p>
                <p className="text-[7px] text-white/15">AlphaTrader • 2s ago</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Soft gradient overlays to fade panels toward center — desktop only */}
        <div className="absolute inset-0 hidden lg:block" style={{ background: "radial-gradient(ellipse 35% 40% at 50% 45%, rgba(10,13,20,0.6), rgba(10,13,20,0.1) 55%, transparent 70%)" }} />
      </div>

      {/* ===== CENTERED CONTENT — on top of everything ===== */}
      <div className="relative z-[5] flex-1 flex flex-col items-center justify-start pt-[18vh] md:justify-center md:pt-0 px-6">
        <div className="text-center max-w-[800px] mx-auto">

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease }}
            className="text-[clamp(2.2rem,7vw,5.5rem)] font-bold leading-[1.04] tracking-[-0.03em] mb-4 md:mb-5"
          >
            <span className="text-white">Copy first </span>
            <span className="text-white/60 italic font-light">/</span>
            <span className="text-white"> Then earn.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease }}
            className="text-[clamp(0.9rem,2vw,1.25rem)] text-white/50 max-w-[520px] mx-auto mb-6 md:mb-8 leading-relaxed"
          >
            The best trades require research, then commitment. Follow verified traders on Polymarket.
          </motion.p>

          {/* CTA buttons — centered */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease }}
            className="flex flex-wrap justify-center items-center gap-4 mb-4"
          >
            <Link
              href="/signup"
              className="px-8 py-3.5 bg-white text-[#131722] font-semibold text-[15px] rounded-[20px] hover:bg-white/90 transition-all duration-200 hover:translate-y-[-1px] shadow-[0_2px_16px_rgba(255,255,255,0.1)]"
            >
              Get started for free
            </Link>
            <Link
              href="#how-it-works"
              className="px-6 py-3.5 text-white/60 font-medium text-[15px] rounded-[20px] border border-white/[0.12] hover:bg-white/[0.06] hover:text-white/80 transition-all duration-200"
            >
              How it works
            </Link>
          </motion.div>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[13px] text-white/30"
          >
            $0 forever, no credit card needed
          </motion.p>
        </div>
      </div>

      {/* ===== CEO INFO BLOCK — bottom right, TradingView style ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.7, ease }}
        className="absolute bottom-14 left-4 right-4 sm:left-auto sm:right-6 md:right-12 z-[6]"
      >
        <div
          className="flex items-center gap-4 pl-2 pr-5 py-2 rounded-2xl border border-white/[0.1] backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.04)]"
          style={{ background: "rgba(20,22,32,0.65)" }}
        >
          {/* Avatar with glowing ring */}
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-[3px] rounded-full opacity-50 bg-gradient-to-br from-brand via-success to-[#AB47BC]" />
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#131722]">
              <Image
                src="/ceo-avatar.webp"
                alt="CEO"
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
            {/* Online indicator */}
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-[#131722]" />
          </div>
          {/* Info */}
          <div>
            <p className="text-[14px] font-semibold text-white leading-tight">John Doe</p>
            <p className="text-[11px] text-white/40 leading-tight mt-0.5">CEO & Co-founder</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-success/10 border border-success/15">
                <TrendingUp className="w-2.5 h-2.5 text-success" />
                <span className="text-[9px] font-semibold text-success">+847% ROI</span>
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand/10 border border-brand/15">
                <Users className="w-2.5 h-2.5 text-brand" />
                <span className="text-[9px] font-semibold text-brand">12K followers</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[6]"
      >
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <ChevronDown className="w-5 h-5 text-white/20" />
        </motion.div>
      </motion.div>
    </section>
  );
}
