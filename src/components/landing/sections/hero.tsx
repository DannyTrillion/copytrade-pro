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

/** Design-system color tokens for SVG attributes that can't use Tailwind classes */
const COLORS = {
  brand: "#2962FF",
  success: "#26A69A",
  danger: "#EF5350",
} as const;

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  return (
    <section className="relative h-screen min-h-[700px] flex flex-col overflow-hidden bg-surface-0">

      {/* ===== BACKGROUND — TradingView actual assets ===== */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-space.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[30%_80%] md:object-bottom"
          quality={90}
        />
        {/* Top fade — subtle on mobile to keep astronaut area bright */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#131722]/60 via-[#131722]/20 to-transparent md:from-[#131722]/10 md:via-transparent" />
        {/* Bottom subtle vignette — lighter on mobile */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#131722]/30 via-transparent to-transparent md:hidden" />
      </div>
      <div className="absolute inset-0 z-[1] pointer-events-none opacity-25">
        <Image src="/hero-aurora.webp" alt="" fill sizes="100vw" className="object-cover object-center mix-blend-screen" quality={90} />
      </div>

      {/* ===== CENTERED CONTENT — on top of everything ===== */}
      <div className="relative z-[5] flex-1 flex flex-col items-center justify-start pt-[18vh] md:justify-center md:pt-0 px-6">
        <div className="text-center max-w-[800px] mx-auto">

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease }}
            className="text-[clamp(2.2rem,7vw,5.5rem)] font-bold leading-[1.04] tracking-[-0.03em] mb-4 md:mb-5"
          >
            <span className="text-white">Copy first </span>
            <span className="text-white/60 italic font-light">/</span>
            <span className="text-white"> Then earn.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease }}
            className="text-[clamp(0.9rem,2vw,1.25rem)] text-white/50 max-w-[520px] mx-auto mb-6 md:mb-8 leading-relaxed"
          >
            The best trades require research, then commitment. Follow verified traders on Polymarket.
          </motion.p>

          {/* CTA buttons — centered */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease }}
            className="flex flex-wrap justify-center items-center gap-4 mb-4"
          >
            <Link
              href="/signup"
              className="px-8 py-3.5 bg-white text-text-primary font-semibold text-sm rounded-full hover:bg-white/90 transition-all duration-200 hover:translate-y-[-1px] shadow-lg shadow-white/10 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              Get started for free
            </Link>
            <Link
              href="#how-it-works"
              className="px-6 py-3.5 text-white/60 font-medium text-sm rounded-full border border-white/[0.12] hover:bg-white/[0.06] hover:text-white/80 transition-all duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              How it works
            </Link>
          </motion.div>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-white/30"
          >
            $0 forever, no credit card needed
          </motion.p>
        </div>
      </div>

      {/* ===== CEO INFO BLOCK — bottom right, TradingView style ===== */}
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
          {/* Avatar with glowing ring */}
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-[3px] rounded-full opacity-50 bg-gradient-to-br from-brand via-success to-accent" />
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-surface-0">
              <Image
                src="/ceo-avatar.webp"
                alt="CEO"
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
            {/* Online indicator */}
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-surface-0" />
          </div>
          {/* Info */}
          <div>
            <p className="text-sm font-semibold text-white leading-tight">John Doe</p>
            <p className="text-2xs text-white/40 leading-tight mt-0.5">CEO & Co-founder</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-success/10 border border-success/15">
                <TrendingUp className="w-2.5 h-2.5 text-success" />
                <span className="text-2xs font-semibold text-success">
                  +<AnimatedValue target={847} duration={2} delay={1.8} />% ROI
                </span>
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand/10 border border-brand/15">
                <Users className="w-2.5 h-2.5 text-brand" />
                <span className="text-2xs font-semibold text-brand">
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
