"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Signal, Users, DollarSign, TrendingUp, ArrowRight, ArrowUpRight } from "lucide-react";

export function MasterTraderSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="traders" className="relative py-24 lg:py-32 bg-[#F8F9FD]" ref={ref}>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block text-[13px] font-semibold text-[#26A69A] uppercase tracking-[0.08em] mb-4">For Master Traders</span>
            <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-[#131722] leading-tight mb-5">
              Share Signals.{" "}
              <span className="bg-gradient-to-r from-[#26A69A] to-[#2962FF] bg-clip-text text-transparent">
                Earn Revenue.
              </span>
            </h2>
            <p className="text-[17px] text-[#787B86] mb-10 leading-relaxed">
              Connect your TradingView alerts and build a following. Every copied trade earns you commission automatically.
            </p>

            <div className="space-y-4 mb-10">
              {[
                { icon: Signal, text: "Send signals directly from TradingView alerts", color: "#2962FF", bgColor: "bg-[#EBF0FF]" },
                { icon: Users, text: "Build a follower base and reputation", color: "#26A69A", bgColor: "bg-[#E8F5F2]" },
                { icon: DollarSign, text: "Earn commission on every copied trade", color: "#FF9800", bgColor: "bg-[#FFF4E5]" },
                { icon: TrendingUp, text: "Track performance with detailed analytics", color: "#AB47BC", bgColor: "bg-[#F3E5F5]" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-4"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.bgColor}`}>
                    <item.icon className="w-4.5 h-4.5" style={{ color: item.color }} />
                  </div>
                  <span className="text-[15px] text-[#434651]">{item.text}</span>
                </motion.div>
              ))}
            </div>

            <Link
              href="/signup?role=trader"
              className="group inline-flex items-center gap-2 px-7 py-3 bg-[#26A69A] hover:bg-[#1E8C82] text-white font-semibold text-[15px] rounded-[20px] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(38,166,154,0.3)]"
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
            <div className="bg-white border border-[#E0E3EB] rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#E0E3EB] flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#787B86]">Master Trader Dashboard</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#26A69A]" />
                  <span className="text-[12px] font-medium text-[#26A69A]">Active</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 divide-x divide-[#E0E3EB]">
                {[
                  { label: "Total PnL", value: "$45,230", color: "text-[#26A69A]" },
                  { label: "Followers", value: "127", color: "text-[#131722]" },
                  { label: "Win Rate", value: "72.4%", color: "text-[#131722]" },
                ].map((stat, i) => (
                  <div key={i} className="px-6 py-4">
                    <p className="text-[11px] font-medium text-[#787B86] mb-1">{stat.label}</p>
                    <p className={`text-[18px] font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Signal list */}
              <div className="divide-y divide-[#E0E3EB] border-t border-[#E0E3EB]">
                {[
                  { symbol: "BTC-YES", action: "BUY", price: "0.78", copied: 45, time: "2m" },
                  { symbol: "ETH-NO", action: "SELL", price: "0.42", copied: 38, time: "22m" },
                  { symbol: "SOL-YES", action: "BUY", price: "0.65", copied: 42, time: "1h" },
                ].map((signal, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      {signal.action === "BUY" ? (
                        <ArrowUpRight className="w-4 h-4 text-[#26A69A]" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-[#EF5350] rotate-90" />
                      )}
                      <span className="text-[14px] font-semibold text-[#131722]">{signal.symbol}</span>
                      <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-md ${signal.action === "BUY" ? "text-[#26A69A] bg-[#E8F5F2]" : "text-[#EF5350] bg-[#FFEBEE]"}`}>
                        {signal.action}
                      </span>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className="text-[13px] font-mono text-[#787B86]">${signal.price}</span>
                      <span className="text-[12px] font-medium text-[#2962FF]">{signal.copied} copied</span>
                      <span className="text-[12px] text-[#B2B5BE]">{signal.time}</span>
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
