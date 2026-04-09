"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link2, BarChart3, Bot, Users } from "lucide-react";
import Image from "next/image";

const ease = [0.22, 1, 0.36, 1] as const;

const FEATURES = [
  {
    icon: Link2,
    title: "Seamless Webull Integration",
    description: "Connect your Webull account via secure API in under 60 seconds. Full encryption, granular permissions, real-time sync. Your credentials never touch our servers.",
    image: "/screenshots/dashboard-deposit.png",
    imageAlt: "Deposit & Fund Management",
  },
  {
    icon: Users,
    title: "Copy Top-Performing Traders",
    description: "Browse a curated marketplace of verified traders ranked by ROI, win rate, and consistency. One click to start mirroring their exact strategy — with full allocation control.",
    image: "/screenshots/dashboard-copytrading.png",
    imageAlt: "Copy Trading Dashboard",
  },
  {
    icon: BarChart3,
    title: "Real-Time Performance Tracking",
    description: "Monitor every metric that matters — P&L, drawdown, win rate, tier progress — all updating live. Institutional-grade analytics at your fingertips.",
    image: "/screenshots/dashboard-dark.png",
    imageAlt: "Main Dashboard Analytics",
  },
  {
    icon: Bot,
    title: "Automated Trade Execution",
    description: "Every signal is processed and executed on your Webull account in under 200ms. Set your strategy once, configure risk limits, and let the engine handle everything 24/7.",
    image: "/screenshots/dashboard-copy-request-dark.png",
    imageAlt: "Copy Trading Request",
    isModal: true,
  },
];

export function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section className="relative py-24 lg:py-32" style={{ background: "#06060a" }} ref={ref} id="features">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(13,113,255,0.03),transparent_60%)]" />

      <div className="relative max-w-[1140px] mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1, ease }} className="text-center mb-20">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ delay: 0.1, duration: 0.8, ease }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#0D71FF]/15 bg-[#0D71FF]/[0.05] mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0D71FF]" />
            <span className="text-xs font-medium text-[#0D71FF]/80 uppercase tracking-wider">Platform</span>
          </motion.div>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-white leading-tight mb-5">
            Built for <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Serious Traders</span>
          </h2>
          <p className="text-[15px] text-white/35 max-w-[520px] mx-auto leading-[1.7]">Every feature designed around Webull&apos;s infrastructure. No compromises on speed, security, or transparency.</p>
        </motion.div>

        {/* Alternating feature rows with REAL screenshots */}
        <div className="space-y-28 lg:space-y-32">
          {FEATURES.map((feat, i) => {
            const isReversed = i % 2 === 1;

            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 40, x: isReversed ? -30 : 30 }}
                animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
                transition={{ delay: 0.15 + i * 0.15, duration: 1, ease }}
                style={{ willChange: "transform, opacity" }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
              >
                {/* Text */}
                <div className={isReversed ? "lg:order-2" : ""}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-[#0D71FF]/8 border border-[#0D71FF]/12 flex items-center justify-center">
                      <feat.icon className="w-5 h-5 text-[#0D71FF]" />
                    </div>
                    <span className="text-[11px] font-bold text-white/15 uppercase tracking-widest">0{i + 1}</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3 leading-tight">{feat.title}</h3>
                  <p className="text-[14px] text-white/40 leading-[1.75] max-w-[420px]">{feat.description}</p>

                  {/* Stat pills */}
                  <div className="flex items-center gap-2 mt-6 flex-wrap">
                    {(i === 0 ? [{ v: "6", l: "Payment methods" }, { v: "8", l: "Cryptocurrencies" }]
                      : i === 1 ? [{ v: "100+", l: "Verified traders" }, { v: "73%", l: "Avg win rate" }]
                      : i === 2 ? [{ v: "$284K", l: "Volume" }, { v: "Live", l: "Real-time" }]
                      : [{ v: "<200ms", l: "Speed" }, { v: "24/7", l: "Automated" }]
                    ).map((s) => (
                      <div key={s.l} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                        <span className="text-sm font-bold text-white tabular-nums">{s.v}</span>
                        <span className="text-[11px] text-white/30">{s.l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Image */}
                <div className={isReversed ? "lg:order-1" : ""}>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -4 }}
                    transition={{ duration: 0.35, ease }}
                    style={{ willChange: "transform" }}
                    className="relative group"
                  >
                    {/* Glow */}
                    <div className="absolute -inset-4 bg-[#0D71FF]/[0.03] blur-[40px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

                    <div className={`rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.4)] ${feat.isModal ? "max-w-[320px] mx-auto" : ""}`}>
                      <Image
                        src={feat.image}
                        alt={feat.imageAlt}
                        width={feat.isModal ? 459 : 1646}
                        height={feat.isModal ? 534 : 1000}
                        className="w-full h-auto"
                        quality={85}
                        loading="lazy"
                      />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
