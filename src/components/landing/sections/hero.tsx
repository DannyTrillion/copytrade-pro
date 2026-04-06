"use client";

import Link from "next/link";
import { motion, useInView, animate } from "framer-motion";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { ChevronDown, TrendingUp, Users } from "lucide-react";

function AnimatedValue({ target, prefix = "", suffix = "", decimals = 0, duration = 2, delay = 0.5 }: {
  target: number; prefix?: string; suffix?: string; decimals?: number; duration?: number; delay?: number;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const timeout = setTimeout(() => {
      const controls = animate(0, target, {
        duration,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (v) => setValue(decimals > 0 ? parseFloat(v.toFixed(decimals)) : Math.round(v)),
      });
      return () => controls.stop();
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [inView, target, duration, delay, decimals]);

  return (
    <span ref={ref}>
      {prefix}{value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  return (
    <section className="relative h-screen min-h-[700px] flex flex-col overflow-hidden" style={{ background: "#080A12" }}>

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-space.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[30%_80%] md:object-bottom"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080A12]/60 via-[#080A12]/20 to-transparent" />
      </div>

      {/* Centered content */}
      <div className="relative z-[5] flex-1 flex flex-col items-center justify-start pt-[18vh] md:justify-center md:pt-0 px-6">
        <div className="text-center max-w-[800px] mx-auto">

          {/* TradingView official logo */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="flex justify-center items-center gap-3 mb-8"
          >
            <svg width="36" height="28" viewBox="0 0 36 28" xmlns="http://www.w3.org/2000/svg" className="text-white" aria-hidden="true">
              <path d="M14 22H7V11H0V4h14v18zM28 22h-8l7.5-18h8L28 22z" fill="currentColor" />
              <circle cx="20" cy="8" r="4" fill="currentColor" />
            </svg>
            <span className="text-white text-[22px] font-bold tracking-tight">TradingView</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease }}
            className="text-[clamp(2.2rem,7vw,5.5rem)] font-bold leading-[1.04] tracking-[-0.03em] mb-4 md:mb-5"
          >
            <span className="text-white">Copy first </span>
            <span className="text-white/40 italic font-light">/</span>
            <span className="text-white"> Then earn.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="text-[clamp(0.9rem,2vw,1.25rem)] text-white/50 max-w-[520px] mx-auto mb-6 md:mb-8 leading-relaxed"
          >
            Follow verified traders on Polymarket. Their trades, your portfolio — automated.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease }}
            className="flex flex-wrap justify-center items-center gap-4 mb-4"
          >
            <Link
              href="/signup"
              className="px-8 py-3.5 bg-white text-[#080A12] font-semibold text-sm rounded-full hover:bg-white/90 transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.97]"
            >
              Get started for free
            </Link>
            <Link
              href="#how-it-works"
              className="px-6 py-3.5 text-white/60 font-medium text-sm rounded-full border border-white/[0.1] hover:bg-white/[0.05] hover:text-white/80 transition-all duration-200 active:scale-[0.97]"
            >
              How it works
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-xs text-white/30"
          >
            $0 forever, no credit card needed
          </motion.p>
        </div>
      </div>

      {/* CEO info block — bottom right */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.7, ease }}
        className="absolute bottom-14 left-4 right-4 sm:left-auto sm:right-6 md:right-12 z-[6]"
      >
        <div
          className="flex items-center gap-4 pl-2 pr-5 py-2 rounded-2xl border border-white/[0.1] backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.04)]"
          style={{ background: "rgba(20,22,32,0.65)" }}
        >
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-[3px] rounded-full opacity-50 bg-gradient-to-br from-[#2962FF] via-[#26A69A] to-[#26A69A]" />
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#080A12]">
              <Image
                src="/ceo-avatar.webp"
                alt="CEO"
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#26A69A] border-2 border-[#080A12]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">John Doe</p>
            <p className="text-2xs text-white/40 leading-tight mt-0.5">CEO & Co-founder</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#26A69A]/10 border border-[#26A69A]/15">
                <TrendingUp className="w-2.5 h-2.5 text-[#26A69A]" />
                <span className="text-2xs font-semibold text-[#26A69A]">
                  +<AnimatedValue target={847} duration={2} delay={1.8} />% ROI
                </span>
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#2962FF]/10 border border-[#2962FF]/15">
                <Users className="w-2.5 h-2.5 text-[#2962FF]" />
                <span className="text-2xs font-semibold text-[#2962FF]">
                  <AnimatedValue target={12} duration={1.5} delay={2} />K followers
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[6]"
      >
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <ChevronDown className="w-5 h-5 text-white/35" />
        </motion.div>
      </motion.div>
    </section>
  );
}
