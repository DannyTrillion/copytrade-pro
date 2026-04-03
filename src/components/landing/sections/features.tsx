"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Copy,
  Shield,
  Users,
  Zap,
  BarChart3,
  DollarSign,
  Lock,
  Cpu,
} from "lucide-react";

const features = [
  { icon: Copy, title: "Auto Copy Trading", desc: "Automatically replicate trades from top traders the moment a signal arrives. Zero manual intervention.", color: "#2962FF", bgColor: "bg-[#EBF0FF]" },
  { icon: Shield, title: "Risk Control", desc: "Set risk per trade, max position sizes, and daily loss limits. The system enforces your rules every time.", color: "#26A69A", bgColor: "bg-[#E8F5F2]" },
  { icon: Users, title: "Multiple Traders", desc: "Follow multiple master traders simultaneously with independent risk settings for each one.", color: "#AB47BC", bgColor: "bg-[#F3E5F5]" },
  { icon: Zap, title: "Real-Time Execution", desc: "Sub-second trade execution via async processing with parallel order placement on Polymarket.", color: "#FF9800", bgColor: "bg-[#FFF4E5]" },
  { icon: BarChart3, title: "Performance Stats", desc: "Comprehensive analytics with PnL tracking, win rates, trade history, and portfolio performance charts.", color: "#1452F0", bgColor: "bg-[#E8EEFF]" },
  { icon: DollarSign, title: "Commission System", desc: "Transparent 2% platform commission on copied trades. Master traders earn from their follower base.", color: "#26A69A", bgColor: "bg-[#E8F5F2]" },
  { icon: Lock, title: "Secure Wallets", desc: "AES-256 encrypted wallet storage. Private keys are never stored in plain text. Bank-grade security.", color: "#EF5350", bgColor: "bg-[#FFEBEE]" },
  { icon: Cpu, title: "Async Processing", desc: "Queue-based worker system handles concurrent trade execution with retry logic and error handling.", color: "#2962FF", bgColor: "bg-[#EBF0FF]" },
];

export function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" className="relative py-24 lg:py-32 bg-white" ref={ref}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16 lg:mb-20"
        >
          <span className="inline-block text-[13px] font-semibold text-[#2962FF] uppercase tracking-[0.08em] mb-4">Platform Features</span>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-[#131722] leading-tight mb-5">
            Built for{" "}
            <span className="bg-gradient-to-r from-[#2962FF] to-[#26A69A] bg-clip-text text-transparent">
              Serious Traders
            </span>
          </h2>
          <p className="text-[17px] text-[#787B86] max-w-[560px] mx-auto leading-relaxed">
            Every feature designed for production-grade trading at scale.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="group"
            >
              <div className="bg-white border border-[#E0E3EB] rounded-xl p-6 h-full hover:border-[#C8CBD5] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]">
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center mb-4 ${feature.bgColor}`}
                >
                  <feature.icon className="w-5 h-5" style={{ color: feature.color }} />
                </div>
                <h3 className="text-[15px] font-semibold text-[#131722] mb-2">{feature.title}</h3>
                <p className="text-[13px] text-[#787B86] leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Live Platform Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 bg-white border border-[#E0E3EB] rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)]"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[#E0E3EB] bg-[#FAFBFC]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#EF5350]" />
                <div className="w-3 h-3 rounded-full bg-[#FF9800]" />
                <div className="w-3 h-3 rounded-full bg-[#26A69A]" />
              </div>
              <span className="text-[12px] font-semibold text-[#131722] ml-2">CopyTrade Pro — Live Dashboard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#26A69A] animate-pulse" />
              <span className="text-[11px] text-[#787B86] font-medium">Connected</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E0E3EB]">
            {/* Candlestick Chart Area */}
            <div className="lg:col-span-7 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-bold text-[#131722]">BTC / USD</span>
                  <span className="text-[20px] font-bold text-[#131722]">67,432.50</span>
                  <span className="text-[13px] font-semibold text-[#26A69A]">+1,542.30 (+2.34%)</span>
                </div>
                <div className="flex items-center gap-1">
                  {["1H", "4H", "1D", "1W"].map((tf) => (
                    <button key={tf} className={`px-2.5 py-1 text-[11px] font-semibold rounded-md ${tf === "4H" ? "bg-[#2962FF] text-white" : "text-[#787B86] hover:bg-[#F0F3FA]"}`}>{tf}</button>
                  ))}
                </div>
              </div>
              {/* SVG Candlestick Chart */}
              <svg width="100%" height="220" viewBox="0 0 560 220" preserveAspectRatio="none" className="rounded-lg bg-[#FAFBFC] border border-[#E0E3EB]/50">
                {/* Grid lines */}
                {[44, 88, 132, 176].map((y) => (
                  <line key={y} x1="0" y1={y} x2="560" y2={y} stroke="#E0E3EB" strokeWidth="0.5" strokeDasharray="4 4" />
                ))}
                {/* Candlesticks */}
                {[
                  { x: 20, o: 150, c: 130, h: 120, l: 160 },
                  { x: 45, o: 130, c: 140, h: 118, l: 148 },
                  { x: 70, o: 140, c: 125, h: 115, l: 150 },
                  { x: 95, o: 125, c: 110, h: 100, l: 135 },
                  { x: 120, o: 110, c: 120, h: 102, l: 128 },
                  { x: 145, o: 120, c: 105, h: 95, l: 130 },
                  { x: 170, o: 105, c: 115, h: 90, l: 122 },
                  { x: 195, o: 115, c: 100, h: 88, l: 125 },
                  { x: 220, o: 100, c: 90, h: 80, l: 112 },
                  { x: 245, o: 90, c: 105, h: 82, l: 110 },
                  { x: 270, o: 105, c: 95, h: 85, l: 115 },
                  { x: 295, o: 95, c: 80, h: 72, l: 105 },
                  { x: 320, o: 80, c: 70, h: 62, l: 90 },
                  { x: 345, o: 70, c: 85, h: 58, l: 92 },
                  { x: 370, o: 85, c: 75, h: 65, l: 95 },
                  { x: 395, o: 75, c: 60, h: 52, l: 82 },
                  { x: 420, o: 60, c: 50, h: 42, l: 70 },
                  { x: 445, o: 50, c: 65, h: 38, l: 72 },
                  { x: 470, o: 65, c: 55, h: 45, l: 75 },
                  { x: 495, o: 55, c: 40, h: 32, l: 62 },
                  { x: 520, o: 40, c: 35, h: 25, l: 48 },
                  { x: 545, o: 35, c: 28, h: 20, l: 42 },
                ].map((c, i) => {
                  const isGreen = c.c < c.o;
                  const bodyTop = Math.min(c.o, c.c);
                  const bodyH = Math.abs(c.o - c.c) || 2;
                  return (
                    <g key={i}>
                      <line x1={c.x} y1={c.h} x2={c.x} y2={c.l} stroke={isGreen ? "#26A69A" : "#EF5350"} strokeWidth="1.2" />
                      <rect x={c.x - 8} y={bodyTop} width="16" height={bodyH} rx="1" fill={isGreen ? "#26A69A" : "#EF5350"} />
                    </g>
                  );
                })}
                {/* Price line */}
                <line x1="0" y1="28" x2="560" y2="28" stroke="#2962FF" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                <rect x="500" y="20" width="60" height="16" rx="3" fill="#2962FF" />
                <text x="530" y="31" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">67,432</text>
              </svg>
            </div>

            {/* Right sidebar */}
            <div className="lg:col-span-5 divide-y divide-[#E0E3EB]">
              {/* Order Book */}
              <div className="p-5">
                <span className="text-[11px] font-semibold text-[#787B86] uppercase tracking-[0.1em]">Order Book</span>
                <div className="mt-3 space-y-1">
                  {/* Asks */}
                  {[
                    { price: "67,480.20", size: "0.842", pct: 85 },
                    { price: "67,465.50", size: "1.245", pct: 65 },
                    { price: "67,450.10", size: "0.520", pct: 40 },
                  ].map((ask, i) => (
                    <div key={`a${i}`} className="relative flex items-center justify-between py-1 px-2 rounded text-[12px]">
                      <div className="absolute inset-0 rounded bg-[#EF5350]/[0.06]" style={{ width: `${ask.pct}%` }} />
                      <span className="relative text-[#EF5350] font-medium">{ask.price}</span>
                      <span className="relative text-[#787B86]">{ask.size}</span>
                    </div>
                  ))}
                  {/* Spread */}
                  <div className="flex items-center justify-center py-1.5">
                    <span className="text-[11px] text-[#787B86]">Spread: $14.70 (0.02%)</span>
                  </div>
                  {/* Bids */}
                  {[
                    { price: "67,432.50", size: "2.180", pct: 90 },
                    { price: "67,420.30", size: "1.050", pct: 55 },
                    { price: "67,410.00", size: "0.780", pct: 45 },
                  ].map((bid, i) => (
                    <div key={`b${i}`} className="relative flex items-center justify-between py-1 px-2 rounded text-[12px]">
                      <div className="absolute inset-0 rounded bg-[#26A69A]/[0.06]" style={{ width: `${bid.pct}%` }} />
                      <span className="relative text-[#26A69A] font-medium">{bid.price}</span>
                      <span className="relative text-[#787B86]">{bid.size}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Positions */}
              <div className="p-5">
                <span className="text-[11px] font-semibold text-[#787B86] uppercase tracking-[0.1em]">Active Positions</span>
                <div className="mt-3 space-y-2">
                  {[
                    { pair: "BTC/USD", side: "LONG", entry: "$66,890", pnl: "+$542.50", pnlPct: "+0.81%", up: true },
                    { pair: "ETH/USD", side: "LONG", entry: "$3,480", pnl: "+$124.50", pnlPct: "+3.58%", up: true },
                    { pair: "SOL/USD", side: "SHORT", entry: "$152.40", pnl: "-$18.75", pnlPct: "-1.23%", up: false },
                  ].map((pos, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#F8F9FD] border border-[#E0E3EB]/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-[#131722]">{pos.pair}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pos.up ? "text-[#26A69A] bg-[#E8F5F2]" : "text-[#EF5350] bg-[#FFEBEE]"}`}>{pos.side}</span>
                        </div>
                        <span className="text-[11px] text-[#787B86]">Entry: {pos.entry}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-[12px] font-semibold ${pos.up ? "text-[#26A69A]" : "text-[#EF5350]"}`}>{pos.pnl}</div>
                        <div className={`text-[11px] ${pos.up ? "text-[#26A69A]" : "text-[#EF5350]"}`}>{pos.pnlPct}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
