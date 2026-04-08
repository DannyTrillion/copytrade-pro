"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  TrendingUp, ArrowRight, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2, Shield, Zap, Users,
} from "lucide-react";
import { FloatingParticles } from "@/components/ui/floating-particles";
import { toast } from "@/components/ui/toast";
import { FormField, PasswordStrengthMeter } from "@/components/ui/form-field";
import { validateField, emailSchema, passwordSchema, nameSchema } from "@/lib/validation";

const ease = [0.22, 1, 0.36, 1] as const;
type Step = "email" | "otp" | "details";

/* ─── Animated onboarding visual ─── */
function OnboardingVisual({ step }: { step: Step }) {
  const stepIdx = step === "email" ? 0 : step === "otp" ? 1 : 2;
  const VISUALS = [
    { title: "Start trading", sub: "Join thousands of traders copying signals in real time.", emoji: "📈" },
    { title: "Verify identity", sub: "We sent a code to your email for security.", emoji: "🔐" },
    { title: "Almost there", sub: "Set up your profile and you're ready to go.", emoji: "🚀" },
  ];
  const v = VISUALS[stepIdx];

  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4, ease }}>
        <div className="text-center md:text-left">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="text-[48px] mb-4 inline-block">{v.emoji}</motion.div>
          <h1 className="text-[26px] font-bold text-white leading-[1.1] tracking-tight mb-3">{v.title}</h1>
          <p className="text-[13px] text-white/35 leading-relaxed max-w-[260px]">{v.sub}</p>
        </div>

        {/* Progress steps visual */}
        <div className="flex items-center gap-3 mt-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-500 ${
                i < stepIdx ? "bg-blue-500 text-white" : i === stepIdx ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30" : "bg-white/[0.03] text-white/20 ring-1 ring-white/[0.06]"
              }`}>
                {i < stepIdx ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < 2 && <div className={`w-6 h-px transition-colors duration-500 ${i < stepIdx ? "bg-blue-500/50" : "bg-white/[0.06]"}`} />}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Interactive gradient ─── */
function GradientBlob({ parentRef }: { parentRef: React.RefObject<HTMLDivElement | null> }) {
  const x = useMotionValue(50); const y = useMotionValue(40);
  const bg = useTransform([x, y], ([xv, yv]) => `radial-gradient(500px circle at ${xv}% ${yv}%, rgba(41,98,255,0.06), transparent 60%)`);
  useEffect(() => {
    const el = parentRef.current; if (!el) return;
    const handler = (e: MouseEvent) => { const r = el.getBoundingClientRect(); x.set(((e.clientX - r.left) / r.width) * 100); y.set(((e.clientY - r.top) / r.height) * 100); };
    el.addEventListener("mousemove", handler); return () => el.removeEventListener("mousemove", handler);
  }, [parentRef, x, y]);
  return <motion.div className="absolute inset-0 pointer-events-none z-0" style={{ background: bg }} />;
}

export default function SignupPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(""); const [emailError, setEmailError] = useState(""); const [sendingOtp, setSendingOtp] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]); const [otpError, setOtpError] = useState(""); const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0); const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [form, setForm] = useState({ name: "", password: "" }); const [touched, setTouched] = useState({ name: false, password: false });
  const [fieldErrors, setFieldErrors] = useState({ name: "", password: "" }); const [showPassword, setShowPassword] = useState(false); const [isLoading, setIsLoading] = useState(false);

  const schemas = { name: nameSchema, password: passwordSchema };
  const validateOnBlur = (field: "name" | "password") => setFieldErrors((p) => ({ ...p, [field]: validateField(schemas[field], form[field]) }));

  useEffect(() => { if (resendCooldown <= 0) return; const t = setInterval(() => setResendCooldown((p) => Math.max(0, p - 1)), 1000); return () => clearInterval(t); }, [resendCooldown]);

  const handleSendOtp = useCallback(async () => {
    const err = validateField(emailSchema, email); if (err) { setEmailError(err); return; }
    setEmailError(""); setSendingOtp(true);
    try {
      const res = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error || "Failed"); setSendingOtp(false); return; }
      setStep("otp"); setOtpDigits(["","","","","",""]); setOtpError(""); setResendCooldown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch { setEmailError("Something went wrong."); } finally { setSendingOtp(false); }
  }, [email]);

  const handleVerifyOtp = useCallback(async (code: string) => {
    if (code.length !== 6) return; setOtpError(""); setVerifyingOtp(true);
    try {
      const res = await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), code }) });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error || "Invalid"); setVerifyingOtp(false); return; }
      setStep("details");
    } catch { setOtpError("Something went wrong."); } finally { setVerifyingOtp(false); }
  }, [email]);

  const handleOtpChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return; const d = [...otpDigits];
    if (v.length > 1) { const p = v.slice(0,6).split(""); p.forEach((c,j) => { if(i+j<6) d[i+j]=c; }); setOtpDigits(d); inputRefs.current[Math.min(i+p.length,5)]?.focus(); if(d.join("").length===6) handleVerifyOtp(d.join("")); return; }
    d[i]=v; setOtpDigits(d); if(v&&i<5) inputRefs.current[i+1]?.focus(); if(d.join("").length===6) handleVerifyOtp(d.join(""));
  };
  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => { if(e.key==="Backspace"&&!otpDigits[i]&&i>0) inputRefs.current[i-1]?.focus(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), name: form.name, password: form.password }) });
      if (!res.ok) { const d = await res.json(); throw new Error(typeof d.error === "string" ? d.error : "Signup failed"); }
      const r = await signIn("credentials", { email: email.trim(), password: form.password, redirect: false });
      if (r?.error) { router.push("/login"); return; }
      router.push("/dashboard/follower");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Signup failed"); setIsLoading(false); }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#06060a] flex items-center justify-center relative overflow-hidden px-4 py-8">
      <FloatingParticles count={50} />
      <GradientBlob parentRef={containerRef} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="absolute top-5 left-5 z-20">
        <Link href="/" className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 transition-colors"><ArrowLeft className="w-3 h-3" /> Home</Link>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.7, ease }}
        className="relative w-full max-w-[920px] rounded-[24px] overflow-hidden z-10"
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.5), 0 0 120px rgba(41,98,255,0.03)" }}>
        <div className="flex flex-col md:flex-row min-h-[560px]">

          {/* ═══ LEFT ═══ */}
          <div className="relative w-full md:w-[46%] bg-[#08080d] p-7 md:p-9 flex flex-col overflow-hidden">
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            <div className="absolute top-[-20%] right-[-30%] w-[400px] h-[400px] rounded-full bg-blue-600/[0.04] blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-20%] w-[300px] h-[300px] rounded-full bg-indigo-500/[0.03] blur-[80px]" />

            <div className="relative z-10 flex flex-col h-full">
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5, ease }} className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-[10px] bg-white flex items-center justify-center shadow-[0_0_12px_rgba(255,255,255,0.05)]">
                  <TrendingUp className="w-4 h-4 text-[#08080d]" />
                </div>
                <span className="text-white/80 font-semibold text-[15px] tracking-tight">CopyTrade Pro</span>
              </motion.div>

              <div className="my-auto hidden md:block">
                <OnboardingVisual step={step} />
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="hidden md:flex items-center gap-2 mt-auto pt-6">
                {[{ icon: Shield, t: "Encrypted" }, { icon: Zap, t: "Instant" }, { icon: Users, t: "Free" }].map((p) => (
                  <div key={p.t} className="flex items-center gap-1 px-2 py-1 rounded-md border border-white/[0.04] bg-white/[0.015]">
                    <p.icon className="w-2.5 h-2.5 text-white/20" />
                    <span className="text-[9px] text-white/25 font-medium">{p.t}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* ═══ RIGHT ═══ */}
          <div className="w-full md:w-[54%] bg-[#0a0a0f] p-7 md:p-9 md:pl-10 flex items-center border-l border-white/[0.03]">
            <div className="w-full max-w-[320px] mx-auto">

              {/* Mobile logo */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="md:hidden flex items-center gap-2 mb-6">
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center"><TrendingUp className="w-3.5 h-3.5 text-black" /></div>
                <span className="text-white/80 font-semibold text-sm">CopyTrade Pro</span>
              </motion.div>

              <AnimatePresence mode="wait">
                {/* ═══ Step 1: Email ═══ */}
                {step === "email" && (
                  <motion.div key="email" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3, ease }}>
                    <h2 className="text-[18px] font-semibold text-white mb-1">Create account</h2>
                    <p className="text-[12px] text-white/35 mb-6">Already registered? <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">Sign in</Link></p>
                    <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
                      <FormField label="Email" error={emailError} touched={!!emailError} valid={false} errorId="signup-email-error" labelClassName="text-white/35 !text-[11px]">
                        <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if(emailError) setEmailError(""); }}
                          placeholder="name@company.com" className="auth-input !text-[13px] !py-[10px]" autoComplete="email" autoFocus required disabled={sendingOtp} />
                      </FormField>
                      <motion.button type="submit" disabled={sendingOtp || !email.trim()} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                        className="w-full flex items-center justify-center gap-2 py-[10px] rounded-xl text-[13px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(135deg, #2962FF, #1a47cc)", boxShadow: "0 1px 2px rgba(0,0,0,0.3), 0 4px 12px rgba(41,98,255,0.15)" }}>
                        {sendingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Continue <ArrowRight className="w-3.5 h-3.5" /></>}
                      </motion.button>
                    </form>
                    <p className="text-[10px] text-white/20 text-center mt-5">
                      By continuing you agree to our <a href="/terms" className="underline text-white/30">Terms</a> & <a href="/privacy" className="underline text-white/30">Privacy</a>
                    </p>
                  </motion.div>
                )}

                {/* ═══ Step 2: OTP ═══ */}
                {step === "otp" && (
                  <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3, ease }}>
                    <button type="button" onClick={() => setStep("email")} className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors mb-4">
                      <ArrowLeft className="w-2.5 h-2.5" /> Back
                    </button>
                    <h2 className="text-[18px] font-semibold text-white mb-1">Verify email</h2>
                    <p className="text-[12px] text-white/35 mb-6">Code sent to <span className="text-white/50 font-medium">{email}</span></p>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      {otpDigits.map((digit, i) => (
                        <motion.input key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 + i * 0.04, duration: 0.3, ease }}
                          ref={(el) => { inputRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={6} value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          onPaste={(e) => { const p = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6); if(p.length>1){e.preventDefault(); handleOtpChange(0,p);} }}
                          disabled={verifyingOtp}
                          className="w-[44px] h-[52px] text-center text-xl font-semibold rounded-xl outline-none transition-all duration-200 bg-transparent text-white disabled:opacity-50"
                          style={{ boxShadow: digit ? "0 0 0 1px rgba(41,98,255,0.3)" : "0 0 0 1px rgba(255,255,255,0.08)" }}
                          onFocus={(e) => { (e.target as HTMLInputElement).style.boxShadow = "0 0 0 1.5px rgba(41,98,255,0.5), 0 0 8px rgba(41,98,255,0.08)"; }}
                          onBlur={(e) => { const d = (e.target as HTMLInputElement).value; (e.target as HTMLInputElement).style.boxShadow = d ? "0 0 0 1px rgba(41,98,255,0.3)" : "0 0 0 1px rgba(255,255,255,0.08)"; }}
                          aria-label={`Digit ${i + 1}`} />
                      ))}
                    </div>
                    {otpError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-red-400 text-center mb-3">{otpError}</motion.p>}
                    {verifyingOtp && <div className="flex items-center justify-center gap-2 mb-3"><Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /><span className="text-[11px] text-white/30">Verifying...</span></div>}
                    <p className="text-[11px] text-white/30 text-center">
                      No code?{" "}{resendCooldown > 0 ? <span className="tabular-nums text-white/40">Resend in {resendCooldown}s</span>
                        : <button type="button" onClick={handleSendOtp} disabled={sendingOtp} className="text-blue-400 hover:text-blue-300 transition-colors font-medium">Resend</button>}
                    </p>
                  </motion.div>
                )}

                {/* ═══ Step 3: Details ═══ */}
                {step === "details" && (
                  <motion.div key="details" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3, ease }}>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-blue-500/15 bg-blue-500/[0.04] w-fit mb-4">
                      <CheckCircle2 className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] font-medium text-blue-400">{email}</span>
                    </div>
                    <h2 className="text-[18px] font-semibold text-white mb-1">Complete profile</h2>
                    <p className="text-[12px] text-white/35 mb-6">Set your name and password</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <FormField label="Full Name" error={fieldErrors.name} touched={touched.name} valid={!fieldErrors.name && !!form.name} errorId="signup-name-error" labelClassName="text-white/35 !text-[11px]">
                        <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                          onBlur={() => { setTouched((p) => ({...p, name: true})); validateOnBlur("name"); }}
                          placeholder="John Doe" className="auth-input !text-[13px] !py-[10px]" autoComplete="name" autoFocus required minLength={2} disabled={isLoading} />
                      </FormField>
                      <FormField label="Password" error={fieldErrors.password} touched={touched.password} valid={!fieldErrors.password && !!form.password} errorId="signup-password-error" labelClassName="text-white/35 !text-[11px]">
                        <div className="relative">
                          <input type={showPassword ? "text" : "password"} value={form.password}
                            onChange={(e) => setForm({...form, password: e.target.value})}
                            onBlur={() => { setTouched((p) => ({...p, password: true})); validateOnBlur("password"); }}
                            placeholder="Min 8 characters" className="auth-input !text-[13px] !py-[10px] pr-10" autoComplete="new-password" required minLength={8} disabled={isLoading} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/45 transition-colors">
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <PasswordStrengthMeter password={form.password} />
                      </FormField>
                      <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                        className="w-full flex items-center justify-center gap-2 py-[10px] rounded-xl text-[13px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(135deg, #2962FF, #1a47cc)", boxShadow: "0 1px 2px rgba(0,0,0,0.3), 0 4px 12px rgba(41,98,255,0.15)" }}>
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Create Account <ArrowRight className="w-3.5 h-3.5" /></>}
                      </motion.button>
                    </form>
                    <p className="text-[12px] text-white/35 text-center mt-5">
                      Already have an account? <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">Sign in</Link>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
