"use client";

import Link from "next/link";
import { motion, useInView, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { ArrowRight, BarChart3, Shield, Zap, Play, CheckCircle2, Star, TrendingUp, Users, Copy } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

/* ─── Animated counter ─── */
function Counter({ target, suffix = "", prefix = "", delay = 0 }: { target: number; suffix?: string; prefix?: string; delay?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => {
      const dur = 1500; const startTime = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - startTime) / dur, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      tick();
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [inView, target, delay]);
  return <span ref={ref} className="tabular-nums">{prefix}{val.toLocaleString()}{suffix}</span>;
}

/* ─── Rotating text ─── */
const ROTATING_WORDS = ["Automate Returns", "Copy Top Traders", "Grow Your Portfolio", "Trade Hands-Free"];
function RotatingText() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((p) => (p + 1) % ROTATING_WORDS.length), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-block h-[1.1em] overflow-hidden align-bottom">
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.5, ease }}
          className="block bg-gradient-to-r from-[#0D71FF] via-[#5B8DEF] to-[#6366F1] bg-clip-text text-transparent"
        >
          {ROTATING_WORDS[idx]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ─── Live activity feed ─── */
const ACTIVITIES = [
  { user: "Marcus C.", action: "copied BTC Long", profit: "+$342", time: "2s ago" },
  { user: "Sarah W.", action: "copied ETH Short", profit: "+$128", time: "8s ago" },
  { user: "Elena P.", action: "copied SOL Long", profit: "+$89", time: "15s ago" },
  { user: "James P.", action: "copied AVAX Long", profit: "+$215", time: "22s ago" },
];

function LiveFeed() {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setVisible((p) => (p + 1) % ACTIVITIES.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative h-10 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={visible}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.3, ease }}
          className="absolute inset-0 flex items-center gap-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#26A69A] animate-pulse" />
          <span className="text-[11px] text-white/40">
            <span className="text-white/60 font-medium">{ACTIVITIES[visible].user}</span>{" "}
            {ACTIVITIES[visible].action}{" "}
            <span className="text-[#26A69A] font-semibold">{ACTIVITIES[visible].profit}</span>{" "}
            <span className="text-white/20">{ACTIVITIES[visible].time}</span>
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function HeroSection() {
  const ref = useRef(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [0, 1], [3, -3]);
  const rotateY = useTransform(mouseX, [0, 1], [-3, 3]);
  const imgScale = useTransform(mouseY, [0, 1], [1.01, 0.99]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      mouseX.set((e.clientX - r.left) / r.width);
      mouseY.set((e.clientY - r.top) / r.height);
    };
    el.addEventListener("mousemove", handler);
    return () => el.removeEventListener("mousemove", handler);
  }, [mouseX, mouseY]);

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: "#04040a" }}>

      {/* Background video */}
      <div className="absolute inset-0 z-0">
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-[0.18]" poster="/hero-space.webp">
          <source src="/platform-demo.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#04040a]/70 via-[#04040a]/30 to-[#04040a]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#04040a]/50 via-transparent to-[#04040a]/30" />
      </div>

      {/* Grid */}
      <div className="absolute inset-0 z-[1] opacity-[0.015]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />

      {/* Animated orbs */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.08, 0.05] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-15%] left-[10%] w-[700px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(13,113,255,0.14),transparent_55%)]" />
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.06, 0.03] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute bottom-[-15%] right-[0%] w-[600px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.1),transparent_55%)]" />
      </div>

      {/* Content */}
      <div ref={containerRef} className="relative z-10 flex-1 flex items-center px-6 pt-24 pb-16">
        <div className="max-w-[1200px] mx-auto w-full">

          {/* Top: centered headline block */}
          <div className="text-center max-w-[720px] mx-auto mb-14 lg:mb-16">
            {/* Badge row */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, ease }}
              className="flex items-center justify-center gap-3 mb-7">
              <Image src="/webull-logo.svg" alt="Webull" width={80} height={16} className="h-3.5 w-auto brightness-0 invert opacity-40" />
              <div className="w-px h-3.5 bg-white/8" />
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0D71FF]/[0.06] border border-[#0D71FF]/12">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0D71FF] animate-pulse" />
                <span className="text-[9px] font-medium text-[#0D71FF]/70 uppercase tracking-wider">Live Trading</span>
              </div>
            </motion.div>

            {/* Headline with rotating text */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1, duration: 0.8, ease }}
              className="text-[clamp(2.4rem,6vw,4rem)] font-bold leading-[1.05] tracking-[-0.035em] mb-5"
            >
              <span className="text-white">The Smartest Way to</span>
              <br />
              <RotatingText />
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.6, ease }}
              className="text-[16px] text-white/30 max-w-[480px] mx-auto leading-[1.7] mb-8"
            >
              Connect your Webull account, follow verified elite traders, and automatically mirror every trade — completely hands-free.
            </motion.p>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3, duration: 0.5, ease }}
              className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <Link href="/signup"
                className="group inline-flex items-center gap-2.5 px-8 py-4 bg-[#0D71FF] text-white font-semibold text-sm rounded-full hover:bg-[#0B63E0] transition-all duration-300 hover:shadow-[0_4px_28px_rgba(13,113,255,0.4),0_0_80px_rgba(13,113,255,0.08)] active:scale-[0.97]">
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link href="#features"
                className="inline-flex items-center gap-2 px-6 py-4 text-white/35 font-medium text-sm rounded-full border border-white/[0.06] hover:bg-white/[0.03] hover:text-white/55 hover:border-white/[0.1] transition-all duration-300">
                <Play className="w-3.5 h-3.5" />
                See How It Works
              </Link>
            </motion.div>

            {/* Live feed */}
            <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.5 }}
              className="flex justify-center">
              <LiveFeed />
            </motion.div>
          </div>

          {/* Bottom: Dashboard showcase */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ delay: 0.4, duration: 1, ease }}
            style={{ rotateX, rotateY, scale: imgScale, perspective: 1400 }}
            className="relative max-w-[1000px] mx-auto"
          >
            {/* Multi-layer glow */}
            <div className="absolute -inset-16 bg-[#0D71FF]/[0.04] blur-[100px] rounded-full -z-10" />
            <div className="absolute -inset-8 bg-[#6366F1]/[0.02] blur-[50px] rounded-full -z-10" />

            {/* Main screenshot */}
            <div className="rounded-2xl lg:rounded-3xl overflow-hidden border border-white/[0.06] shadow-[0_40px_100px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.03)]">
              <Image
                src="/screenshots/dashboard-dark.png"
                alt="CopyTrade Pro Dashboard"
                width={1646}
                height={1000}
                className="w-full h-auto"
                priority
                quality={90}
              />
            </div>

            {/* Floating card — Copy request */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 40, y: 20 }}
              animate={inView ? { opacity: 1, scale: 1, x: 0, y: 0 } : {}}
              transition={{ delay: 1.6, duration: 0.7, ease }}
              className="absolute -bottom-6 -left-4 md:-left-10 lg:-left-14 w-[180px] md:w-[220px] lg:w-[250px] rounded-xl lg:rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.7)]"
            >
              <Image src="/screenshots/dashboard-copy-request-dark.png" alt="Copy Request" width={459} height={534} className="w-full h-auto" quality={85} />
            </motion.div>

            {/* Floating card — Trade notification */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ delay: 1.9, duration: 0.5, ease }}
              className="absolute -top-4 -right-2 md:-right-6 lg:-right-10 px-4 py-3 rounded-xl border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
              style={{ background: "rgba(6,6,14,0.92)", backdropFilter: "blur(16px)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#26A69A]/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-[#26A69A]" />
                </div>
                <div>
                  <p className="text-[11px] text-white/60 font-medium">Trade Executed</p>
                  <p className="text-xs text-[#26A69A] font-semibold">BTC Long +$342.50</p>
                </div>
              </div>
            </motion.div>

            {/* Floating card — Copytrading peek */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 2.2, duration: 0.6, ease }}
              className="absolute bottom-[18%] -right-3 md:-right-6 lg:-right-10 w-[160px] md:w-[190px] lg:w-[210px] rounded-xl overflow-hidden border border-white/[0.06] shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
            >
              <Image src="/screenshots/dashboard-copytrading.png" alt="Copy Trading" width={2208} height={1000} className="w-full h-auto" quality={80} />
            </motion.div>
          </motion.div>

          {/* Stats bar below dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.8, duration: 0.5, ease }}
            className="flex items-center justify-center gap-8 md:gap-12 mt-10 lg:mt-14"
          >
            {[
              { icon: BarChart3, value: 2847, suffix: "+", label: "Trades Copied" },
              { icon: Users, value: 100, suffix: "+", label: "Verified Traders" },
              { icon: Shield, value: 99, suffix: ".9%", label: "Uptime" },
              { icon: Zap, value: 200, prefix: "<", suffix: "ms", label: "Execution" },
            ].map((s, i) => (
              <div key={s.label} className="text-center">
                <p className="text-lg md:text-xl font-bold text-white">
                  <Counter target={s.value} suffix={s.suffix} prefix={s.prefix || ""} delay={1 + i * 0.15} />
                </p>
                <p className="text-[10px] text-white/20 mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Trust strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 1.2 }}
            className="flex items-center justify-center gap-3 mt-6"
          >
            <div className="flex -space-x-2">
              {["M", "S", "E", "J", "D"].map((l, i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0D71FF] to-[#6366F1] flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#04040a]">{l}</div>
              ))}
            </div>
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map((s) => <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />)}
            </div>
            <span className="text-[11px] text-white/25">Trusted by 2,800+ traders worldwide</span>
          </motion.div>
        </div>
      </div>

      {/* Scroll */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <div className="w-5 h-8 rounded-full border border-white/8 flex justify-center pt-1.5">
            <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity }} className="w-1 h-2 rounded-full bg-white/20" />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
