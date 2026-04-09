"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

export function CtaSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section className="relative py-24 lg:py-32" style={{ background: "#06060a" }} ref={ref}>
      <div className="max-w-[900px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.7, ease }}
          style={{ willChange: "transform, opacity" }}
          className="relative rounded-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-[#0D71FF]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.25),transparent_60%)]" />

          <div className="relative px-8 py-16 md:px-16 md:py-20 text-center">
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-white mb-4 leading-tight">
              Ready to Trade
              <br />
              Like the Best?
            </h2>
            <p className="text-base text-white/70 max-w-[460px] mx-auto mb-8 leading-relaxed">
              Connect your Webull account and start copying top-performing traders today. No experience required.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/signup"
                className="group inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#0D71FF] font-semibold text-sm rounded-full hover:bg-white/90 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] transition-all duration-200">
                Start Copy Trading
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="#how-it-works"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/15 text-white font-semibold text-sm rounded-full border border-white/20 hover:bg-white/25 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200">
                See How It Works
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-8 mt-10 pt-8 border-t border-white/15">
              {[
                { value: "2,847+", label: "Trades Copied" },
                { value: "100+", label: "Verified Traders" },
                { value: "99.9%", label: "Uptime" },
                { value: "$284K+", label: "Volume" },
              ].map((stat) => (
                <div key={stat.label} className="text-center min-w-[70px]">
                  <p className="text-lg font-bold text-white leading-none mb-1">{stat.value}</p>
                  <p className="text-xs text-white/60 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
