"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { TrendingUp, Mail, Lock, ArrowRight, ShieldCheck, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { FormField } from "@/components/ui/form-field";
import { validateField, emailSchema } from "@/lib/validation";

const ease = [0.22, 1, 0.36, 1] as const;

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
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      // Check if the server requires a 2FA code
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
    <div className="min-h-screen bg-[var(--color-auth-bg)] flex relative overflow-hidden">

      {/* Mobile solid dark background */}
      <div className="absolute inset-0 bg-black lg:hidden pointer-events-none" />

      {/* ===== Desktop left panel — branding ===== */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/hero-space.webp"
            alt=""
            fill
            sizes="50vw"
            className="object-cover object-[30%_80%]"
            quality={90}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-auth-bg)]/40 via-transparent to-[var(--color-auth-bg)]/90" />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-auth-bg)]/60 via-transparent to-[var(--color-auth-bg)]/40" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(41,98,255,0.12),transparent_70%)]" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center shadow-glow">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">CopyTrade Pro</span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Professional Copy Trading
              <br />
              <span className="text-gradient">Made Simple</span>
            </h1>
            <p className="text-lg text-white/60 max-w-md">
              Follow top traders, copy their signals automatically, and execute trades on Polymarket with institutional-grade infrastructure.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-6">
              {[
                { label: "Active Traders", value: "48+" },
                { label: "Total Volume", value: "$2.8M" },
                { label: "Avg Win Rate", value: "68%" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/40 uppercase tracking-wider mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===== Right panel / Mobile — form ===== */}
      <div className="relative z-10 w-full lg:w-1/2 flex flex-col items-center justify-center px-5 py-8 lg:px-12" style={{ background: "#080A12" }}>

        {/* Decorative gradient background for desktop */}
        <div className="absolute inset-0 hidden lg:block pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_rgba(41,98,255,0.06),transparent_70%)]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,_rgba(38,166,154,0.04),transparent_70%)]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile branding header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="lg:hidden flex flex-col items-center mb-8"
          >
            <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center shadow-glow mb-3">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <span className="text-xl font-bold text-white">CopyTrade Pro</span>
            <span className="text-xs text-[#888] mt-1">Professional Copy Trading Platform</span>
          </motion.div>

          {/* Card wrapper */}
          <div className="auth-card">

            <h2 className="text-2xl font-bold text-white lg:text-white mb-1">Welcome back</h2>
            <p className="text-sm text-[#a1a1a1] lg:text-white/40 mb-8">Sign in to your account</p>

            {/* Email verified success banner */}
            {showVerifiedBanner && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-300">Email verified! You can now log in.</p>
              </motion.div>
            )}

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
              <div className="flex-1 h-px bg-[#222] lg:bg-[#1e1e2a]" />
              <span className="text-xs text-[#a1a1a1] lg:text-white/40 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-[#222] lg:bg-[#1e1e2a]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Email" error={emailError} touched={emailTouched} valid={!emailError && !!email} errorId="login-email-error" labelClassName="text-[#a1a1a1] lg:text-white/50">
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666] lg:text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => {
                      setEmailTouched(true);
                      const error = validateField(emailSchema, email);
                      setEmailError(error || "");
                    }}
                    placeholder="trader@example.com"
                    className="auth-input pl-10"
                    autoComplete="email"
                    required
                    aria-required="true"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "login-email-error" : undefined}
                  />
                </div>
              </FormField>

              <div>
                <label className="auth-label">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666] lg:text-white/40" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="auth-input pl-10"
                    autoComplete="current-password"
                    required
                    aria-required="true"
                  />
                </div>
              </div>

              {!requires2FA && (
                <div className="flex justify-end -mt-1">
                  <Link
                    href="/reset-password"
                    className="text-sm text-[#a1a1a1] lg:text-white/40 hover:text-brand transition-colors inline-flex items-center min-h-[44px] py-2 -my-2"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              {/* 2FA Code Input */}
              {requires2FA && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="bg-brand/5 border border-brand/10 rounded-lg p-3 mb-3">
                    <div className="flex gap-2 items-center">
                      <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
                      <p className="text-xs text-[#a1a1a1] lg:text-white/50">
                        Enter the 6-digit code from your authenticator app
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666] lg:text-white/40" />
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
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRequires2FA(false);
                      setTwoFactorCode("");
                    }}
                    className="flex items-center gap-1 text-xs text-[#a1a1a1] lg:text-white/40 hover:text-brand transition-colors mt-2 min-h-[44px] py-2 -my-2"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back to login
                  </button>
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={isLoading || (requires2FA && twoFactorCode.length !== 6)}
                whileTap={{ scale: 0.97 }}
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
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            <p className="text-sm text-[#a1a1a1] lg:text-white/40 text-center mt-8">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-brand hover:text-brand-light transition-colors font-medium">
                Create one
              </Link>
            </p>

            {/* Trust signals */}
            <div className="flex items-center justify-center gap-6 mt-8 pt-5 border-t border-[#1a1a1a] lg:mt-10 lg:pt-6 lg:border-white/[0.06]">
              {[
                { icon: ShieldCheck, text: "256-bit encryption" },
                { icon: Lock, text: "SOC 2 compliant" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[#666] lg:text-white/30">
                  <item.icon className="w-3.5 h-3.5" />
                  <span className="text-xs">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Mobile bottom safe area spacer */}
        <div className="lg:hidden h-8" />
      </div>
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
