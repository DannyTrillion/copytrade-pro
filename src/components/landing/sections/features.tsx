"use client";

import { motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { useRef, type MouseEvent } from "react";
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

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useTransform(y, [0, 1], [3, -3]);
  const rotateY = useTransform(x, [0, 1], [-3, 3]);

  function handleMouse(e: MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
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
      ref={ref}
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

const features = [
  { icon: Copy, title: "Auto Copy Trading", desc: "Automatically replicate trades from top traders the moment a signal arrives. Zero manual intervention.", color: "var(--color-brand)", bgColor: "bg-brand/10" },
  { icon: Shield, title: "Risk Control", desc: "Set risk per trade, max position sizes, and daily loss limits. The system enforces your rules every time.", color: "var(--color-success)", bgColor: "bg-success/10" },
  { icon: Users, title: "Multiple Traders", desc: "Follow multiple master traders simultaneously with independent risk settings for each one.", color: "#AB47BC", bgColor: "bg-accent/10" },
  { icon: Zap, title: "Real-Time Execution", desc: "Sub-second trade execution via async processing with parallel order placement on Polymarket.", color: "var(--color-warning)", bgColor: "bg-warning/10" },
  { icon: BarChart3, title: "Performance Stats", desc: "Comprehensive analytics with PnL tracking, win rates, trade history, and portfolio performance charts.", color: "#1452F0", bgColor: "bg-brand/10" },
  { icon: DollarSign, title: "Commission System", desc: "Transparent 2% platform commission on copied trades. Master traders earn from their follower base.", color: "var(--color-success)", bgColor: "bg-success/10" },
  { icon: Lock, title: "Secure Wallets", desc: "AES-256 encrypted wallet storage. Private keys are never stored in plain text. Bank-grade security.", color: "var(--color-danger)", bgColor: "bg-danger/10" },
  { icon: Cpu, title: "Async Processing", desc: "Queue-based worker system handles concurrent trade execution with retry logic and error handling.", color: "var(--color-brand)", bgColor: "bg-brand/10" },
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
          <span className="inline-block text-xs font-semibold text-brand uppercase tracking-widest mb-4">Platform Features</span>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-text-primary leading-tight mb-5">
            Built for{" "}
            <span className="bg-gradient-to-r from-brand to-success bg-clip-text text-transparent">
              Serious Traders
            </span>
          </h2>
          <p className="text-base text-text-secondary max-w-[560px] mx-auto leading-relaxed">
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
              <TiltCard>
                <div className="bg-white border border-border rounded-xl p-6 h-full hover:border-border-light transition-all duration-300 hover:shadow-card-hover">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${feature.bgColor}`}
                  >
                    <feature.icon className="w-5 h-5" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">{feature.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{feature.desc}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        {/* Live Platform Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 bg-white border border-border rounded-2xl overflow-hidden shadow-card-lg"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-danger" />
                <div className="w-3 h-3 rounded-full bg-warning" />
                <div className="w-3 h-3 rounded-full bg-success" />
              </div>
              <span className="text-xs font-semibold text-text-primary ml-2">CopyTrade Pro — Live Dashboard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse live-pulse text-success" />
              <span className="text-2xs text-text-secondary font-medium">Connected</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* Candlestick Chart Area */}
            <div className="lg:col-span-7 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-text-primary">BTC / USD</span>
                  <span className="text-xl font-bold text-text-primary">67,432.50</span>
                  <span className="text-xs font-semibold text-success">+1,542.30 (+2.34%)</span>
                </div>
                <div className="flex items-center gap-1">
                  {["1H", "4H", "1D", "1W"].map((tf) => (
                    <button key={tf} className={`px-2.5 py-1 text-2xs font-semibold rounded-md transition-all duration-200 ${tf === "4H" ? "bg-brand text-white" : "text-text-secondary hover:bg-surface-2"}`}>{tf}</button>
                  ))}
                </div>
              </div>
              {/* SVG Candlestick Chart */}
              <svg width="100%" height="220" viewBox="0 0 560 220" preserveAspectRatio="none" className="rounded-lg bg-surface-2 border border-border/50">
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
            <div className="lg:col-span-5 divide-y divide-border">
              {/* Order Book */}
              <div className="p-5">
                <span className="text-2xs font-semibold text-text-secondary uppercase tracking-[0.1em]">Order Book</span>
                <div className="mt-3 space-y-1">
                  {/* Asks */}
                  {[
                    { price: "67,480.20", size: "0.842", pct: 85 },
                    { price: "67,465.50", size: "1.245", pct: 65 },
                    { price: "67,450.10", size: "0.520", pct: 40 },
                  ].map((ask, i) => (
                    <div key={`a${i}`} className="relative flex items-center justify-between py-1 px-2 rounded text-xs">
                      <div className="absolute inset-0 rounded bg-danger/[0.06]" style={{ width: `${ask.pct}%` }} />
                      <span className="relative text-danger font-medium">{ask.price}</span>
                      <span className="relative text-text-secondary">{ask.size}</span>
                    </div>
                  ))}
                  {/* Spread */}
                  <div className="flex items-center justify-center py-1.5">
                    <span className="text-2xs text-text-secondary">Spread: $14.70 (0.02%)</span>
                  </div>
                  {/* Bids */}
                  {[
                    { price: "67,432.50", size: "2.180", pct: 90 },
                    { price: "67,420.30", size: "1.050", pct: 55 },
                    { price: "67,410.00", size: "0.780", pct: 45 },
                  ].map((bid, i) => (
                    <div key={`b${i}`} className="relative flex items-center justify-between py-1 px-2 rounded text-xs">
                      <div className="absolute inset-0 rounded bg-success/[0.06]" style={{ width: `${bid.pct}%` }} />
                      <span className="relative text-success font-medium">{bid.price}</span>
                      <span className="relative text-text-secondary">{bid.size}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Positions */}
              <div className="p-5">
                <span className="text-2xs font-semibold text-text-secondary uppercase tracking-[0.1em]">Active Positions</span>
                <div className="mt-3 space-y-2">
                  {[
                    { pair: "BTC/USD", side: "LONG", entry: "$66,890", pnl: "+$542.50", pnlPct: "+0.81%", up: true },
                    { pair: "ETH/USD", side: "LONG", entry: "$3,480", pnl: "+$124.50", pnlPct: "+3.58%", up: true },
                    { pair: "SOL/USD", side: "SHORT", entry: "$152.40", pnl: "-$18.75", pnlPct: "-1.23%", up: false },
                  ].map((pos, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-surface-0 border border-border/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-text-primary">{pos.pair}</span>
                          <span className={`text-2xs font-bold px-1.5 py-0.5 rounded ${pos.up ? "text-success bg-success/10" : "text-danger bg-danger/10"}`}>{pos.side}</span>
                        </div>
                        <span className="text-2xs text-text-secondary">Entry: {pos.entry}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-semibold ${pos.up ? "text-success" : "text-danger"}`}>{pos.pnl}</div>
                        <div className={`text-2xs ${pos.up ? "text-success" : "text-danger"}`}>{pos.pnlPct}</div>
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
