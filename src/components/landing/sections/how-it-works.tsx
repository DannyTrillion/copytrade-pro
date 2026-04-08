"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { Link2, UserCheck, Sliders, Zap } from "lucide-react";
import Image from "next/image";

const ease = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  {
    id: "connect",
    icon: Link2,
    label: "Connect",
    title: "Connect Your Webull Account",
    description: "Link your Webull account securely via API. Full end-to-end encryption with granular permission controls. Setup takes under 60 seconds.",
    image: "/screenshots/dashboard-deposit.png",
  },
  {
    id: "choose",
    icon: UserCheck,
    label: "Choose",
    title: "Choose a Top Trader",
    description: "Browse verified traders ranked by ROI, win rate, and consistency. View their full track record, strategy style, and follower count before committing.",
    image: "/screenshots/dashboard-copytrading.png",
  },
  {
    id: "configure",
    icon: Sliders,
    label: "Configure",
    title: "Set Your Risk Parameters",
    description: "Configure allocation percentage, daily loss limits, and position sizing. Full control over how much capital is deployed and when to stop.",
    image: "/screenshots/dashboard-copy-request-light.png",
    isModal: true,
  },
  {
    id: "copy",
    icon: Zap,
    label: "Copy",
    title: "Start Auto Copy Trading",
    description: "Every trade is mirrored to your Webull account in under 200ms. Monitor performance in real time from your dashboard. Fully automated, 24/7.",
    image: "/screenshots/dashboard-dark.png",
  },
];

export function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [activeStep, setActiveStep] = useState(0);

  const step = STEPS[activeStep];

  return (
    <section className="relative py-24 lg:py-32" style={{ background: "#06060a" }} ref={ref} id="how-it-works">
      <div className="max-w-[1100px] mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease }}
          className="text-center mb-14"
        >
          <span className="inline-block text-xs font-medium text-[#0D71FF] uppercase tracking-[0.2em] mb-4">How It Works</span>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white leading-tight mb-4">
            Start in <span className="italic text-white/40">4 simple steps</span>
          </h2>
          <p className="text-base text-white/30 max-w-[480px] mx-auto leading-relaxed">
            A streamlined experience so you can go from signup to automated copy trading in under 2 minutes.
          </p>
        </motion.div>

        {/* Tab icons row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.15, duration: 0.5, ease }}
          className="flex items-center justify-center gap-3 md:gap-4 mb-10"
        >
          {STEPS.map((s, i) => {
            const isActive = activeStep === i;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStep(i)}
                className="group flex flex-col items-center gap-2 outline-none"
              >
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? "bg-[#0D71FF]/12 border-[#0D71FF]/25 shadow-[0_0_20px_rgba(13,113,255,0.1)]"
                      : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]"
                  } border`}
                >
                  <Icon className={`w-5 h-5 md:w-6 md:h-6 transition-colors duration-300 ${isActive ? "text-[#0D71FF]" : "text-white/25 group-hover:text-white/40"}`} />
                  {/* Step number badge */}
                  <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center transition-all duration-300 ${
                    isActive ? "bg-[#0D71FF] text-white" : "bg-white/[0.06] text-white/25"
                  }`}>
                    {i + 1}
                  </span>
                </motion.div>
                <span className={`text-[11px] font-medium transition-colors duration-300 ${isActive ? "text-white/70" : "text-white/20"}`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Preview panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.25, duration: 0.6, ease }}
          className="rounded-2xl border border-white/[0.05] overflow-hidden"
          style={{ background: "rgba(255,255,255,0.01)" }}
        >
          {/* Top bar with step info */}
          <div className="border-b border-white/[0.04] px-6 md:px-8 py-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25, ease }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-semibold text-[#0D71FF] uppercase tracking-wider">Step {activeStep + 1}</span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[10px] text-white/20">{step.label}</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-white mb-1.5">{step.title}</h3>
                  <p className="text-sm text-white/30 leading-relaxed max-w-[500px]">{step.description}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Step progress dots */}
            <div className="flex items-center gap-1.5 shrink-0">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeStep ? "w-6 bg-[#0D71FF]" : i < activeStep ? "w-3 bg-[#0D71FF]/30" : "w-1.5 bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Image preview area */}
          <div className="relative overflow-hidden" style={{ minHeight: 400 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -8 }}
                transition={{ duration: 0.35, ease }}
                className={`p-4 md:p-6 ${step.isModal ? "flex items-center justify-center" : ""}`}
              >
                <div className={`rounded-xl overflow-hidden border border-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.3)] ${step.isModal ? "max-w-[380px]" : ""}`}>
                  <Image
                    src={step.image}
                    alt={step.title}
                    width={step.isModal ? 459 : 1646}
                    height={step.isModal ? 534 : 1000}
                    className="w-full h-auto"
                    quality={85}
                    loading="lazy"
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
