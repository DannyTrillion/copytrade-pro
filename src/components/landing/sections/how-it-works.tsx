"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Wallet, UserCheck, Sliders, Zap } from "lucide-react";

export function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const steps = [
    {
      icon: Wallet,
      title: "Connect Wallet",
      desc: "Link your Polymarket wallet securely. Your private keys are encrypted and never stored in plain text.",
      color: "#2962FF",
      bgColor: "bg-brand-50",
    },
    {
      icon: UserCheck,
      title: "Choose Trader",
      desc: "Browse verified master traders with transparent performance stats, win rates, and track records.",
      color: "#26A69A",
      bgColor: "bg-success/10",
    },
    {
      icon: Sliders,
      title: "Set Risk %",
      desc: "Configure your risk per trade, maximum trade size, and daily loss limits. Full control, always.",
      color: "#FF9800",
      bgColor: "bg-warning/10",
    },
    {
      icon: Zap,
      title: "Auto Copy",
      desc: "Trades execute automatically when your chosen trader sends a signal. Real-time, zero delay.",
      color: "#AB47BC",
      bgColor: "bg-accent/10",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 lg:py-32" style={{ background: "#080A12" }} ref={ref}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16 lg:mb-20"
        >
          <span className="inline-block text-xs font-semibold text-success uppercase tracking-widest mb-4">How It Works</span>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-white leading-tight mb-5">
            Four Steps to{" "}
            <span className="bg-gradient-to-r from-success to-brand bg-clip-text text-transparent">
              Automated Trading
            </span>
          </h2>
          <p className="text-base text-white/50 max-w-[560px] mx-auto leading-relaxed">
            From wallet connection to automatic trade execution in under two minutes.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative group"
            >
              <div className="border border-white/[0.06] rounded-2xl p-8 hover:border-white/[0.12] transition-all duration-300 h-full hover:shadow-[0_0_30px_rgba(41,98,255,0.08)]" style={{ background: "rgba(255,255,255,0.03)" }}>
                {/* Step number */}
                <div className="absolute -top-3 -left-1 text-6xl font-black text-white/[0.03] leading-none select-none pointer-events-none">
                  {i + 1}
                </div>

                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${step.bgColor}`}
                >
                  <step.icon className="w-5 h-5" style={{ color: step.color }} />
                </div>

                <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>

                {/* Connector — draws itself on scroll */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6">
                    <motion.svg
                      width="24"
                      height="2"
                      viewBox="0 0 24 2"
                      className="overflow-visible"
                    >
                      <motion.line
                        x1="0"
                        y1="1"
                        x2="24"
                        y2="1"
                        stroke="#3A3B45"
                        strokeWidth="2"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={inView ? { pathLength: 1 } : {}}
                        transition={{ delay: 0.4 + i * 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      />
                      {/* Arrow dot at the end */}
                      <motion.circle
                        cx="24"
                        cy="1"
                        r="2.5"
                        fill="#2962FF"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={inView ? { scale: 1, opacity: 1 } : {}}
                        transition={{ delay: 0.7 + i * 0.2, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </motion.svg>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mini Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          style={{ background: "rgba(19,23,34,0.8)" }}
        >
          {/* Dashboard Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-danger" />
              <div className="w-3 h-3 rounded-full bg-warning" />
              <div className="w-3 h-3 rounded-full bg-success" />
            </div>
            <span className="text-2xs font-semibold text-white/50 uppercase tracking-widest">Dashboard Preview</span>
            <div className="w-2 h-2 rounded-full bg-success animate-pulse live-pulse text-success" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
            {/* Mini Chart */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs font-semibold text-white">BTC/USD</span>
                  <span className="ml-2 text-xs font-semibold text-success">+2.34%</span>
                </div>
                <span className="text-lg font-bold text-white">$67,432</span>
              </div>
              <svg width="100%" height="80" viewBox="0 0 280 80" preserveAspectRatio="none" className="rounded-lg">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#26A69A" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#26A69A" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,60 Q20,55 40,50 T80,42 T120,48 T160,30 T200,35 T240,20 T280,15 L280,80 L0,80 Z" fill="url(#chartGrad)" />
                <polyline fill="none" stroke="#26A69A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="0,60 40,50 80,42 120,48 160,30 200,35 240,20 280,15" />
                <circle cx="280" cy="15" r="3" fill="#26A69A" />
              </svg>
            </div>

            {/* Active Position */}
            <div className="p-5">
              <span className="text-2xs font-semibold text-white/50 uppercase tracking-[0.1em]">Active Position</span>
              <div className="mt-3 border border-white/[0.06] rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">ETH/USD Long</span>
                  <span className="text-2xs font-semibold text-white bg-success px-2 py-0.5 rounded-full">OPEN</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                  <span>Entry: $3,480.20</span>
                  <span className="text-success font-semibold">+$124.50</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>Size: 0.5 ETH</span>
                  <span className="text-success font-semibold">+3.58%</span>
                </div>
                <div className="mt-2 w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: "72%" }} />
                </div>
              </div>
            </div>

            {/* Recent Trades */}
            <div className="p-5">
              <span className="text-2xs font-semibold text-white/50 uppercase tracking-[0.1em]">Recent Trades</span>
              <div className="mt-3 space-y-2">
                {[
                  { pair: "BTC/USD", side: "BUY", pnl: "+$82.40", time: "2m ago", up: true },
                  { pair: "SOL/USD", side: "SELL", pnl: "-$12.30", time: "8m ago", up: false },
                  { pair: "ETH/USD", side: "BUY", pnl: "+$45.80", time: "15m ago", up: true },
                ].map((trade, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xs font-bold px-1.5 py-0.5 rounded ${trade.up ? "text-success bg-success/10" : "text-danger bg-danger/10"}`}>{trade.side}</span>
                      <span className="text-xs font-medium text-white">{trade.pair}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold ${trade.up ? "text-success" : "text-danger"}`}>{trade.pnl}</span>
                      <span className="text-2xs text-white/40">{trade.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
