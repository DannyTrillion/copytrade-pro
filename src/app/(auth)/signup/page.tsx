"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { FormField, PasswordStrengthMeter } from "@/components/ui/form-field";
import { validateField, emailSchema, passwordSchema, nameSchema } from "@/lib/validation";

const ease = [0.22, 1, 0.36, 1] as const;

type Step = "email" | "otp" | "details";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>("email");

  // Email step
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  // OTP step
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Details step
  const [form, setForm] = useState({ name: "", password: "", role: "FOLLOWER" });
  const [touched, setTouched] = useState({ name: false, password: false });
  const [fieldErrors, setFieldErrors] = useState({ name: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const schemas = { name: nameSchema, password: passwordSchema };

  const validateOnBlur = (field: "name" | "password") => {
    const error = validateField(schemas[field], form[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  };

  // ─── Resend cooldown timer ───
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ─── Step 1: Send OTP ───
  const handleSendOtp = useCallback(async () => {
    const error = validateField(emailSchema, email);
    if (error) {
      setEmailError(error);
      return;
    }
    setEmailError("");
    setSendingOtp(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEmailError(data.error || "Failed to send code");
        setSendingOtp(false);
        return;
      }

      setStep("otp");
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpError("");
      setResendCooldown(60);
      // Focus first OTP input after transition
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch {
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  }, [email]);

  // ─── Step 2: Verify OTP ───
  const handleVerifyOtp = useCallback(async (code: string) => {
    if (code.length !== 6) return;
    setOtpError("");
    setVerifyingOtp(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || "Invalid code");
        setVerifyingOtp(false);
        return;
      }

      // Success → move to details step
      setStep("details");
    } catch {
      setOtpError("Something went wrong. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  }, [email]);

  // ─── OTP input handlers ───
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];

    if (value.length > 1) {
      // Handle paste
      const pasted = value.slice(0, 6).split("");
      pasted.forEach((d, i) => {
        if (index + i < 6) newDigits[index + i] = d;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(index + pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();

      const fullCode = newDigits.join("");
      if (fullCode.length === 6) {
        handleVerifyOtp(fullCode);
      }
      return;
    }

    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join("");
    if (fullCode.length === 6) {
      handleVerifyOtp(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // ─── Step 3: Complete signup ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: form.name,
          password: form.password,
          role: form.role,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : "Signup failed");
      }

      const signInResult = await signIn("credentials", {
        email: email.trim(),
        password: form.password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
        return;
      }

      const dashboardPath =
        form.role === "MASTER_TRADER" ? "/dashboard/trader" : "/dashboard/follower";
      router.push(dashboardPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
      setIsLoading(false);
    }
  };

  // ─── Step indicator ───
  const steps: { key: Step; label: string }[] = [
    { key: "email", label: "Email" },
    { key: "otp", label: "Verify" },
    { key: "details", label: "Details" },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-[var(--color-auth-bg)] flex relative overflow-hidden">

      {/* Mobile solid dark background */}
      <div className="absolute inset-0 bg-black lg:hidden pointer-events-none" />

      {/* ===== Desktop left panel ===== */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/hero-space.webp" alt="" fill sizes="50vw" className="object-cover object-[30%_80%]" quality={90} />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-auth-bg)]/40 via-transparent to-[var(--color-auth-bg)]/90" />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-auth-bg)]/60 via-transparent to-[var(--color-auth-bg)]/40" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(38,166,154,0.12),transparent_70%)]" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center shadow-glow">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">CopyTrade Pro</span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Start Trading<br /><span className="text-gradient">Like a Pro</span>
            </h1>
            <p className="text-lg text-white/60 max-w-md">
              Join the platform trusted by professional traders. Copy trades automatically or share your signals and earn from followers.
            </p>
            <div className="mt-10 space-y-4">
              {[
                { icon: Shield, text: "Bank-grade security for your assets" },
                { icon: TrendingUp, text: "Real-time signal execution" },
                { icon: User, text: "Follow verified top traders" },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
                    <item.icon className="w-4 h-4 text-brand" />
                  </div>
                  <span className="text-sm text-white/60">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===== Right panel / Mobile ===== */}
      <div className="relative z-10 w-full lg:w-1/2 flex flex-col items-center justify-start pt-10 pb-8 lg:justify-center lg:pt-0 px-5 lg:px-12 lg:bg-surface-0 overflow-y-auto">
        {/* Desktop gradient decoration */}
        <div className="absolute inset-0 hidden lg:block pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_rgba(38,166,154,0.04),transparent_70%)]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,_rgba(41,98,255,0.03),transparent_70%)]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile branding */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="lg:hidden flex flex-col items-center mb-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center shadow-glow mb-3">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <span className="text-xl font-bold text-white">CopyTrade Pro</span>
          </motion.div>

          {/* Glass card */}
          <div className="auth-card">

              {/* Step indicator */}
              <div className="flex items-center gap-3 mb-8">
                {steps.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-3 flex-1">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                          i < currentStepIndex
                            ? "bg-brand text-white shadow-[0_0_12px_rgba(41,98,255,0.25)]"
                            : i === currentStepIndex
                            ? "bg-brand/15 text-brand ring-2 ring-brand/30"
                            : "bg-[#1a1a1a] text-[#555] lg:bg-surface-2 lg:text-text-tertiary"
                        }`}
                      >
                        {i < currentStepIndex ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span className={`text-2xs font-medium transition-colors duration-300 ${
                        i <= currentStepIndex ? "text-[#a1a1a1] lg:text-text-secondary" : "text-[#555] lg:text-text-tertiary"
                      }`}>{s.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-px transition-colors duration-500 mb-5 ${
                        i < currentStepIndex ? "bg-brand" : "bg-[#222] lg:bg-border"
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* ═══ Step 1: Email ═══ */}
                {step === "email" && (
                  <motion.div
                    key="email-step"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25, ease }}
                  >
                    <h2 className="text-2xl font-bold text-white lg:text-text-primary mb-1">
                      Create your account
                    </h2>
                    <p className="text-sm text-[#a1a1a1] lg:text-text-tertiary mb-6">
                      Enter your email to get started
                    </p>

                    {/* Google OAuth */}
                    <motion.button
                      type="button"
                      disabled={isGoogleLoading}
                      onClick={() => {
                        setIsGoogleLoading(true);
                        signIn("google", { callbackUrl: "/dashboard" });
                      }}
                      whileTap={{ scale: 0.97 }}
                      className="auth-btn-google"
                    >
                      {isGoogleLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <GoogleIcon className="w-5 h-5" />
                          Continue with Google
                        </>
                      )}
                    </motion.button>

                    <div className="flex items-center gap-3 my-5">
                      <div className="flex-1 h-px bg-[#222] lg:bg-border" />
                      <span className="text-xs text-[#a1a1a1] lg:text-text-tertiary uppercase tracking-wider">or</span>
                      <div className="flex-1 h-px bg-[#222] lg:bg-border" />
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendOtp();
                      }}
                      className="space-y-5"
                    >
                      <FormField label="Email address" error={emailError} touched={!!emailError} valid={false} errorId="signup-email-error" labelClassName="text-[#a1a1a1] lg:text-text-secondary">
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666] lg:text-text-tertiary" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (emailError) setEmailError("");
                            }}
                            placeholder="trader@example.com"
                            className="auth-input pl-10"
                            autoComplete="email"
                            autoFocus
                            required
                            disabled={sendingOtp}
                          />
                        </div>
                      </FormField>

                      <motion.button
                        type="submit"
                        disabled={sendingOtp || !email.trim()}
                        whileTap={{ scale: 0.97 }}
                        className="auth-btn"
                      >
                        {sendingOtp ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            Continue
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </motion.button>
                    </form>

                    <p className="text-sm text-[#a1a1a1] lg:text-text-tertiary text-center mt-5">
                      Already have an account?{" "}
                      <Link href="/login" className="text-brand hover:text-brand-light transition-colors font-medium">
                        Sign in
                      </Link>
                    </p>
                    <p className="text-2xs text-[#666] lg:text-text-quaternary text-center mt-4">
                      By signing up, you agree to our Terms & Privacy Policy
                    </p>
                  </motion.div>
                )}

                {/* ═══ Step 2: OTP ═══ */}
                {step === "otp" && (
                  <motion.div
                    key="otp-step"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25, ease }}
                  >
                    <button
                      type="button"
                      onClick={() => setStep("email")}
                      className="flex items-center gap-1.5 text-sm text-[#a1a1a1] hover:text-white/80 lg:text-text-tertiary lg:hover:text-text-secondary transition-colors mb-4"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back
                    </button>

                    <h2 className="text-2xl font-bold text-white lg:text-text-primary mb-1">
                      Check your email
                    </h2>
                    <p className="text-sm text-[#a1a1a1] lg:text-text-tertiary mb-6">
                      We sent a 6-digit code to{" "}
                      <span className="text-white/80 lg:text-text-secondary font-medium">{email}</span>
                    </p>

                    {/* OTP inputs */}
                    <div className="flex items-center justify-center gap-1.5 xs:gap-2 mb-4">
                      {otpDigits.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { inputRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                            if (pasted.length > 1) {
                              e.preventDefault();
                              handleOtpChange(0, pasted);
                            }
                          }}
                          disabled={verifyingOtp}
                          className={`w-11 h-12 xs:w-[52px] xs:h-[60px] text-center text-xl xs:text-2xl font-bold rounded-lg xs:rounded-xl border-2 transition-all duration-200 outline-none
                            ${
                              otpError
                                ? "border-danger/40 bg-danger/5 text-danger"
                                : digit
                                ? "border-brand/40 bg-brand/[0.08] text-white lg:text-text-primary"
                                : "border-[#222] bg-[#0a0a0a] text-white lg:text-text-primary lg:border-border lg:bg-surface-0"
                            }
                            focus:border-brand focus:ring-2 focus:ring-brand/20 focus:bg-brand/[0.04]
                            disabled:opacity-50
                          `}
                          aria-label={`Digit ${i + 1}`}
                        />
                      ))}
                    </div>

                    {/* OTP error */}
                    {otpError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-danger text-center mb-4"
                      >
                        {otpError}
                      </motion.p>
                    )}

                    {/* Verifying indicator */}
                    {verifyingOtp && (
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Loader2 className="w-4 h-4 animate-spin text-brand" />
                        <span className="text-sm text-[#a1a1a1] lg:text-text-tertiary">Verifying...</span>
                      </div>
                    )}

                    {/* Resend */}
                    <div className="text-center">
                      <p className="text-sm text-[#a1a1a1] lg:text-text-tertiary">
                        Didn&apos;t receive the code?{" "}
                        {resendCooldown > 0 ? (
                          <span className="text-[#a1a1a1] lg:text-text-secondary tabular-nums">
                            Resend in {resendCooldown}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={sendingOtp}
                            className="text-brand hover:text-brand-light transition-colors font-medium"
                          >
                            Resend code
                          </button>
                        )}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* ═══ Step 3: Details ═══ */}
                {step === "details" && (
                  <motion.div
                    key="details-step"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25, ease }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 border border-brand/20">
                        <CheckCircle2 className="w-3 h-3 text-brand" />
                        <span className="text-2xs font-medium text-brand">{email}</span>
                      </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white lg:text-text-primary mb-1">
                      Complete your profile
                    </h2>
                    <p className="text-sm text-[#a1a1a1] lg:text-text-tertiary mb-6">
                      Set up your name, password, and account type
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <FormField label="Full Name" error={fieldErrors.name} touched={touched.name} valid={!fieldErrors.name && !!form.name} errorId="signup-name-error" labelClassName="text-[#a1a1a1] lg:text-text-secondary">
                        <div className="relative">
                          <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666] lg:text-text-tertiary" />
                          <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            onBlur={() => { setTouched((p) => ({ ...p, name: true })); validateOnBlur("name"); }}
                            placeholder="John Doe"
                            className="auth-input pl-10"
                            autoComplete="name"
                            autoFocus
                            required
                            minLength={2}
                            disabled={isLoading}
                          />
                        </div>
                      </FormField>

                      <FormField label="Password" error={fieldErrors.password} touched={touched.password} valid={!fieldErrors.password && !!form.password} errorId="signup-password-error" labelClassName="text-[#a1a1a1] lg:text-text-secondary">
                        <div className="relative">
                          <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666] lg:text-text-tertiary" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            onBlur={() => { setTouched((p) => ({ ...p, password: true })); validateOnBlur("password"); }}
                            placeholder="Min 8 characters"
                            className="auth-input pl-10 pr-10"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white/70 lg:text-text-tertiary lg:hover:text-text-secondary transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <PasswordStrengthMeter password={form.password} />
                      </FormField>

                      <div>
                        <label className="auth-label">I want to</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: "FOLLOWER", label: "Copy Trades", desc: "Follow top traders" },
                            { value: "MASTER_TRADER", label: "Share Signals", desc: "Become a trader" },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setForm({ ...form, role: option.value })}
                              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                                form.role === option.value
                                  ? "border-brand bg-brand/[0.06] shadow-[0_0_16px_rgba(41,98,255,0.1)] lg:bg-brand/5"
                                  : "border-[#222] bg-[#0a0a0a] hover:bg-[#111] hover:border-[#333] lg:border-border lg:bg-surface-0 lg:hover:bg-surface-2 lg:hover:border-border-light"
                              }`}
                            >
                              <p className={`text-sm font-medium ${form.role === option.value ? "text-brand" : "text-[#ccc] lg:text-text-primary"}`}>
                                {option.label}
                              </p>
                              <p className="text-2xs text-[#888] lg:text-text-tertiary mt-0.5">{option.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <motion.button
                        type="submit"
                        disabled={isLoading}
                        whileTap={{ scale: 0.97 }}
                        className="auth-btn"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            Create Account
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </motion.button>
                    </form>

                    <p className="text-sm text-[#a1a1a1] lg:text-text-tertiary text-center mt-5">
                      Already have an account?{" "}
                      <Link href="/login" className="text-brand hover:text-brand-light transition-colors font-medium">
                        Sign in
                      </Link>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
          </div>
        </motion.div>

        <div className="lg:hidden h-8" />
      </div>
    </div>
  );
}
