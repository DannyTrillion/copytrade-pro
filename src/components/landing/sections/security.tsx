"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Lock, ShieldCheck, KeyRound, Fingerprint, Server, Eye } from "lucide-react";

export function SecuritySection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const features = [
    { icon: Lock, title: "AES-256 Encryption", desc: "All wallet data encrypted at rest with military-grade AES-256 encryption. Keys never stored in plain text.", color: "#EF5350", bgColor: "bg-danger/10" },
    { icon: ShieldCheck, title: "Webhook Validation", desc: "Every TradingView webhook is validated against your secret key before processing any signal.", color: "#2962FF", bgColor: "bg-brand-50" },
    { icon: KeyRound, title: "Role-Based Access", desc: "Three-tier permission system — Admin, Master Trader, Follower — with strict route protection.", color: "#26A69A", bgColor: "bg-success/10" },
    { icon: Fingerprint, title: "JWT Sessions", desc: "Secure JSON Web Token authentication with 24-hour expiry and server-side session validation.", color: "#FF9800", bgColor: "bg-warning/10" },
    { icon: Server, title: "Rate Limiting", desc: "API endpoints protected with intelligent rate limiting to prevent abuse and DDoS attacks.", color: "#AB47BC", bgColor: "bg-accent/10" },
    { icon: Eye, title: "Input Validation", desc: "Zod schema validation on every API endpoint. All inputs sanitized before database operations.", color: "#1452F0", bgColor: "bg-brand/10" },
  ];

  return (
    <section id="security" className="relative py-24 lg:py-32" style={{ background: "#0A0D14" }} ref={ref}>
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Security Shield Graphic */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center mb-10"
        >
          <div className="relative w-[140px] h-[140px] flex items-center justify-center">
            {/* Concentric animated rings */}
            {[100, 120, 140].map((size, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border"
                style={{
                  width: size,
                  height: size,
                  borderColor: `rgba(239, 83, 80, ${0.15 - i * 0.04})`,
                }}
                animate={{
                  scale: [1, 1.08, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeInOut",
                }}
              />
            ))}
            {/* Shield icon */}
            <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-danger to-warning flex items-center justify-center shadow-glow-danger">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16 lg:mb-20"
        >
          <span className="inline-block text-xs font-semibold text-danger uppercase tracking-widest mb-4">Security</span>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-white leading-tight mb-5">
            Bank-Grade{" "}
            <span className="bg-gradient-to-r from-danger to-warning bg-clip-text text-transparent">
              Security
            </span>
          </h2>
          <p className="text-base text-white/50 max-w-[560px] mx-auto leading-relaxed">
            Your assets and data are protected at every layer of the stack.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="border border-white/[0.06] rounded-xl p-7 hover:border-white/[0.12] transition-all duration-300 hover:shadow-[0_0_30px_rgba(41,98,255,0.08)] h-full" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${feature.bgColor}`}>
                  <feature.icon className="w-5 h-5" style={{ color: feature.color }} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
