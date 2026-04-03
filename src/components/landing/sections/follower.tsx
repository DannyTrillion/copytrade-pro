"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Copy, Sliders, Zap, Shield, ArrowRight, TrendingUp } from "lucide-react";

export function FollowerSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative py-24 lg:py-32 bg-white" ref={ref}>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left UI mockup */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-card-lg">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border">
                <span className="text-xs font-semibold text-text-secondary">Copy Trading Panel</span>
              </div>

              {/* Trader cards */}
              <div className="p-5 space-y-3">
                {[
                  { name: "AlphaTrader", pnl: "+$45,230", winRate: "72.4%", followers: "1,243", change: [10, 15, 12, 18, 22, 20, 28, 25, 30, 35] },
                  { name: "CryptoKing", pnl: "+$38,120", winRate: "68.1%", followers: "892", change: [8, 10, 14, 11, 16, 20, 18, 22, 24, 28] },
                  { name: "MarketMaven", pnl: "+$29,840", winRate: "65.7%", followers: "654", change: [5, 8, 6, 12, 10, 15, 14, 18, 16, 20] },
                ].map((trader, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.25 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-surface-2 border border-border rounded-xl p-5 hover:border-border-light transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-success flex items-center justify-center text-white text-xs font-bold">
                          {trader.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{trader.name}</p>
                          <p className="text-2xs text-text-tertiary">{trader.followers} followers</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 text-xs font-semibold bg-brand text-white rounded-full hover:bg-brand-dark transition-all duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30">
                        Copy
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-success font-semibold">{trader.pnl} PnL</span>
                        <span className="text-xs text-text-secondary">{trader.winRate} win</span>
                      </div>
                      <svg width="60" height="20" viewBox="0 0 60 20" className="text-success">
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={trader.change.map((v, j) => `${j * 6.6},${20 - v * 0.55}`).join(" ")}
                        />
                      </svg>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Risk controls */}
              <div className="px-5 pb-5">
                <div className="bg-surface-2 border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-text-secondary">Risk Settings</span>
                    <span className="text-xs font-medium text-success bg-success/10 px-2.5 py-0.5 rounded-md">Protected</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Risk per Trade", value: "2%" },
                      { label: "Max Trade Size", value: "$1,000" },
                      { label: "Max Daily Loss", value: "$5,000" },
                    ].map((setting, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">{setting.label}</span>
                        <span className="text-xs font-mono font-semibold text-text-primary">{setting.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right content */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block text-xs font-semibold text-brand uppercase tracking-widest mb-4">For Followers</span>
            <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-text-primary leading-tight mb-5">
              Trade Like a Pro.{" "}
              <span className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
                Without the Work.
              </span>
            </h2>
            <p className="text-base text-text-secondary mb-10 leading-relaxed">
              No chart reading. No signal watching. Just connect, configure your risk, and let the platform handle everything.
            </p>

            <div className="space-y-4 mb-10">
              {[
                { icon: Copy, text: "Copy trades from verified top performers", color: "#2962FF", bgColor: "bg-brand-50" },
                { icon: Sliders, text: "Set your own risk percentage and limits", color: "#26A69A", bgColor: "bg-success/10" },
                { icon: Zap, text: "Zero manual trading — fully automated", color: "#FF9800", bgColor: "bg-warning/10" },
                { icon: Shield, text: "Full control — pause or stop anytime", color: "#EF5350", bgColor: "bg-danger/10" },
                { icon: TrendingUp, text: "Real-time performance tracking and PnL", color: "#AB47BC", bgColor: "bg-accent/10" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 12 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.25 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-4"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.bgColor}`}>
                    <item.icon className="w-4.5 h-4.5" style={{ color: item.color }} />
                  </div>
                  <span className="text-sm text-text-secondary">{item.text}</span>
                </motion.div>
              ))}
            </div>

            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 px-7 py-3 bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full transition-all duration-200 hover:shadow-glow active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            >
              Start Copy Trading
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
