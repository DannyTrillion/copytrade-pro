"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Lock, ShieldCheck, KeyRound, Fingerprint, Server, Eye } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

export function SecuritySection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const features = [
    { icon: Lock, title: "AES-256 Encryption", desc: "All wallet data encrypted at rest with military-grade AES-256 encryption." },
    { icon: ShieldCheck, title: "Webhook Validation", desc: "Every TradingView webhook is validated against your secret key before processing." },
    { icon: KeyRound, title: "Role-Based Access", desc: "Three-tier permission system — Admin, Master Trader, Follower." },
    { icon: Fingerprint, title: "JWT Sessions", desc: "Secure JSON Web Token authentication with 24-hour expiry." },
    { icon: Server, title: "Rate Limiting", desc: "API endpoints protected with intelligent rate limiting to prevent abuse." },
    { icon: Eye, title: "Input Validation", desc: "Zod schema validation on every API endpoint. All inputs sanitized." },
  ];

  return (
    <section id="security" className="relative py-24 lg:py-32" style={{ background: "#080A12" }} ref={ref}>
      <div className="max-w-[1100px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease }}
          className="text-center mb-16"
        >
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#2962FF]/10 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-[#2962FF]" />
            </div>
          </div>
          <span className="inline-block text-xs font-medium text-white/40 uppercase tracking-[0.2em] mb-4">Security</span>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white leading-tight mb-4">
            Bank-Grade Security
          </h2>
          <p className="text-base text-white/50 max-w-[480px] mx-auto leading-relaxed">
            Your assets and data are protected at every layer of the stack.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.05, duration: 0.4, ease }}
            >
              <div className="border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.1] transition-colors duration-200 h-full" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-[#2962FF]/8">
                  <feature.icon className="w-4.5 h-4.5 text-[#2962FF]" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-xs text-white/45 leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
