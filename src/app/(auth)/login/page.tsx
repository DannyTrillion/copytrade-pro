"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, ArrowRight, ShieldCheck, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";
import { FloatingParticles } from "@/components/ui/floating-particles";
import { toast } from "@/components/ui/toast";
import { FormField } from "@/components/ui/form-field";
import { validateField, emailSchema } from "@/lib/validation";

const ease = [0.22, 1, 0.36, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease } },
};

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

function LoginPageInner() {
  const router = useRouter();
  useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showVerifiedBanner] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("verified") === "true";
    }
    return false;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      twoFactorCode: requires2FA ? twoFactorCode : undefined,
      redirect: false,
    });

    if (result?.error) {
      if (result.error.includes("2FA_REQUIRED")) {
        setRequires2FA(true);
        setTwoFactorCode("");
        setIsLoading(false);
        return;
      }

      if (result.error.includes("Invalid 2FA code")) {
        toast.error("Invalid 2FA code. Please try again.");
        setTwoFactorCode("");
      } else {
        toast.error("Invalid email or password");
      }
      setIsLoading(false);
    } else {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        const role = session?.user?.role;
        if (role === "MASTER_TRADER") {
          router.push("/dashboard/trader");
        } else if (role === "FOLLOWER") {
          router.push("/dashboard/follower");
        } else {
          router.push("/dashboard");
        }
      } catch {
        router.push("/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">

      {/* Floating particles */}
      <FloatingParticles count={60} />

      {/* Dramatic silk/light gradient background — Resend-style */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top-right silk light */}
        <div
          className="absolute -top-[30%] -right-[10%] w-[70%] h-[80%] opacity-[0.15]"
          style={{
            background: "radial-gradient(ellipse at 60% 40%, rgba(180,190,210,0.6), rgba(120,130,150,0.2) 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* Bottom-left silk light */}
        <div
          className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[70%] opacity-[0.1]"
          style={{
            background: "radial-gradient(ellipse at 40% 60%, rgba(160,170,190,0.5), rgba(100,110,130,0.15) 40%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        {/* Center subtle glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.04]"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.3), transparent 60%)",
          }}
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
        className="relative z-10 w-full max-w-[440px] px-6"
      >
        {/* Logo */}
        <motion.div variants={fadeUp} className="flex flex-col items-center mb-12">
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

        {/* Heading */}
        <motion.div variants={fadeUp} className="text-center mb-8">
          <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight">
            Log in to CopyTrade Pro
          </h1>
          <p className="text-sm text-white/40 mt-2">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-white/80 hover:text-white transition-colors font-medium">
              Sign up
            </Link>
            .
          </p>
        </motion.div>

        {/* Email verified success banner */}
        {showVerifiedBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 mb-6 rounded-2xl"
            style={{ boxShadow: "0 0 0 1px rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.06)" }}
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300">Email verified! You can now log in.</p>
          </motion.div>
        )}

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
                Log in with Google
              </>
            )}
          </motion.button>
        </motion.div>

        <motion.div variants={fadeUp} className="flex items-center gap-4 my-7">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="text-xs text-white/25 lowercase">or</span>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <motion.div variants={fadeUp}>
            <FormField label="Email" error={emailError} touched={emailTouched} valid={!emailError && !!email} errorId="login-email-error" labelClassName="text-white/40">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => {
                  setEmailTouched(true);
                  const error = validateField(emailSchema, email);
                  setEmailError(error || "");
                }}
                placeholder="alan.turing@example.com"
                className="auth-input"
                autoComplete="email"
                required
                aria-required="true"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "login-email-error" : undefined}
              />
            </FormField>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-white/40 tracking-wide uppercase">Password</label>
              {!requires2FA && (
                <Link
                  href="/reset-password"
                  className="text-xs text-white/40 hover:text-white/70 transition-colors font-medium"
                >
                  Forgot your password?
                </Link>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="auth-input pr-11"
                autoComplete="current-password"
                required
                aria-required="true"
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
          </motion.div>

          {/* 2FA Code Input */}
          {requires2FA && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="flex gap-2.5 items-center p-3.5 mb-4 rounded-2xl"
                style={{ boxShadow: "0 0 0 1px rgba(41,98,255,0.15)", background: "rgba(41,98,255,0.04)" }}
              >
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <p className="text-xs text-white/50">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={twoFactorCode}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setTwoFactorCode(cleaned);
                }}
                placeholder="000000"
                maxLength={6}
                className="auth-input text-center font-mono text-lg tracking-[0.3em] placeholder:tracking-[0.3em]"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setTwoFactorCode("");
                }}
                className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors mt-3"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to login
              </button>
            </motion.div>
          )}

          <motion.div variants={fadeUp}>
            <motion.button
              type="submit"
              disabled={isLoading || (requires2FA && twoFactorCode.length !== 6)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="auth-btn"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : requires2FA ? (
                <>
                  Verify & Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                "Log In"
              )}
            </motion.button>
          </motion.div>
        </form>

        {/* Bottom legal text */}
        <motion.p variants={fadeUp} className="text-2xs text-white/20 text-center mt-8">
          By signing in, you agree to our{" "}
          <a href="/terms" className="text-white/30 hover:text-white/50 transition-colors underline">Terms</a>
          {" "}and{" "}
          <a href="/privacy" className="text-white/30 hover:text-white/50 transition-colors underline">Privacy Policy</a>.
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
