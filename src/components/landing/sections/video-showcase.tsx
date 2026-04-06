"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

export function VideoShowcaseSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="video-showcase"
      ref={ref}
      className="relative py-24 lg:py-32 overflow-hidden"
      style={{ background: "#080A12" }}
    >
      <div className="relative max-w-[1000px] mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease }}
          className="text-center mb-12"
        >
          <span className="inline-block text-xs font-medium text-white/40 uppercase tracking-[0.2em] mb-4">
            See it in action
          </span>
          <h2 className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold text-white leading-tight mb-4">
            Your Dashboard, Real-Time
          </h2>
          <p className="text-base text-white/50 max-w-[460px] mx-auto leading-relaxed">
            Watch how CopyTrade Pro executes trades in real-time, mirroring top performers automatically.
          </p>
        </motion.div>

        {/* Video container */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease }}
          className="relative"
        >
          <div
            className="relative rounded-xl overflow-hidden border border-white/[0.06]"
            style={{ background: "#080A12" }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.03] rounded-md max-w-[280px] w-full justify-center">
                  <span className="text-[11px] text-white/25 font-mono">copytrade.pro/dashboard</span>
                </div>
              </div>
              <div className="w-[40px]" />
            </div>

            {/* Video */}
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto block"
              src="/platform-demo.mp4"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
