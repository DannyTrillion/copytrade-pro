"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Globe,
  Wallet,
  LineChart,
  Bell,
  ArrowLeftRight,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: Globe,
    title: "Multi-Exchange Support",
    description:
      "Connect to multiple exchanges from a single dashboard. Trade across Polymarket and more with unified portfolio tracking.",
    color: "#2962FF",
  },
  {
    icon: ArrowLeftRight,
    title: "Instant Copy Execution",
    description:
      "Sub-200ms trade mirroring with parallel order placement. Your copies execute the moment a signal is detected.",
    color: "#26A69A",
  },
  {
    icon: LineChart,
    title: "Advanced Analytics",
    description:
      "Deep performance insights with PnL curves, drawdown analysis, Sharpe ratios, and per-trader breakdowns.",
    color: "#AB47BC",
  },
  {
    icon: Wallet,
    title: "Non-Custodial Wallets",
    description:
      "Your funds stay in your wallet. We never hold or access your capital — only execute trades on your behalf.",
    color: "#2962FF",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Real-time alerts for trade executions, risk limit triggers, and portfolio milestones. Never miss a move.",
    color: "#26A69A",
  },
  {
    icon: ShieldCheck,
    title: "Institutional Security",
    description:
      "AES-256 encryption, 2FA enforcement, IP whitelisting, and audit logs. Built to institutional standards.",
    color: "#AB47BC",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.15 + i * 0.08,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
} as const;

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Icon = feature.icon;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      className="group relative"
    >
      <div
        className="relative h-full rounded-2xl border border-white/[0.06] p-7 transition-all duration-300 hover:border-white/[0.12] hover:-translate-y-0.5"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
        }}
      >
        {/* Hover glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(600px circle at 50% 0%, ${feature.color}08, transparent 60%)`,
          }}
        />

        <div className="relative">
          <div
            className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.06]"
            style={{ background: `${feature.color}12` }}
          >
            <Icon
              className="h-5 w-5"
              style={{ color: feature.color }}
              strokeWidth={1.5}
            />
          </div>

          <h3 className="mb-2.5 text-[15px] font-semibold text-white leading-snug">
            {feature.title}
          </h3>

          <p className="text-sm leading-relaxed text-white/45">
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function GlobalReachSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-80px" });

  return (
    <section
      id="global-reach"
      className="relative py-24 lg:py-32 overflow-hidden"
      style={{ background: "#000000" }}
    >
      {/* Subtle radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(41,98,255,0.04) 0%, transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-[1100px] px-6 relative z-10">
        {/* Section Header */}
        <div ref={headerRef} className="mb-16 text-center lg:mb-20">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease }}
            className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.2em] text-white/40"
          >
            Why Choose Us
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.08, duration: 0.5, ease }}
            className="mb-4 text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight text-white"
          >
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-[#2962FF] via-[#26A69A] to-[#AB47BC] bg-clip-text text-transparent">
              Trade Smarter
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.16, duration: 0.5, ease }}
            className="mx-auto max-w-[500px] text-base leading-relaxed text-white/45"
          >
            Professional-grade tools and infrastructure designed for
            serious traders who demand speed, security, and scale.
          </motion.p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
