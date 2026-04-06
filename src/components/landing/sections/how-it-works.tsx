"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Wallet, UserCheck, Sliders, Zap } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

export function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const steps = [
    { icon: Wallet, title: "Connect Wallet", desc: "Link your Polymarket wallet securely. Keys are encrypted and never stored in plain text." },
    { icon: UserCheck, title: "Choose Trader", desc: "Browse verified master traders with transparent performance stats and track records." },
    { icon: Sliders, title: "Set Risk %", desc: "Configure your risk per trade, maximum trade size, and daily loss limits." },
    { icon: Zap, title: "Auto Copy", desc: "Trades execute automatically when your chosen trader sends a signal. Zero delay." },
  ];

  return (
    <section id="how-it-works" className="relative py-24 lg:py-32" style={{ background: "#080A12" }} ref={ref}>
      <div className="max-w-[1100px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-medium text-white/40 uppercase tracking-[0.2em] mb-4">How It Works</span>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white leading-tight mb-4">
            Four Steps to Automated Trading
          </h2>
          <p className="text-base text-white/50 max-w-[480px] mx-auto leading-relaxed">
            From wallet connection to automatic trade execution in under two minutes.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.4, ease }}
              className="relative"
            >
              <div className="border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.1] transition-colors duration-200 h-full" style={{ background: "rgba(255,255,255,0.02)" }}>
                {/* Step number */}
                <span className="text-[11px] font-medium text-[#2962FF] mb-4 block">{`0${i + 1}`}</span>

                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-[#2962FF]/10">
                  <step.icon className="w-4.5 h-4.5 text-[#2962FF]" />
                </div>

                <h3 className="text-[15px] font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{step.desc}</p>

                {/* Connector */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-px bg-white/[0.08]" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
