"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { BarChart3, ArrowRight, Webhook, Send } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

export function IntegrationSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const steps = [
    {
      icon: BarChart3,
      platform: "TradingView",
      label: "Signal Source",
      desc: "Master trader creates alert on TradingView chart with custom webhook payload.",
    },
    {
      icon: Webhook,
      platform: "CopyTrade Pro",
      label: "Copy Engine",
      desc: "Webhook receives signal, validates auth, and calculates positions per follower.",
    },
    {
      icon: Send,
      platform: "Polymarket",
      label: "Execution",
      desc: "Trades executed on Polymarket for all followers with retry logic.",
    },
  ];

  return (
    <section className="relative py-24 lg:py-32" style={{ background: "#080A12" }} ref={ref}>
      <div className="max-w-[1100px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-medium text-white/40 uppercase tracking-[0.2em] mb-4">Integration</span>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white leading-tight mb-4">
            Three Platforms. One Flow.
          </h2>
          <p className="text-base text-white/50 max-w-[520px] mx-auto leading-relaxed">
            Seamless integration between TradingView signals, our copy engine, and Polymarket execution.
          </p>
        </motion.div>

        {/* Flow diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          <div className="hidden md:block absolute top-1/2 left-[33%] right-[33%] h-px bg-white/[0.06] -translate-y-1/2 z-0" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5, ease }}
              className="relative z-10"
            >
              <div className="border border-white/[0.06] rounded-xl p-7 hover:border-white/[0.1] transition-colors duration-200 h-full" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-[#2962FF]/10">
                  <step.icon className="w-5 h-5 text-[#2962FF]" />
                </div>

                <span className="text-[11px] font-medium uppercase tracking-widest text-white/40">{step.label}</span>
                <h3 className="text-lg font-semibold text-white mt-1 mb-2.5">{step.platform}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{step.desc}</p>

                {i < 2 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full border border-white/[0.08] items-center justify-center" style={{ background: "#080A12" }}>
                    <ArrowRight className="w-3 h-3 text-white/30" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Detail flow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.5, ease }}
          className="mt-10 border border-white/[0.06] rounded-xl p-7 lg:p-8"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Trader Sends Signal", desc: "Alert fires from TradingView with action, symbol, and price" },
              { step: "02", title: "Webhook Receives", desc: "Our API validates, authenticates, and deduplicates the signal" },
              { step: "03", title: "Engine Processes", desc: "Calculates position size per follower based on risk settings" },
              { step: "04", title: "Trades Execute", desc: "Parallel execution on Polymarket with retry and error handling" },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <span className="text-3xl font-black text-white/[0.04] leading-none flex-shrink-0">{item.step}</span>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1.5">{item.title}</h4>
                  <p className="text-xs text-white/45 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
