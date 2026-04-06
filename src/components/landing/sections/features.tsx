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

const ease = [0.22, 1, 0.36, 1] as const;

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Copy,
    title: "Auto Copy Trading",
    description: "Replicate trades from top traders the instant a signal arrives. Zero manual intervention required.",
  },
  {
    icon: Shield,
    title: "Risk Control",
    description: "Set risk per trade, max position sizes, and daily loss limits. Your rules are enforced every time.",
  },
  {
    icon: Users,
    title: "Multiple Traders",
    description: "Follow multiple master traders simultaneously with independent risk settings for each.",
  },
  {
    icon: Zap,
    title: "Real-Time Execution",
    description: "Sub-second trade execution via async processing with parallel order placement.",
  },
  {
    icon: BarChart3,
    title: "Performance Stats",
    description: "Comprehensive analytics with PnL tracking, win rates, trade history, and portfolio charts.",
  },
  {
    icon: DollarSign,
    title: "Commission System",
    description: "Transparent platform commission on copied trades. Master traders earn from their follower base.",
  },
  {
    icon: Lock,
    title: "Secure Wallets",
    description: "AES-256 encrypted wallet storage. Private keys are never stored in plain text.",
  },
  {
    icon: Cpu,
    title: "Async Processing",
    description: "Queue-based worker system handles concurrent execution with retry logic and error handling.",
  },
];

export function FeaturesSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-80px" });

  return (
    <section
      id="features"
      className="relative py-24 lg:py-32"
      style={{ background: "#080A12" }}
    >
      <div className="mx-auto max-w-[1100px] px-6">
        {/* Section Header */}
        <div ref={headerRef} className="mb-14 text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease }}
            className="mb-4 inline-block text-xs font-medium uppercase tracking-[0.2em] text-white/40"
          >
            Platform Features
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.06, duration: 0.5, ease }}
            className="mb-4 text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight text-white"
          >
            Built for Serious Traders
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.12, duration: 0.5, ease }}
            className="mx-auto max-w-[480px] text-base leading-relaxed text-white/50"
          >
            Production-grade infrastructure for automated copy trading.
            Every feature engineered for scale, speed, and security.
          </motion.p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.04, duration: 0.4, ease }}
              >
                <div className="relative h-full rounded-xl border border-white/[0.06] p-6 hover:border-white/[0.1] transition-colors duration-200" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#2962FF]/10">
                    <Icon className="h-4.5 w-4.5 text-[#2962FF]" strokeWidth={1.5} />
                  </div>

                  <h3 className="mb-2 text-[15px] font-semibold text-white leading-snug">
                    {feature.title}
                  </h3>

                  <p className="text-sm leading-relaxed text-white/45">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
