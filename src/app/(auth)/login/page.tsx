"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { TrendingUp, ArrowRight, ShieldCheck, ArrowLeft, CheckCircle, Eye, EyeOff, Shield, Zap, Users, BarChart3, Lock } from "lucide-react";
import { FloatingParticles } from "@/components/ui/floating-particles";
import { toast } from "@/components/ui/toast";
import { FormField } from "@/components/ui/form-field";
import { validateField, emailSchema } from "@/lib/validation";

const ease = [0.22, 1, 0.36, 1] as const;

/* ─── Animated trading chart SVG for left panel ─── */
function TradingVisual() {
  return (
    <div className="relative w-full max-w-[320px] mx-auto">
      <svg viewBox="0 0 320 200" fill="none" className="w-full">
        {/* Grid */}
        {[40, 80, 120, 160].map((y) => (
          <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="white" strokeOpacity="0.03" />
        ))}
        {/* Area fill */}
        <motion.path
          d="M0 160 L20 145 L50 150 L80 120 L110 130 L140 95 L170 105 L200 70 L230 80 L260 50 L290 60 L320 35 L320 200 L0 200Z"
          fill="url(#areaGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1.2 }}
        />
        {/* Line */}
        <motion.path
          d="M0 160 L20 145 L50 150 L80 120 L110 130 L140 95 L170 105 L200 70 L230 80 L260 50 L290 60 L320 35"
          stroke="url(#lineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 1.8, ease }}
        />
        {/* Glow dot at end */}
        <motion.circle
          cx="320" cy="35" r="4"
          fill="#2962FF"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.4, 1], opacity: 1 }}
          transition={{ delay: 2, duration: 0.5 }}
        />
        <motion.circle
          cx="320" cy="35" r="10"
          fill="none"
          stroke="#2962FF"
          strokeWidth="1.5"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0.5, 1.5], opacity: [0.4, 0] }}
          transition={{ delay: 2.2, duration: 1.5, repeat: Infinity }}
        />
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="320" y2="0">
            <stop offset="0%" stopColor="#2962FF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2962FF" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="160" y1="30" x2="160" y2="200">
            <stop offset="0%" stopColor="#2962FF" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#2962FF" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating stat cards */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.6, ease }}
        className="absolute top-2 left-0 px-3 py-2 rounded-xl border border-white/[0.06]"
        style={{ background: "rgba(10,10,15,0.7)", backdropFilter: "blur(12px)" }}
      >
        <p className="text-[10px] text-white/30 mb-0.5">Portfolio</p>
        <p className="text-sm font-bold text-white tabular-nums">$48,291</p>
        <div className="flex items-center gap-1 mt-0.5">
          <div className="w-1 h-1 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-medium">+12.4%</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.5, duration: 0.6, ease }}
        className="absolute top-8 right-0 px-3 py-2 rounded-xl border border-white/[0.06]"
        style={{ background: "rgba(10,10,15,0.7)", backdropFilter: "blur(12px)" }}
      >
        <p className="text-[10px] text-white/30 mb-0.5">Win Rate</p>
        <p className="text-sm font-bold text-white tabular-nums">73.2%</p>
      </motion.div>
    </div>
  );
}

/* ─── Rotating trust quotes ─── */
const QUOTES = [
  { text: "Best copy trading platform I've used in 8 years.", author: "Marcus C.", role: "Senior Analyst" },
  { text: "Execution is flawless. Zero slippage since day one.", author: "Sarah W.", role: "Quant Trader" },
  { text: "The infrastructure is truly institutional grade.", author: "Elena P.", role: "Head of Trading" },
];

function TrustQuote() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((p) => (p + 1) % QUOTES.length), 5000);
    return () => clearInterval(t);
  }, []);
  const q = QUOTES[idx];
  return (
    <div className="relative h-[60px]">
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease }} className="absolute inset-0">
          <p className="text-[12px] text-white/40 leading-relaxed italic">&ldquo;{q.text}&rdquo;</p>
          <p className="text-[11px] text-white/25 mt-1.5">{q.author} &middot; <span className="text-white/15">{q.role}</span></p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─── Interactive gradient ─── */
function GradientBlob({ parentRef }: { parentRef: React.RefObject<HTMLDivElement | null> }) {
  const x = useMotionValue(50);
  const y = useMotionValue(40);
  const bg = useTransform([x, y], ([xv, yv]) =>
    `radial-gradient(500px circle at ${xv}% ${yv}%, rgba(41,98,255,0.06), transparent 60%)`
  );
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      x.set(((e.clientX - r.left) / r.width) * 100);
      y.set(((e.clientY - r.top) / r.height) * 100);
    };
    el.addEventListener("mousemove", handler);
    return () => el.removeEventListener("mousemove", handler);
  }, [parentRef, x, y]);
  return <motion.div className="absolute inset-0 pointer-events-none z-0" style={{ background: bg }} />;
}

function LoginPageInner() {
  const router = useRouter();
  useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showVerifiedBanner] = useState(() => {
    if (typeof window !== "undefined") return new URLSearchParams(window.location.search).get("verified") === "true";
    return false;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await signIn("credentials", { email, password, twoFactorCode: requires2FA ? twoFactorCode : undefined, redirect: false });
    if (result?.error) {
      if (result.error.includes("2FA_REQUIRED")) { setRequires2FA(true); setTwoFactorCode(""); setIsLoading(false); return; }
      toast.error(result.error.includes("Invalid 2FA") ? "Invalid 2FA code." : "Invalid email or password");
      if (result.error.includes("Invalid 2FA")) setTwoFactorCode("");
      setIsLoading(false);
    } else {
      try {
        const s = await (await fetch("/api/auth/session")).json();
        router.push(s?.user?.role === "MASTER_TRADER" ? "/dashboard/trader" : s?.user?.role === "FOLLOWER" ? "/dashboard/follower" : "/dashboard");
      } catch { router.push("/dashboard"); }
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#06060a] flex items-center justify-center relative overflow-hidden px-4 py-8">
      <FloatingParticles count={50} />
      <GradientBlob parentRef={containerRef} />

      {/* Back */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="absolute top-5 left-5 z-20">
        <Link href="/" className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Home
        </Link>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
        className="relative w-full max-w-[920px] rounded-[24px] overflow-hidden z-10"
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.5), 0 0 120px rgba(41,98,255,0.03)" }}
      >
        <div className="flex flex-col md:flex-row min-h-[560px]">

          {/* ═══ LEFT — Brand ═══ */}
          <div className="relative w-full md:w-[46%] bg-[#08080d] p-7 md:p-9 flex flex-col overflow-hidden">
            {/* Grid */}
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            {/* Ambient */}
            <div className="absolute top-[-20%] right-[-30%] w-[400px] h-[400px] rounded-full bg-blue-600/[0.04] blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-20%] w-[300px] h-[300px] rounded-full bg-indigo-500/[0.03] blur-[80px]" />

            <div className="relative z-10 flex flex-col h-full">
              {/* Logo */}
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5, ease }} className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-[10px] bg-white flex items-center justify-center shadow-[0_0_12px_rgba(255,255,255,0.05)]">
                  <TrendingUp className="w-4 h-4 text-[#08080d]" />
                </div>
                <span className="text-white/80 font-semibold text-[15px] tracking-tight">CopyTrade Pro</span>
              </motion.div>

              {/* Headline */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6, ease }} className="mb-6 hidden md:block">
                <h1 className="text-[28px] font-bold text-white leading-[1.1] tracking-tight mb-3">
                  Welcome back
                </h1>
                <p className="text-[13px] text-white/35 leading-relaxed max-w-[260px]">
                  Track performance, manage your portfolio, and copy top traders in real time.
                </p>
              </motion.div>

              {/* Chart visual */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }} className="hidden md:block my-auto">
                <TradingVisual />
              </motion.div>

              {/* Trust quote */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.5 }} className="hidden md:block mt-auto pt-6">
                <TrustQuote />
                <div className="flex items-center gap-2 mt-4">
                  {[
                    { icon: Shield, t: "Encrypted" },
                    { icon: Zap, t: "<200ms" },
                    { icon: Users, t: "2.8K+" },
                  ].map((p) => (
                    <div key={p.t} className="flex items-center gap-1 px-2 py-1 rounded-md border border-white/[0.04] bg-white/[0.015]">
                      <p.icon className="w-2.5 h-2.5 text-white/20" />
                      <span className="text-[9px] text-white/25 font-medium">{p.t}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {/* ═══ RIGHT — Form ═══ */}
          <div className="w-full md:w-[54%] bg-[#0a0a0f] p-7 md:p-9 md:pl-10 flex items-center border-l border-white/[0.03]">
            <div className="w-full max-w-[320px] mx-auto">

              {/* Mobile logo */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="md:hidden flex items-center gap-2 mb-6">
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-black" />
                </div>
                <span className="text-white/80 font-semibold text-sm">CopyTrade Pro</span>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5, ease }}>
                <h2 className="text-[18px] font-semibold text-white mb-1">Sign in</h2>
                <p className="text-[12px] text-white/35 mb-6">
                  New here?{" "}
                  <Link href="/signup" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">Create an account</Link>
                </p>
              </motion.div>

              {showVerifiedBanner && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-2.5 mb-5 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04]">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <p className="text-[11px] text-emerald-300/80">Email verified successfully.</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4, ease }}>
                  <FormField label="Email" error={emailError} touched={emailTouched} valid={!emailError && !!email} errorId="login-email-error" labelClassName="text-white/35 !text-[11px]">
                    <input type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => { setEmailTouched(true); setEmailError(validateField(emailSchema, email) || ""); }}
                      placeholder="name@company.com"
                      className="auth-input !text-[13px] !py-[10px]"
                      autoComplete="email" required />
                  </FormField>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4, ease }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-white/35 tracking-wide">Password</label>
                    {!requires2FA && (
                      <Link href="/reset-password" className="text-[11px] text-white/30 hover:text-blue-400 transition-colors">Forgot?</Link>
                    )}
                  </div>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="auth-input !text-[13px] !py-[10px] pr-10"
                      autoComplete="current-password" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/45 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </motion.div>

                {/* Remember me */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="flex items-center gap-2">
                  <button type="button" onClick={() => setRememberMe(!rememberMe)}
                    className={`w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center shrink-0 ${rememberMe ? "bg-blue-500 border-blue-500" : "border-white/15 bg-transparent"}`}
                    aria-label="Remember me">
                    {rememberMe && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <span className="text-[11px] text-white/35">Remember me</span>
                </motion.div>

                {/* 2FA */}
                {requires2FA && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                    <div className="flex gap-2 items-center p-2.5 mb-3 rounded-xl border border-blue-500/12 bg-blue-500/[0.03]">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400/70 shrink-0" />
                      <p className="text-[11px] text-white/40">Enter your 6-digit authenticator code</p>
                    </div>
                    <input type="text" inputMode="numeric" autoComplete="one-time-code" value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000" maxLength={6}
                      className="auth-input text-center font-mono tracking-[0.3em] !text-base !py-3" autoFocus />
                    <button type="button" onClick={() => { setRequires2FA(false); setTwoFactorCode(""); }}
                      className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors mt-2">
                      <ArrowLeft className="w-2.5 h-2.5" /> Back
                    </button>
                  </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4, ease }}>
                  <motion.button type="submit" disabled={isLoading || (requires2FA && twoFactorCode.length !== 6)}
                    whileHover={{ scale: 1.015, boxShadow: "0 2px 4px rgba(0,0,0,0.3), 0 8px 20px rgba(41,98,255,0.25)" }}
                    whileTap={{ scale: 0.985 }}
                    className="w-full flex items-center justify-center gap-2 py-[10px] rounded-xl text-[13px] font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #2962FF, #1a47cc)", boxShadow: "0 1px 2px rgba(0,0,0,0.3), 0 4px 12px rgba(41,98,255,0.15)" }}>
                    {isLoading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : requires2FA ? <>Verify <ArrowRight className="w-3.5 h-3.5" /></> : "Sign In"}
                  </motion.button>
                </motion.div>
              </form>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="text-[10px] text-white/20 text-center mt-6 leading-relaxed">
                By continuing you agree to our{" "}
                <a href="/terms" className="text-white/30 hover:text-white/50 transition-colors underline">Terms</a> &{" "}
                <a href="/privacy" className="text-white/30 hover:text-white/50 transition-colors underline">Privacy Policy</a>
              </motion.p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginPageInner /></Suspense>;
}
