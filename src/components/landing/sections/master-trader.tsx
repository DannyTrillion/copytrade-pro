"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Signal, Users, DollarSign, TrendingUp, ArrowRight, ArrowUpRight } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

export function MasterTraderSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="traders" className="relative py-24 lg:py-32" style={{ background: "#080A12" }} ref={ref}>
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease }}
          >
            <span className="inline-block text-xs font-medium text-white/40 uppercase tracking-[0.2em] mb-4">For Master Traders</span>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white leading-tight mb-4">
              Share Signals. Earn Revenue.
            </h2>
            <p className="text-base text-white/50 mb-8 leading-relaxed">
              Connect your TradingView alerts and build a following. Every copied trade earns you commission automatically.
            </p>

            <div className="space-y-3.5 mb-8">
              {[
                { icon: Signal, text: "Send signals directly from TradingView alerts" },
                { icon: Users, text: "Build a follower base and reputation" },
                { icon: DollarSign, text: "Earn commission on every copied trade" },
                { icon: TrendingUp, text: "Track performance with detailed analytics" },
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
              href="/signup?role=trader"
              className="group inline-flex items-center gap-2 px-7 py-3 bg-[#2962FF] text-white font-semibold text-sm rounded-full hover:bg-[#1a4fd4] transition-colors duration-200 active:scale-[0.97]"
            >
              Become a Master Trader
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>

          {/* Right dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1, ease }}
          >
            <div className="border border-white/[0.06] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-medium text-white/40">Master Trader Dashboard</span>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#26A69A]" />
                  <span className="text-xs font-medium text-[#26A69A]">Active</span>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
                {[
                  { label: "Total PnL", value: "$45,230", color: "text-[#26A69A]" },
                  { label: "Followers", value: "127", color: "text-white" },
                  { label: "Win Rate", value: "72.4%", color: "text-white" },
                ].map((stat, i) => (
                  <div key={i} className="px-5 py-3.5">
                    <p className="text-[11px] font-medium text-white/40 mb-1">{stat.label}</p>
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                {[
                  { symbol: "BTC-YES", action: "BUY", price: "0.78", copied: 45, time: "2m" },
                  { symbol: "ETH-NO", action: "SELL", price: "0.42", copied: 38, time: "22m" },
                  { symbol: "SOL-YES", action: "BUY", price: "0.65", copied: 42, time: "1h" },
                ].map((signal, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <ArrowUpRight className={`w-3.5 h-3.5 ${signal.action === "BUY" ? "text-[#26A69A]" : "text-[#EF5350] rotate-90"}`} />
                      <span className="text-sm font-medium text-white">{signal.symbol}</span>
                      <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${signal.action === "BUY" ? "text-[#26A69A] bg-[#26A69A]/10" : "text-[#EF5350] bg-[#EF5350]/10"}`}>
                        {signal.action}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono text-white/40">${signal.price}</span>
                      <span className="text-xs font-medium text-[#2962FF]">{signal.copied} copied</span>
                      <span className="text-xs text-white/25">{signal.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
