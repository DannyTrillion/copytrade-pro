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
      bgColor: "bg-[#EBF0FF]",
    },
    {
      icon: UserCheck,
      title: "Choose Trader",
      desc: "Browse verified master traders with transparent performance stats, win rates, and track records.",
      color: "#26A69A",
      bgColor: "bg-[#E8F5F2]",
    },
    {
      icon: Sliders,
      title: "Set Risk %",
      desc: "Configure your risk per trade, maximum trade size, and daily loss limits. Full control, always.",
      color: "#FF9800",
      bgColor: "bg-[#FFF4E5]",
    },
    {
      icon: Zap,
      title: "Auto Copy",
      desc: "Trades execute automatically when your chosen trader sends a signal. Real-time, zero delay.",
      color: "#AB47BC",
      bgColor: "bg-[#F3E5F5]",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 lg:py-32 bg-[#F8F9FD]" ref={ref}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16 lg:mb-20"
        >
          <span className="inline-block text-[13px] font-semibold text-[#26A69A] uppercase tracking-[0.08em] mb-4">How It Works</span>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-[#131722] leading-tight mb-5">
            Four Steps to{" "}
            <span className="bg-gradient-to-r from-[#26A69A] to-[#2962FF] bg-clip-text text-transparent">
              Automated Trading
            </span>
          </h2>
          <p className="text-[17px] text-[#787B86] max-w-[560px] mx-auto leading-relaxed">
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
              <div className="bg-white border border-[#E0E3EB] rounded-2xl p-8 hover:border-[#C8CBD5] transition-all duration-300 h-full hover:shadow-[0_8px_30px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]">
                {/* Step number */}
                <div className="absolute -top-3 -left-1 text-[56px] font-black text-[#131722]/[0.03] leading-none select-none pointer-events-none">
                  {i + 1}
                </div>

                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${step.bgColor}`}
                >
                  <step.icon className="w-5 h-5" style={{ color: step.color }} />
                </div>

                <h3 className="text-[17px] font-semibold text-[#131722] mb-2">{step.title}</h3>
                <p className="text-[14px] text-[#787B86] leading-relaxed">{step.desc}</p>

                {/* Connector */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-[#E0E3EB]" />
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
          className="mt-14 bg-white border border-[#E0E3EB] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
        >
          {/* Dashboard Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[#E0E3EB] bg-[#FAFBFC]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#EF5350]" />
              <div className="w-3 h-3 rounded-full bg-[#FF9800]" />
              <div className="w-3 h-3 rounded-full bg-[#26A69A]" />
            </div>
            <span className="text-[11px] font-semibold text-[#787B86] uppercase tracking-[0.08em]">Dashboard Preview</span>
            <div className="w-2 h-2 rounded-full bg-[#26A69A] animate-pulse" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-[#E0E3EB]">
            {/* Mini Chart */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[13px] font-semibold text-[#131722]">BTC/USD</span>
                  <span className="ml-2 text-[12px] font-semibold text-[#26A69A]">+2.34%</span>
                </div>
                <span className="text-[18px] font-bold text-[#131722]">$67,432</span>
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
              <span className="text-[11px] font-semibold text-[#787B86] uppercase tracking-[0.1em]">Active Position</span>
              <div className="mt-3 bg-[#F8F9FD] border border-[#E0E3EB] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold text-[#131722]">ETH/USD Long</span>
                  <span className="text-[10px] font-semibold text-white bg-[#26A69A] px-2 py-0.5 rounded-full">OPEN</span>
                </div>
                <div className="flex items-center justify-between text-[12px] text-[#787B86] mb-1">
                  <span>Entry: $3,480.20</span>
                  <span className="text-[#26A69A] font-semibold">+$124.50</span>
                </div>
                <div className="flex items-center justify-between text-[12px] text-[#787B86]">
                  <span>Size: 0.5 ETH</span>
                  <span className="text-[#26A69A] font-semibold">+3.58%</span>
                </div>
                <div className="mt-2 w-full h-1.5 bg-[#E0E3EB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#26A69A] rounded-full" style={{ width: "72%" }} />
                </div>
              </div>
            </div>

            {/* Recent Trades */}
            <div className="p-5">
              <span className="text-[11px] font-semibold text-[#787B86] uppercase tracking-[0.1em]">Recent Trades</span>
              <div className="mt-3 space-y-2">
                {[
                  { pair: "BTC/USD", side: "BUY", pnl: "+$82.40", time: "2m ago", up: true },
                  { pair: "SOL/USD", side: "SELL", pnl: "-$12.30", time: "8m ago", up: false },
                  { pair: "ETH/USD", side: "BUY", pnl: "+$45.80", time: "15m ago", up: true },
                ].map((trade, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F8F9FD] border border-[#E0E3EB]/50">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${trade.up ? "text-[#26A69A] bg-[#E8F5F2]" : "text-[#EF5350] bg-[#FFEBEE]"}`}>{trade.side}</span>
                      <span className="text-[12px] font-medium text-[#131722]">{trade.pair}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[12px] font-semibold ${trade.up ? "text-[#26A69A]" : "text-[#EF5350]"}`}>{trade.pnl}</span>
                      <span className="text-[10px] text-[#787B86]">{trade.time}</span>
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
