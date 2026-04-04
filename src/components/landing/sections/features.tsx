"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Copy,
  Shield,
  Users,
  Zap,
  BarChart3,
  DollarSign,
  Lock,
  Cpu,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Copy,
    title: "Auto Copy Trading",
    description:
      "Replicate trades from top traders the instant a signal arrives. Zero manual intervention required.",
  },
  {
    icon: Shield,
    title: "Risk Control",
    description:
      "Set risk per trade, max position sizes, and daily loss limits. Your rules are enforced every time.",
  },
  {
    icon: Users,
    title: "Multiple Traders",
    description:
      "Follow multiple master traders simultaneously with independent risk settings for each.",
  },
  {
    icon: Zap,
    title: "Real-Time Execution",
    description:
      "Sub-second trade execution via async processing with parallel order placement.",
  },
  {
    icon: BarChart3,
    title: "Performance Stats",
    description:
      "Comprehensive analytics with PnL tracking, win rates, trade history, and portfolio charts.",
  },
  {
    icon: DollarSign,
    title: "Commission System",
    description:
      "Transparent platform commission on copied trades. Master traders earn from their follower base.",
  },
  {
    icon: Lock,
    title: "Secure Wallets",
    description:
      "AES-256 encrypted wallet storage. Private keys are never stored in plain text.",
  },
  {
    icon: Cpu,
    title: "Async Processing",
    description:
      "Queue-based worker system handles concurrent execution with retry logic and error handling.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 + i * 0.06,
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
        className="relative h-full rounded-xl border border-white/[0.06] p-6 transition-all duration-300 hover:border-white/[0.12] hover:-translate-y-0.5"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
        }}
      >
        {/* Hover glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(600px circle at 50% 0%, rgba(56,189,248,0.04), transparent 60%)",
          }}
        />

        <div className="relative">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.06]"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <Icon className="h-5 w-5 text-white/70" strokeWidth={1.5} />
          </div>

          <h3 className="mb-2 text-[15px] font-semibold text-white leading-snug">
            {feature.title}
          </h3>

          <p className="text-sm leading-relaxed text-white/50">
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function FeaturesSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-80px" });

  return (
    <section
      id="features"
      className="relative py-24 lg:py-32"
      style={{ background: "#0A0D14" }}
    >
      <div className="mx-auto max-w-[1100px] px-6">
        {/* Section Header */}
        <div ref={headerRef} className="mb-16 text-center lg:mb-20">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.2em] text-white/40"
          >
            Platform Features
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{
              delay: 0.08,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mb-4 text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight text-white"
          >
            Built for Serious Traders
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{
              delay: 0.16,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mx-auto max-w-[480px] text-base leading-relaxed text-white/50"
          >
            Production-grade infrastructure for automated copy trading.
            Every feature engineered for scale, speed, and security.
          </motion.p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
