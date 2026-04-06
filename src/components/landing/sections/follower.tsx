"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Copy, Sliders, Zap, Shield, ArrowRight, TrendingUp } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

export function FollowerSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative py-24 lg:py-32" style={{ background: "#080A12" }} ref={ref}>
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left UI mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease }}
          >
            <div className="border border-white/[0.06] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="px-5 py-3.5 border-b border-white/[0.06]">
                <span className="text-xs font-medium text-white/40">Copy Trading Panel</span>
              </div>

              <div className="p-4 space-y-3">
                {[
                  { name: "AlphaTrader", pnl: "+$45,230", winRate: "72.4%", followers: "1,243" },
                  { name: "CryptoKing", pnl: "+$38,120", winRate: "68.1%", followers: "892" },
                  { name: "MarketMaven", pnl: "+$29,840", winRate: "65.7%", followers: "654" },
                ].map((trader, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:border-white/[0.1] transition-colors duration-150">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#2962FF]/15 flex items-center justify-center text-[#2962FF] text-xs font-bold">
                          {trader.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{trader.name}</p>
                          <p className="text-[11px] text-white/30">{trader.followers} followers</p>
                        </div>
                      </div>
                      <button className="px-3.5 py-1.5 text-xs font-medium bg-[#2962FF] text-white rounded-full hover:bg-[#1a4fd4] transition-colors duration-150">
                        Copy
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-[#26A69A] font-medium">{trader.pnl} PnL</span>
                      <span className="text-xs text-white/40">{trader.winRate} win</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 pb-4">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-white/40">Risk Settings</span>
                    <span className="text-[11px] font-medium text-[#26A69A] bg-[#26A69A]/10 px-2 py-0.5 rounded">Protected</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: "Risk per Trade", value: "2%" },
                      { label: "Max Trade Size", value: "$1,000" },
                      { label: "Max Daily Loss", value: "$5,000" },
                    ].map((setting, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-white/40">{setting.label}</span>
                        <span className="text-xs font-mono font-medium text-white">{setting.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1, ease }}
          >
            <span className="inline-block text-xs font-medium text-white/40 uppercase tracking-[0.2em] mb-4">For Followers</span>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white leading-tight mb-4">
              Trade Like a Pro. Without the Work.
            </h2>
            <p className="text-base text-white/50 mb-8 leading-relaxed">
              No chart reading. No signal watching. Just connect, configure your risk, and let the platform handle everything.
            </p>

            <div className="space-y-3.5 mb-8">
              {[
                { icon: Copy, text: "Copy trades from verified top performers" },
                { icon: Sliders, text: "Set your own risk percentage and limits" },
                { icon: Zap, text: "Zero manual trading — fully automated" },
                { icon: Shield, text: "Full control — pause or stop anytime" },
                { icon: TrendingUp, text: "Real-time performance tracking and PnL" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#2962FF]/10">
                    <item.icon className="w-4 h-4 text-[#2962FF]" />
                  </div>
                  <span className="text-sm text-white/55">{item.text}</span>
                </div>
              ))}
            </div>

            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 px-7 py-3 bg-[#2962FF] text-white font-semibold text-sm rounded-full hover:bg-[#1a4fd4] transition-colors duration-200 active:scale-[0.97]"
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
