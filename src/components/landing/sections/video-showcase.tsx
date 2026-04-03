"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Black cinematic video section — seamless between hero & light      */
/* ------------------------------------------------------------------ */

export function VideoShowcaseSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="video-showcase"
      ref={ref}
      className="relative py-28 lg:py-40 overflow-hidden"
      style={{ background: "#0A0D14" }}
    >
      {/* Seamless top fade from hero into this section */}
      <div
        className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
        style={{ background: "linear-gradient(180deg, #131722 0%, #0A0D14 100%)" }}
      />

      {/* Aurora continuation from hero */}
      <div className="absolute inset-0 pointer-events-none opacity-15">
        <Image
          src="/hero-aurora.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-top mix-blend-screen"
          quality={90}
        />
      </div>

      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] opacity-25"
          style={{ background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(41,98,255,0.1), transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-[1100px] mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <span className="inline-block text-[12px] font-semibold text-[#2962FF] uppercase tracking-[0.1em] mb-3">
            See it in action
          </span>
          <h2 className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold text-white leading-tight mb-4">
            Your Dashboard, Real-Time
          </h2>
          <p className="text-[16px] text-white/40 max-w-[500px] mx-auto leading-relaxed">
            Watch how CopyTrade Pro executes trades in real-time, mirroring top performers automatically.
          </p>
        </motion.div>

        {/* Video container */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-[1000px] mx-auto"
        >
          {/* Cinematic outer glow */}
          <div
            className="absolute -inset-12 blur-[80px] opacity-30"
            style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(41,98,255,0.15), rgba(100,60,220,0.06) 50%, transparent 75%)" }}
          />

          {/* Video frame */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "#0A0D14",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 40px 120px rgba(0,0,0,0.8), 0 16px 48px rgba(0,0,0,0.5)",
            }}
          >
            {/* Browser chrome */}
            <div
              className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.04]"
              style={{ background: "#0D1017" }}
            >
              <div className="flex gap-[7px]">
                <div className="w-[11px] h-[11px] rounded-full bg-[#FF5F57]" />
                <div className="w-[11px] h-[11px] rounded-full bg-[#FEBC2E]" />
                <div className="w-[11px] h-[11px] rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 px-4 py-[4px] bg-white/[0.04] rounded-lg max-w-[300px] w-full justify-center">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-20">
                    <circle cx="5" cy="5" r="4" stroke="white" strokeWidth="0.8" />
                  </svg>
                  <span className="text-[11px] text-white/20 font-mono">copytrade.pro/dashboard</span>
                </div>
              </div>
              <div className="w-[56px]" />
            </div>

            {/* Video */}
            <div style={{ background: "#0A0D14" }}>
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto block"
                src="/platform-demo.mp4"
              />
            </div>
          </div>

          {/* Bottom reflection glow */}
          <div
            className="absolute -bottom-16 left-[10%] right-[10%] h-32 blur-[60px] opacity-25"
            style={{ background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(41,98,255,0.15), transparent 70%)" }}
          />
        </motion.div>
      </div>

      {/* Bottom fade into white light sections */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(180deg, transparent 0%, #0A0D14 100%)" }}
      />
    </section>
  );
}
