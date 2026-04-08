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
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative py-24 lg:py-32" style={{ background: "#06060a" }} ref={ref} id="features">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(13,113,255,0.03),transparent_60%)]" />

      <div className="relative max-w-[1140px] mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, ease }} className="text-center mb-20">
          <span className="inline-block text-xs font-medium text-[#0D71FF] uppercase tracking-[0.2em] mb-4">Platform</span>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white leading-tight mb-4">Built for Serious Traders</h2>
          <p className="text-base text-white/35 max-w-[500px] mx-auto leading-relaxed">Every feature designed around Webull&apos;s infrastructure. No compromises on speed, security, or transparency.</p>
        </motion.div>

        {/* Alternating feature rows with REAL screenshots */}
        <div className="space-y-24">
          {FEATURES.map((feat, i) => {
            const isReversed = i % 2 === 1;

            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.7, ease }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
              >
                {/* Text */}
                <div className={isReversed ? "lg:order-2" : ""}>
                  <div className="w-12 h-12 rounded-xl bg-[#0D71FF]/8 border border-[#0D71FF]/12 flex items-center justify-center mb-5">
                    <feat.icon className="w-6 h-6 text-[#0D71FF]" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3 leading-tight">{feat.title}</h3>
                  <p className="text-sm text-white/35 leading-relaxed max-w-[420px]">{feat.description}</p>

                  {/* Mini stats */}
                  <div className="flex items-center gap-4 mt-6">
                    {i === 0 && (
                      <>
                        <div className="text-center"><p className="text-lg font-bold text-white">6</p><p className="text-[10px] text-white/20">Payment methods</p></div>
                        <div className="w-px h-8 bg-white/[0.06]" />
                        <div className="text-center"><p className="text-lg font-bold text-white">8</p><p className="text-[10px] text-white/20">Cryptocurrencies</p></div>
                      </>
                    )}
                    {i === 1 && (
                      <>
                        <div className="text-center"><p className="text-lg font-bold text-white">100+</p><p className="text-[10px] text-white/20">Verified traders</p></div>
                        <div className="w-px h-8 bg-white/[0.06]" />
                        <div className="text-center"><p className="text-lg font-bold text-white">73%</p><p className="text-[10px] text-white/20">Avg win rate</p></div>
                      </>
                    )}
                    {i === 2 && (
                      <>
                        <div className="text-center"><p className="text-lg font-bold text-white">$284K</p><p className="text-[10px] text-white/20">Volume traded</p></div>
                        <div className="w-px h-8 bg-white/[0.06]" />
                        <div className="text-center"><p className="text-lg font-bold text-[#26A69A]">Live</p><p className="text-[10px] text-white/20">Real-time data</p></div>
                      </>
                    )}
                    {i === 3 && (
                      <>
                        <div className="text-center"><p className="text-lg font-bold text-white">&lt;200ms</p><p className="text-[10px] text-white/20">Execution speed</p></div>
                        <div className="w-px h-8 bg-white/[0.06]" />
                        <div className="text-center"><p className="text-lg font-bold text-white">24/7</p><p className="text-[10px] text-white/20">Automated</p></div>
                      </>
                    )}
                  </div>
                </div>

                {/* Image */}
                <div className={isReversed ? "lg:order-1" : ""}>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -4 }}
                    transition={{ duration: 0.3, ease }}
                    className="relative group"
                  >
                    {/* Glow */}
                    <div className="absolute -inset-4 bg-[#0D71FF]/[0.03] blur-[40px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

                    <div className={`rounded-2xl overflow-hidden border border-white/[0.06] shadow-[0_16px_48px_rgba(0,0,0,0.4)] group-hover:border-white/[0.1] transition-colors duration-300 ${feat.isModal ? "max-w-[320px] mx-auto" : ""}`}>
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
