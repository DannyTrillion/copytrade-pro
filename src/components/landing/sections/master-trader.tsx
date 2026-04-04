"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Signal, Users, DollarSign, TrendingUp, ArrowRight, ArrowUpRight } from "lucide-react";

export function MasterTraderSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="traders" className="relative py-24 lg:py-32" style={{ background: "#080A12" }} ref={ref}>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block text-xs font-semibold text-success uppercase tracking-widest mb-4">For Master Traders</span>
            <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-white leading-tight mb-5">
              Share Signals.{" "}
              <span className="bg-gradient-to-r from-success to-brand bg-clip-text text-transparent">
                Earn Revenue.
              </span>
            </h2>
            <p className="text-base text-white/50 mb-10 leading-relaxed">
              Connect your TradingView alerts and build a following. Every copied trade earns you commission automatically.
            </p>

            <div className="space-y-4 mb-10">
              {[
                { icon: Signal, text: "Send signals directly from TradingView alerts", color: "#2962FF", bgColor: "bg-brand-50" },
                { icon: Users, text: "Build a follower base and reputation", color: "#26A69A", bgColor: "bg-success/10" },
                { icon: DollarSign, text: "Earn commission on every copied trade", color: "#FF9800", bgColor: "bg-warning/10" },
                { icon: TrendingUp, text: "Track performance with detailed analytics", color: "#AB47BC", bgColor: "bg-accent/10" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-4"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.bgColor}`}>
                    <item.icon className="w-4.5 h-4.5" style={{ color: item.color }} />
                  </div>
                  <span className="text-sm text-white/60">{item.text}</span>
                </motion.div>
              ))}
            </div>

            <Link
              href="/signup?role=trader"
              className="group inline-flex items-center gap-2 px-7 py-3 bg-success hover:bg-success-dark text-white font-semibold text-sm rounded-full transition-all duration-200 hover:shadow-glow-success active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-success/30"
            >
              Become a Master Trader
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>

          {/* Right dashboard preview */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="border border-white/[0.06] rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)]" style={{ background: "rgba(19,23,34,0.8)" }}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-xs font-semibold text-white/50">Master Trader Dashboard</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-xs font-medium text-success">Active</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
                {[
                  { label: "Total PnL", value: "$45,230", color: "text-success" },
                  { label: "Followers", value: "127", color: "text-white" },
                  { label: "Win Rate", value: "72.4%", color: "text-white" },
                ].map((stat, i) => (
                  <div key={i} className="px-6 py-4">
                    <p className="text-2xs font-medium text-white/50 mb-1">{stat.label}</p>
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Signal list */}
              <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                {[
                  { symbol: "BTC-YES", action: "BUY", price: "0.78", copied: 45, time: "2m" },
                  { symbol: "ETH-NO", action: "SELL", price: "0.42", copied: 38, time: "22m" },
                  { symbol: "SOL-YES", action: "BUY", price: "0.65", copied: 42, time: "1h" },
                ].map((signal, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      {signal.action === "BUY" ? (
                        <ArrowUpRight className="w-4 h-4 text-success" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-danger rotate-90" />
                      )}
                      <span className="text-sm font-semibold text-white">{signal.symbol}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${signal.action === "BUY" ? "text-success bg-success/10" : "text-danger bg-danger/10"}`}>
                        {signal.action}
                      </span>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className="text-xs font-mono text-white/50">${signal.price}</span>
                      <span className="text-xs font-medium text-brand">{signal.copied} copied</span>
                      <span className="text-xs text-white/30">{signal.time}</span>
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
