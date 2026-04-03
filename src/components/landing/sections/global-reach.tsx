"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Globe, Users, Clock, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";

const ease = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/*  Globe 3D — loaded dynamically to avoid SSR                        */
/* ------------------------------------------------------------------ */
const Globe3D = dynamic(() => import("./globe-3d").then((m) => m.Globe3D), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] lg:h-[600px] flex items-center justify-center">
      <div className="w-[280px] h-[280px] rounded-full animate-pulse" style={{ background: "radial-gradient(circle, rgba(41,98,255,0.08), transparent 70%)" }} />
    </div>
  ),
});

/* ------------------------------------------------------------------ */
/*  Stat cards                                                         */
/* ------------------------------------------------------------------ */
const STATS = [
  { icon: Globe, value: "50+", label: "Countries", color: "#2962FF", pos: "top-[10%] left-0 lg:left-[-2%]" },
  { icon: Users, value: "100K+", label: "Traders", color: "#26A69A", pos: "top-[14%] right-0 lg:right-[-2%]" },
  { icon: Clock, value: "24/7", label: "Markets", color: "#AB47BC", pos: "bottom-[14%] left-0 lg:left-[2%]" },
  { icon: TrendingUp, value: "$2M+", label: "Volume", color: "#2962FF", pos: "bottom-[10%] right-0 lg:right-[2%]" },
];

/* ------------------------------------------------------------------ */
/*  Main section                                                       */
/* ------------------------------------------------------------------ */
export function GlobalReachSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      id="global-reach"
      ref={sectionRef}
      className="relative py-24 lg:py-40 overflow-hidden"
      style={{ background: "#000000" }}
    >
      {/* Subtle radial glow only — no background image */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(41,98,255,0.04) 0%, transparent 60%)" }} />

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 lg:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[13px] font-semibold text-[#2962FF] uppercase tracking-[0.08em] mb-5">
              <Globe className="w-3.5 h-3.5" />
              Global Reach
            </span>
          </motion.div>

          <motion.h2
            className="text-[clamp(2rem,5vw,3.5rem)] font-bold text-white leading-[1.1] tracking-tight mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.6, ease }}
          >
            Global markets in{" "}
            <span className="bg-gradient-to-r from-[#2962FF] via-[#6B8AFF] to-[#AB47BC] bg-clip-text text-transparent">
              your hand
            </span>
          </motion.h2>

          <motion.p
            className="max-w-[540px] mx-auto text-[16px] lg:text-[17px] text-white/45 leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6, ease }}
          >
            Connect with top-performing traders worldwide. Copy strategies
            across every major market, 24 hours a day.
          </motion.p>
        </div>

        {/* Globe + stats container */}
        <div className="relative max-w-[720px] mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.3, duration: 1, ease }}
            className="relative w-full h-[420px] md:h-[520px] lg:h-[600px]"
          >
            <Globe3D />
          </motion.div>

          {/* Floating stat cards */}
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className={`absolute z-10 hidden md:block ${stat.pos}`}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
                transition={{ delay: 0.8 + i * 0.12, duration: 0.6, ease }}
              >
                <motion.div
                  className="backdrop-blur-xl rounded-2xl px-5 py-4 cursor-default select-none border border-white/[0.08]"
                  style={{ background: "rgba(10,10,20,0.6)" }}
                  whileHover={{ scale: 1.06, y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: `${stat.color}18` }}>
                      <Icon className="w-4 h-4" style={{ color: stat.color }} strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-[18px] font-bold text-white leading-tight">{stat.value}</p>
                      <p className="text-[12px] font-medium text-white/50">{stat.label}</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile stats row */}
        <div className="grid grid-cols-4 gap-3 mt-8 md:hidden">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center rounded-xl border border-white/[0.06] py-3 px-2" style={{ background: "rgba(255,255,255,0.02)" }}>
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: stat.color }} />
                <p className="text-[15px] font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-white/40">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Bottom descriptors */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16 lg:mt-24"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1, duration: 0.6, ease }}
        >
          {[
            { title: "Multi-Exchange", desc: "Connect to multiple exchanges from a single dashboard." },
            { title: "Low Latency", desc: "Sub-200ms execution across global infrastructure." },
            { title: "No Restrictions", desc: "Trade any supported pair, any market, any timezone." },
            { title: "Unified Portfolio", desc: "Track all positions, P&L, and copy trades in one view." },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              className="rounded-2xl border border-white/[0.06] p-5 lg:p-6 transition-all duration-300 hover:border-white/[0.12]"
              style={{ background: "rgba(255,255,255,0.02)" }}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.1 + i * 0.08, duration: 0.5, ease }}
            >
              <h4 className="text-[15px] font-semibold text-white/90 mb-1.5">{item.title}</h4>
              <p className="text-[13px] text-white/40 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
