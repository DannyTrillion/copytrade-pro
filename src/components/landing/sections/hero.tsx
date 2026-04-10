"use client";

import Link from "next/link";
import { motion, useInView, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { ArrowRight, BarChart3, Shield, Zap, Play, CheckCircle2, Star, TrendingUp, Users, Copy } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

/* ─── Star field — desktop only, disabled on mobile for performance ─── */
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    if (isMobile) return; // Skip on mobile
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const stars: { x: number; y: number; r: number; o: number; speed: number; twinkle: number; twinkleSpeed: number }[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    const init = () => {
      stars.length = 0;
      const count = Math.min(200, Math.floor((window.innerWidth * window.innerHeight) / 5000));
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: Math.random() * 1.2 + 0.2,
          o: Math.random() * 0.6 + 0.1,
          speed: Math.random() * 0.15 + 0.02,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.015 + 0.005,
        });
      }
    };

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        s.y -= s.speed;
        s.twinkle += s.twinkleSpeed;
        if (s.y < -2) { s.y = h + 2; s.x = Math.random() * w; }

        const alpha = s.o * (0.5 + 0.5 * Math.sin(s.twinkle));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 200, 255, ${alpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    resize();
    init();
    draw();

    window.addEventListener("resize", () => { resize(); init(); });
    return () => { cancelAnimationFrame(animId); };
  }, [isMobile]);

  if (isMobile) return null;
  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
}

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

      {/* Star field — desktop only */}
      <StarField />

      {/* Animated gradient mesh — desktop */}
      <div className="absolute inset-0 z-[1] pointer-events-none hidden md:block">
        <motion.div
          animate={{
            background: [
              "radial-gradient(ellipse at 20% 20%, rgba(13,113,255,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(99,102,241,0.08) 0%, transparent 50%)",
              "radial-gradient(ellipse at 40% 60%, rgba(13,113,255,0.08) 0%, transparent 50%), radial-gradient(ellipse at 60% 20%, rgba(99,102,241,0.12) 0%, transparent 50%)",
              "radial-gradient(ellipse at 20% 20%, rgba(13,113,255,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(99,102,241,0.08) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0"
        />
      </div>
      {/* Mobile: static gradient */}
      <div className="absolute inset-0 z-[1] pointer-events-none md:hidden">
        <div className="absolute top-0 left-0 w-full h-[50%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(13,113,255,0.06),transparent_60%)]" />
      </div>

      {/* Grid — desktop only */}
      <div className="absolute inset-0 z-[2] opacity-[0.012] hidden md:block" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />

      {/* Content */}
      <div ref={containerRef} className="relative z-10 flex-1 flex items-center px-5 md:px-6 pt-20 md:pt-24 pb-10 md:pb-16">
        <div className="max-w-[1200px] mx-auto w-full">

          {/* Top: centered headline block */}
          <div className="text-center max-w-[720px] mx-auto mb-14 lg:mb-16">
            {/* Badge row */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, ease }}
              className="flex items-center justify-center gap-3 mb-7">
              <Image src="/webull-logo.svg" alt="Webull" width={80} height={16} className="h-3.5 w-auto brightness-0 invert opacity-40" />
              <div className="w-px h-3.5 bg-white/8" />
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0D71FF]/[0.08]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0D71FF] animate-pulse" />
                <span className="text-[9px] font-medium text-[#0D71FF]/70 uppercase tracking-wider">Live Trading</span>
              </div>
            </motion.div>

            {/* Headline with rotating text + calligraphy underline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1, duration: 0.8, ease }}
              className="text-[clamp(2.6rem,7vw,5rem)] font-bold leading-[1.02] tracking-[-0.04em] mb-7"
            >
              <span className="bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent">The Smartest Way to</span>
              <br />
              <span className="relative inline-block">
                <RotatingText />
                {/* Premium calligraphy underline */}
                <svg
                  viewBox="0 0 320 20"
                  className="absolute -bottom-3 left-[-5%] w-[110%] h-5 overflow-visible"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="brushGrad" x1="0" y1="0" x2="320" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#0D71FF" stopOpacity="0" />
                      <stop offset="15%" stopColor="#0D71FF" stopOpacity="0.7" />
                      <stop offset="50%" stopColor="#5B8DEF" stopOpacity="0.9" />
                      <stop offset="85%" stopColor="#6366F1" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                    </linearGradient>
                    <filter id="brushGlow">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {/* Glow layer */}
                  <motion.path
                    d="M8 12 C25 6, 50 14, 80 9 C110 4, 140 13, 170 8 C200 3, 230 12, 260 7 C280 4, 300 9, 312 6"
                    stroke="url(#brushGrad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#brushGlow)"
                    opacity="0.3"
                    initial={{ pathLength: 0 }}
                    animate={inView ? { pathLength: 1 } : {}}
                    transition={{ delay: 0.9, duration: 1, ease }}
                  />
                  {/* Main stroke */}
                  <motion.path
                    d="M8 12 C25 6, 50 14, 80 9 C110 4, 140 13, 170 8 C200 3, 230 12, 260 7 C280 4, 300 9, 312 6"
                    stroke="url(#brushGrad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={inView ? { pathLength: 1 } : {}}
                    transition={{ delay: 0.9, duration: 1, ease }}
                  />
                  {/* Thin accent line — offset */}
                  <motion.path
                    d="M20 15 C50 10, 90 16, 130 11 C170 6, 210 14, 250 10 C275 7, 295 11, 308 9"
                    stroke="url(#brushGrad)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    opacity="0.4"
                    initial={{ pathLength: 0 }}
                    animate={inView ? { pathLength: 1 } : {}}
                    transition={{ delay: 1.1, duration: 0.8, ease }}
                  />
                </svg>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.6, ease }}
              className="text-[16px] text-white/35 max-w-[500px] mx-auto leading-[1.8] mb-8"
            >
              Connect your Webull account, follow verified elite traders, and automatically mirror every trade — completely hands-free.
            </motion.p>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3, duration: 0.5, ease }}
              className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <Link href="/signup"
                className="group inline-flex items-center gap-2.5 px-9 py-4 bg-[#0D71FF] text-white font-semibold text-[15px] rounded-full hover:bg-[#0B63E0] hover:-translate-y-1 transition-all duration-300 active:scale-[0.97]"
                style={{ boxShadow: "0 0 0 0 rgba(13,113,255,0), 0 1px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(13,113,255,0.15), 0 8px 32px rgba(13,113,255,0.1)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 4px rgba(13,113,255,0.1), 0 2px 4px rgba(0,0,0,0.2), 0 8px 24px rgba(13,113,255,0.3), 0 16px 48px rgba(13,113,255,0.15)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 0 rgba(13,113,255,0), 0 1px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(13,113,255,0.15), 0 8px 32px rgba(13,113,255,0.1)"; }}>
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link href="#features"
                className="inline-flex items-center gap-2 px-6 py-4 text-white/35 font-medium text-sm rounded-full border border-white/[0.06] hover:bg-white/[0.03] hover:text-white/55 hover:border-white/[0.1] hover:-translate-y-0.5 transition-all duration-300">
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

            {/* Main video showcase */}
            <div className="rounded-2xl lg:rounded-3xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster="/screenshots/dashboard-dark.png"
                className="w-full h-auto rounded-2xl lg:rounded-3xl"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {...({ "webkit-playsinline": "" } as any)}
              >
                <source src="/hero-video.mov" type="video/mp4" />
              </video>
            </div>

            {/* Floating card — Copy request (desktop only) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 40, y: 20 }}
              animate={inView ? { opacity: 1, scale: 1, x: 0, y: 0 } : {}}
              transition={{ delay: 1.6, duration: 0.7, ease }}
              className="hidden md:block absolute -bottom-6 -left-10 lg:-left-14 w-[220px] lg:w-[250px] rounded-xl lg:rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.7)]"
            >
              <Image src="/screenshots/dashboard-copy-request-dark.png" alt="Copy Request" width={459} height={534} className="w-full h-auto" quality={85} />
            </motion.div>

            {/* Floating card — Trade notification (desktop only) */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ delay: 1.9, duration: 0.5, ease }}
              className="hidden md:flex absolute -top-4 -right-6 lg:-right-10 px-4 py-3 rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
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

            {/* Floating card — Copytrading peek (desktop only) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 2.2, duration: 0.6, ease }}
              className="hidden md:block absolute bottom-[18%] -right-6 lg:-right-10 w-[190px] lg:w-[210px] rounded-xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
            >
              <Image src="/screenshots/dashboard-copytrading.png" alt="Copy Trading" width={2208} height={1000} className="w-full h-auto" quality={80} />
            </motion.div>
          </motion.div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-10 md:mt-14 lg:mt-16 max-w-[800px] mx-auto px-2">
            {[
              { icon: BarChart3, value: 2847, suffix: "+", label: "Trades Copied", color: "#0D71FF" },
              { icon: Users, value: 100, suffix: "+", label: "Verified Traders", color: "#6366F1" },
              { icon: Shield, value: 99, suffix: ".9%", label: "Uptime SLA", color: "#0D71FF" },
              { icon: Zap, value: 200, prefix: "<", suffix: "ms", label: "Execution", color: "#6366F1" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.7, ease }}
                className="relative group rounded-2xl border border-white/[0.04] p-4 md:p-5 text-center transition-all duration-300 hover:border-white/[0.08] overflow-hidden"
                style={{ background: "rgba(255,255,255,0.015)" }}
              >
                {/* Subtle hover glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at 50% 0%, ${s.color}08, transparent 70%)` }} />

                <div className="relative">
                  <s.icon className="w-4 h-4 mx-auto mb-2.5 md:mb-3" style={{ color: `${s.color}50` }} />
                  <p className="text-2xl md:text-3xl font-bold text-white tabular-nums leading-none">
                    <Counter target={s.value} suffix={s.suffix} prefix={s.prefix || ""} delay={1 + i * 0.12} />
                  </p>
                  <p className="text-[10px] md:text-[11px] text-white/25 mt-1.5 uppercase tracking-wider font-medium">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Logo cloud — social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="mt-8 md:mt-12 lg:mt-14 text-center"
          >
            <p className="text-[10px] md:text-[11px] text-white/15 uppercase tracking-[0.2em] mb-4 md:mb-5">Integrated with leading platforms</p>
            <div className="flex items-center justify-center gap-6 md:gap-10 flex-wrap px-4">
              {["Webull", "Coinbase", "Binance", "Stripe", "Supabase"].map((name, i) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 6 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 1.5 + i * 0.06, duration: 0.5 }}
                  className="text-xs md:text-[13px] font-semibold text-white/[0.1] tracking-wide hover:text-white/25 transition-colors duration-300"
                >
                  {name}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll — desktop only */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden md:block">
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <div className="w-5 h-8 rounded-full border border-white/8 flex justify-center pt-1.5">
            <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity }} className="w-1 h-2 rounded-full bg-white/20" />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
