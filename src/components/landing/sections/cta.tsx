"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, TrendingUp, Zap } from "lucide-react";

export function CtaSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative py-24 lg:py-32 bg-[#F8F9FD]" ref={ref}>
      <div className="max-w-[1100px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand via-brand-dark to-brand-800" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(38,166,154,0.25),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(120,80,220,0.2),transparent_60%)]" />

          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.07]">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="ctaGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#ctaGrid)" />
            </svg>
          </div>

          {/* Content */}
          <div className="relative px-8 py-20 md:px-20 md:py-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 mb-8"
            >
              <Zap className="w-3.5 h-3.5 text-white" />
              <span className="text-[13px] font-medium text-white/90">Start trading in under 2 minutes</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-[clamp(2rem,5vw,3.5rem)] font-bold text-white mb-5 leading-tight"
            >
              Ready to Trade
              <br />
              Like the Best?
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.4 }}
              className="text-[17px] text-white/60 max-w-[520px] mx-auto mb-10 leading-relaxed"
            >
              Join thousands of traders already using CopyTrade Pro. Follow top performers or share your own signals.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-4 justify-center"
            >
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-[#0A2866] font-semibold text-[15px] rounded-[20px] hover:bg-white/90 transition-all duration-200 shadow-[0_8px_32px_rgba(0,0,0,0.2),0_2px_8px_rgba(0,0,0,0.1)]"
              >
                Start Copy Trading Now
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/signup?role=trader"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold text-[15px] rounded-[20px] border border-white/15 hover:bg-white/20 transition-all duration-200"
              >
                <TrendingUp className="w-4 h-4" />
                Become a Master Trader
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
