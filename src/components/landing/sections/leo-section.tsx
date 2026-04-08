"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Quote } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

export function LeoSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden" style={{ background: "#05050a" }} ref={ref}>
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-[30%] -translate-y-1/2 w-[600px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(13,113,255,0.04),transparent_60%)]" />
      <div className="absolute bottom-0 right-[10%] w-[400px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.03),transparent_60%)]" />

      <div className="relative max-w-[1100px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

          {/* Left — Leo image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease }}
            className="lg:col-span-5 flex justify-center lg:justify-start"
          >
            <div className="relative">
              {/* Glow behind portrait */}
              <div className="absolute -inset-8 bg-[#0D71FF]/[0.04] blur-[60px] rounded-full -z-10" />

              {/* Portrait container */}
              <div className="relative w-[280px] md:w-[320px] aspect-[3/4] rounded-3xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
                <img
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=640&h=854&fit=crop&crop=face"
                  alt="Leo — Product Lead"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Gradient overlay at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#05050a]/80 via-transparent to-transparent" />

                {/* Name badge */}
                <div className="absolute bottom-5 left-5 right-5">
                  <p className="text-white font-semibold text-sm">Leo Ashford</p>
                  <p className="text-white/40 text-xs mt-0.5">Product Lead, CopyTrade Pro</p>
                </div>
              </div>

              {/* Decorative ring */}
              <div className="absolute -top-3 -right-3 w-[100px] h-[100px] rounded-full border border-[#0D71FF]/10" />
              <div className="absolute -bottom-4 -left-4 w-[60px] h-[60px] rounded-full border border-white/[0.04]" />
            </div>
          </motion.div>

          {/* Right — Narrative */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15, duration: 0.7, ease }}
            >
              {/* Label */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-px bg-[#0D71FF]/40" />
                <span className="text-[11px] font-medium text-[#0D71FF] uppercase tracking-[0.2em]">Why Copy Trading</span>
              </div>

              {/* Headline */}
              <h2 className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold text-white leading-[1.15] tracking-tight mb-6">
                Markets don&apos;t wait.
                <br />
                <span className="text-white/25">Your strategy shouldn&apos;t either.</span>
              </h2>
            </motion.div>

            {/* Quote block */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.6, ease }}
              className="relative mb-8"
            >
              <Quote className="w-8 h-8 text-[#0D71FF]/10 mb-3" />
              <p className="text-[15px] text-white/45 leading-[1.8] max-w-[520px]">
                For years, successful trading was reserved for those with decades of experience, expensive tools, and hours of daily screen time. We built CopyTrade Pro to change that.
              </p>
              <p className="text-[15px] text-white/45 leading-[1.8] max-w-[520px] mt-4">
                By connecting directly to Webull&apos;s infrastructure, we enable anyone — regardless of experience — to mirror the exact strategies of verified, top-performing traders. Every signal, every entry, every exit — executed automatically in under 200 milliseconds.
              </p>
              <p className="text-[15px] text-white/55 leading-[1.8] max-w-[520px] mt-4 font-medium">
                This isn&apos;t about replacing skill. It&apos;s about making expertise accessible. The best traders share their edge, and you benefit — in real time.
              </p>
            </motion.div>

            {/* Signature */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/[0.06]">
                <img
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&crop=face"
                  alt="Leo"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Leo Ashford</p>
                <p className="text-xs text-white/25">Product Lead & Co-founder</p>
              </div>
              <div className="w-px h-8 bg-white/[0.06] ml-2" />
              <div className="flex items-center gap-3">
                {[
                  { value: "8+", label: "Years in trading" },
                  { value: "50K+", label: "Users served" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-sm font-bold text-white tabular-nums">{s.value}</p>
                    <p className="text-[9px] text-white/20">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
