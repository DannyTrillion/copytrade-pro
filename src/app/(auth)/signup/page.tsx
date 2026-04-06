"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { FloatingParticles } from "@/components/ui/floating-particles";
import { toast } from "@/components/ui/toast";
import { FormField, PasswordStrengthMeter } from "@/components/ui/form-field";
import { validateField, emailSchema, passwordSchema, nameSchema } from "@/lib/validation";

const ease = [0.22, 1, 0.36, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease } },
};

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
  const [form, setForm] = useState({ name: "", password: "" });
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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch {
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  }, [email]);

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

      setStep("details");
    } catch {
      setOtpError("Something went wrong. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  }, [email]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];

    if (value.length > 1) {
      const pasted = value.slice(0, 6).split("");
      pasted.forEach((d, i) => {
        if (index + i < 6) newDigits[index + i] = d;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(index + pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();

      const fullCode = newDigits.join("");
      if (fullCode.length === 6) handleVerifyOtp(fullCode);
      return;
    }

    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 5) inputRefs.current[index + 1]?.focus();

    const fullCode = newDigits.join("");
    if (fullCode.length === 6) handleVerifyOtp(fullCode);
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

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

      router.push("/dashboard/follower");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
      setIsLoading(false);
    }
  };

  const steps: { key: Step; label: string }[] = [
    { key: "email", label: "Email" },
    { key: "otp", label: "Verify" },
    { key: "details", label: "Details" },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">

      {/* Floating particles */}
      <FloatingParticles count={60} />

      {/* Dramatic silk/light gradient background — Resend-style */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-[30%] -right-[10%] w-[70%] h-[80%] opacity-[0.15]"
          style={{
            background: "radial-gradient(ellipse at 60% 40%, rgba(180,190,210,0.6), rgba(120,130,150,0.2) 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[70%] opacity-[0.1]"
          style={{
            background: "radial-gradient(ellipse at 40% 60%, rgba(160,170,190,0.5), rgba(100,110,130,0.15) 40%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.04]"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.3), transparent 60%)" }}
        />
      </div>

      {/* Back to home */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="absolute top-6 left-6 z-20"
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-[440px] px-6 py-10"
      >
        {/* Logo */}
        <motion.div variants={fadeUp} className="flex flex-col items-center mb-10">
          <motion.div
            whileHover={{ scale: 1.08 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-5"
            style={{
              boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            <TrendingUp className="w-7 h-7 text-black" />
          </motion.div>
        </motion.div>

        {/* Step indicator — minimal dots */}
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 mb-10">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  animate={{
                    scale: i === currentStepIndex ? 1 : 0.85,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                    i < currentStepIndex
                      ? "bg-white text-black"
                      : i === currentStepIndex
                      ? "text-white"
                      : "text-white/25"
                  }`}
                  style={{
                    boxShadow: i <= currentStepIndex
                      ? "0 0 0 1px rgba(255,255,255,0.2)"
                      : "0 0 0 1px rgba(255,255,255,0.06)",
                  }}
                >
                  {i < currentStepIndex ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    i + 1
                  )}
                </motion.div>
                <span className={`text-[10px] font-medium transition-colors duration-300 ${
                  i <= currentStepIndex ? "text-white/50" : "text-white/20"
                }`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <motion.div
                  animate={{
                    background: i < currentStepIndex
                      ? "rgba(255,255,255,0.4)"
                      : "rgba(255,255,255,0.06)",
                  }}
                  transition={{ duration: 0.5 }}
                  className="w-12 h-px mb-5"
                />
              )}
            </div>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Step 1: Email */}
          {step === "email" && (
            <motion.div
              key="email-step"
              initial={{ opacity: 0, x: 24, filter: "blur(6px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -24, filter: "blur(6px)" }}
              transition={{ duration: 0.35, ease }}
            >
              <motion.div variants={stagger} initial="hidden" animate="show">
                <motion.div variants={fadeUp} className="text-center mb-8">
                  <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight">
                    Create your account
                  </h1>
                  <p className="text-sm text-white/40 mt-2">
                    Already have an account?{" "}
                    <Link href="/login" className="text-white/80 hover:text-white transition-colors font-medium">
                      Sign in
                    </Link>
                    .
                  </p>
                </motion.div>

                {/* Google OAuth */}
                <motion.div variants={fadeUp}>
                  <motion.button
                    type="button"
                    disabled={isGoogleLoading}
                    onClick={() => {
                      setIsGoogleLoading(true);
                      signIn("google", { callbackUrl: "/dashboard" });
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="auth-btn-google"
                  >
                    {isGoogleLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <GoogleIcon className="w-5 h-5" />
                        Sign up with Google
                      </>
                    )}
                  </motion.button>
                </motion.div>

                <motion.div variants={fadeUp} className="flex items-center gap-4 my-7">
                  <div className="flex-1 h-px bg-white/[0.08]" />
                  <span className="text-xs text-white/25 lowercase">or</span>
                  <div className="flex-1 h-px bg-white/[0.08]" />
                </motion.div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendOtp();
                  }}
                  className="space-y-5"
                >
                  <motion.div variants={fadeUp}>
                    <FormField label="Email" error={emailError} touched={!!emailError} valid={false} errorId="signup-email-error" labelClassName="text-white/40">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError("");
                        }}
                        placeholder="alan.turing@example.com"
                        className="auth-input"
                        autoComplete="email"
                        autoFocus
                        required
                        disabled={sendingOtp}
                      />
                    </FormField>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <motion.button
                      type="submit"
                      disabled={sendingOtp || !email.trim()}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
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
                  </motion.div>
                </form>

                <motion.p variants={fadeUp} className="text-2xs text-white/20 text-center mt-6">
                  By signing up, you agree to our{" "}
                  <a href="/terms" className="text-white/30 hover:text-white/50 transition-colors underline">Terms</a>
                  {" "}and{" "}
                  <a href="/privacy" className="text-white/30 hover:text-white/50 transition-colors underline">Privacy Policy</a>.
                </motion.p>
              </motion.div>
            </motion.div>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, x: 24, filter: "blur(6px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -24, filter: "blur(6px)" }}
              transition={{ duration: 0.35, ease }}
            >
              <motion.div variants={stagger} initial="hidden" animate="show">
                <motion.div variants={fadeUp}>
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors mb-6"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                </motion.div>

                <motion.div variants={fadeUp} className="text-center mb-8">
                  <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight">
                    Check your email
                  </h1>
                  <p className="text-sm text-white/40 mt-2">
                    We sent a 6-digit code to{" "}
                    <span className="text-white/60 font-medium">{email}</span>
                  </p>
                </motion.div>

                {/* OTP inputs */}
                <motion.div variants={fadeUp} className="flex items-center justify-center gap-2.5 mb-5">
                  {otpDigits.map((digit, i) => (
                    <motion.input
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15 + i * 0.05, duration: 0.3, ease }}
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
                      className={`w-[52px] h-[60px] text-center text-2xl font-semibold rounded-2xl outline-none transition-all duration-200
                        ${
                          otpError
                            ? "text-red-400"
                            : digit
                            ? "text-white"
                            : "text-white"
                        }
                        disabled:opacity-50
                      `}
                      style={{
                        background: "transparent",
                        boxShadow: otpError
                          ? "0 0 0 1px rgba(239,68,68,0.4)"
                          : digit
                          ? "0 0 0 1px rgba(255,255,255,0.3), 0 0 0 4px rgba(255,255,255,0.04)"
                          : "0 0 0 1px rgba(255,255,255,0.12)",
                      }}
                      onFocus={(e) => {
                        (e.target as HTMLInputElement).style.boxShadow = "0 0 0 1px rgba(255,255,255,0.4), 0 0 0 4px rgba(255,255,255,0.06)";
                      }}
                      onBlur={(e) => {
                        const d = (e.target as HTMLInputElement).value;
                        (e.target as HTMLInputElement).style.boxShadow = d
                          ? "0 0 0 1px rgba(255,255,255,0.3), 0 0 0 4px rgba(255,255,255,0.04)"
                          : "0 0 0 1px rgba(255,255,255,0.12)";
                      }}
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </motion.div>

                {otpError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-400 text-center mb-4"
                  >
                    {otpError}
                  </motion.p>
                )}

                {verifyingOtp && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2 mb-4"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                    <span className="text-sm text-white/40">Verifying...</span>
                  </motion.div>
                )}

                <motion.div variants={fadeUp} className="text-center">
                  <p className="text-sm text-white/40">
                    Didn&apos;t receive the code?{" "}
                    {resendCooldown > 0 ? (
                      <span className="text-white/50 tabular-nums">
                        Resend in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingOtp}
                        className="text-white/80 hover:text-white transition-colors font-medium"
                      >
                        Resend code
                      </button>
                    )}
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {/* Step 3: Details */}
          {step === "details" && (
            <motion.div
              key="details-step"
              initial={{ opacity: 0, x: 24, filter: "blur(6px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -24, filter: "blur(6px)" }}
              transition={{ duration: 0.35, ease }}
            >
              <motion.div variants={stagger} initial="hidden" animate="show">
                <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 mb-5">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}
                  >
                    <CheckCircle2 className="w-3 h-3 text-white/60" />
                    <span className="text-xs font-medium text-white/60">{email}</span>
                  </div>
                </motion.div>

                <motion.div variants={fadeUp} className="text-center mb-8">
                  <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight">
                    Complete your profile
                  </h1>
                  <p className="text-sm text-white/40 mt-2">
                    Set up your name, password, and account type
                  </p>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <motion.div variants={fadeUp}>
                    <FormField label="Full Name" error={fieldErrors.name} touched={touched.name} valid={!fieldErrors.name && !!form.name} errorId="signup-name-error" labelClassName="text-white/40">
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        onBlur={() => { setTouched((p) => ({ ...p, name: true })); validateOnBlur("name"); }}
                        placeholder="John Doe"
                        className="auth-input"
                        autoComplete="name"
                        autoFocus
                        required
                        minLength={2}
                        disabled={isLoading}
                      />
                    </FormField>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <FormField label="Password" error={fieldErrors.password} touched={touched.password} valid={!fieldErrors.password && !!form.password} errorId="signup-password-error" labelClassName="text-white/40">
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          onBlur={() => { setTouched((p) => ({ ...p, password: true })); validateOnBlur("password"); }}
                          placeholder="Min 8 characters"
                          className="auth-input pr-11"
                          autoComplete="new-password"
                          required
                          minLength={8}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors p-1"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <PasswordStrengthMeter password={form.password} />
                    </FormField>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
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
                  </motion.div>
                </form>

                <motion.p variants={fadeUp} className="text-sm text-white/40 text-center mt-6">
                  Already have an account?{" "}
                  <Link href="/login" className="text-white/80 hover:text-white transition-colors font-medium">
                    Sign in
                  </Link>
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
