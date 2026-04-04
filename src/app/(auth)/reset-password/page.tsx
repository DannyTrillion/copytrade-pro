"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { FormField, PasswordStrengthMeter } from "@/components/ui/form-field";
import {
  validateField,
  emailSchema,
  passwordSchema,
} from "@/lib/validation";

const ease = [0.22, 1, 0.36, 1] as const;

type Step = "request" | "reset" | "success";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--color-auth-bg)] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-brand" />
        </div>
        <span className="text-sm text-[#a1a1a1] lg:text-white/40">Loading...</span>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  const [step, setStep] = useState<Step>(tokenFromUrl ? "reset" : "request");
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(
    tokenFromUrl ? null : true,
  );

  // Request step state
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  // Reset step state
  const [token, setToken] = useState(tokenFromUrl ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);

  useEffect(() => {
    if (!requestSent) return;
    setResendCountdown(60);
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [requestSent]);

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      setStep("reset");
      setTokenValid(null);

      fetch(`/api/auth/reset-password?token=${encodeURIComponent(tokenFromUrl)}`)
        .then((res) => res.json())
        .then((data) => {
          setTokenValid(data.valid === true);
        })
        .catch(() => {
          setTokenValid(false);
        });
    }
  }, [tokenFromUrl]);

  /* ─── Request Reset ─── */
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateField(emailSchema, email);
    if (error) {
      setEmailError(error);
      setEmailTouched(true);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong");
        return;
      }

      setRequestSent(true);
      toast.success("Check your email for the reset link");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ─── Perform Reset ─── */
  const handlePerformReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const pwError = validateField(passwordSchema, password);
    if (pwError) {
      setPasswordError(pwError);
      setPasswordTouched(true);
      return;
    }

    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong");
        return;
      }

      setStep("success");
      toast.success("Password reset successfully");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ─── Render ─── */
  return (
    <div className="min-h-screen bg-[var(--color-auth-bg)] flex relative overflow-hidden">
      {/* Mobile solid dark background */}
      <div className="absolute inset-0 bg-black lg:hidden pointer-events-none" />

      {/* Desktop left panel */}
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
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center shadow-glow">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">
                CopyTrade Pro
              </span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Reset Your
              <br />
              <span className="text-gradient">Password</span>
            </h1>
            <p className="text-lg text-white/60 max-w-md">
              Secure your account by setting a new password. We will send you a
              reset link to verify your identity.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right panel / Form */}
      <div className="relative z-10 w-full lg:w-1/2 flex flex-col items-center justify-center px-5 py-8 lg:px-12 lg:bg-[#080A12]">
        {/* Desktop gradient decoration */}
        <div className="absolute inset-0 hidden lg:block pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_rgba(41,98,255,0.04),transparent_70%)]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="w-full max-w-[400px] relative z-10"
        >
          {/* Mobile branding */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="lg:hidden flex flex-col items-center mb-8"
          >
            <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center shadow-glow mb-3">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              CopyTrade Pro
            </span>
            <span className="text-xs text-[#888] mt-1">
              Professional Copy Trading Platform
            </span>
          </motion.div>

          {/* Glass card wrapper */}
          <div className="auth-card">

              {/* Step indicator */}
              {(() => {
                const currentStepNumber =
                  step === "success" ? 3 :
                  step === "reset" ? 2 :
                  requestSent ? 2 : 1;
                return (
                  <div className="flex items-center justify-center gap-1 mb-8">
                    {[1, 2, 3].map((s) => (
                      <div key={s} className="flex items-center gap-1">
                        <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          currentStepNumber >= s
                            ? "bg-brand shadow-[0_0_8px_rgba(41,98,255,0.3)]"
                            : "bg-[#1a1a1a] lg:bg-white/[0.04]"
                        }`} />
                        {s < 3 && <div className={`w-10 h-0.5 rounded-full transition-colors duration-300 ${
                          currentStepNumber > s ? "bg-brand" : "bg-[#222] lg:bg-[#1e1e2a]"
                        }`} />}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ─── STEP: Request Reset ─── */}
              {step === "request" && !requestSent && (
                <motion.div
                  key="request"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound className="w-5 h-5 text-brand" />
                    <h2 className="text-2xl font-bold text-white lg:text-white">
                      Forgot password?
                    </h2>
                  </div>
                  <p className="text-sm text-[#a1a1a1] lg:text-white/40 mb-6">
                    Enter your email and we will send you a reset link
                  </p>

                  <form onSubmit={handleRequestReset} className="space-y-5">
                    <FormField
                      label="Email"
                      error={emailError}
                      touched={emailTouched}
                      valid={!emailError && !!email}
                      errorId="reset-email-error"
                      labelClassName="text-[#a1a1a1] lg:text-white/50"
                    >
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666] lg:text-white/40" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => {
                            setEmailTouched(true);
                            const err = validateField(emailSchema, email);
                            setEmailError(err || "");
                          }}
                          placeholder="trader@example.com"
                          className="auth-input pl-10"
                          autoComplete="email"
                          required
                          aria-required="true"
                          aria-invalid={!!emailError}
                          aria-describedby={emailError ? "reset-email-error" : undefined}
                        />
                      </div>
                    </FormField>

                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileTap={{ scale: 0.97 }}
                      className="auth-btn"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Send Reset Link
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </form>

                  <p className="text-sm text-[#888] lg:text-white/40 text-center mt-6">
                    <Link
                      href="/login"
                      className="text-brand hover:text-brand-light transition-colors font-medium inline-flex items-center gap-1 min-h-[44px] py-2 -my-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to login
                    </Link>
                  </p>
                </motion.div>
              )}

              {/* ─── STEP: Email Sent Confirmation ─── */}
              {step === "request" && requestSent && (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 shadow-[0_0_24px_rgba(41,98,255,0.15)] flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-brand" />
                  </div>
                  <h2 className="text-2xl font-bold text-white lg:text-white mb-2">
                    Check your email
                  </h2>
                  <p className="text-sm text-[#888] lg:text-white/40 mb-6">
                    If an account exists for{" "}
                    <span className="text-[#a1a1a1] lg:text-white/50 font-medium">
                      {email}
                    </span>
                    , we sent a password reset link. Check your inbox and spam
                    folder.
                  </p>

                  {resendCountdown > 0 ? (
                    <span className="text-sm text-[#888] lg:text-white/40/50 cursor-not-allowed tabular-nums">
                      Resend in {resendCountdown}s
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        setResendCountdown(60);
                        setIsLoading(true);
                        try {
                          const res = await fetch("/api/auth/reset-password", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: email.toLowerCase().trim() }),
                          });
                          const data = await res.json();
                          if (!res.ok) {
                            toast.error(data.error ?? "Something went wrong");
                            setResendCountdown(0);
                            return;
                          }
                          toast.success("Reset link resent — check your inbox");
                        } catch {
                          toast.error("Network error. Please try again.");
                          setResendCountdown(0);
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="text-sm text-[#a1a1a1] lg:text-white/40 hover:text-white lg:hover:text-text-primary cursor-pointer transition-colors"
                    >
                      Resend email
                    </button>
                  )}

                  <p className="text-sm text-[#a1a1a1] lg:text-white/40 text-center mt-4">
                    <Link
                      href="/login"
                      className="text-brand hover:text-brand-light transition-colors font-medium inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to login
                    </Link>
                  </p>
                </motion.div>
              )}

              {/* ─── STEP: Reset Password — Verifying Token ─── */}
              {step === "reset" && tokenValid === null && (
                <motion.div
                  key="verifying"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-8"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-brand mx-auto mb-4" />
                  <h2 className="text-lg font-semibold text-white lg:text-white mb-1">
                    Verifying link...
                  </h2>
                  <p className="text-sm text-[#888] lg:text-white/40">
                    Please wait while we validate your reset link.
                  </p>
                </motion.div>
              )}

              {/* ─── STEP: Reset Password — Token Invalid / Expired ─── */}
              {step === "reset" && tokenValid === false && (
                <motion.div
                  key="expired"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 shadow-[0_0_24px_rgba(239,68,68,0.15)] flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-7 h-7 text-danger" />
                  </div>
                  <h2 className="text-2xl font-bold text-white lg:text-white mb-2">
                    Link Expired
                  </h2>
                  <p className="text-sm text-[#888] lg:text-white/40 mb-6">
                    This password reset link is invalid or has expired.
                  </p>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setStep("request");
                      setTokenValid(true);
                      setToken("");
                      setPassword("");
                      setConfirmPassword("");
                      setPasswordTouched(false);
                      setPasswordError("");
                      setConfirmError("");
                    }}
                    className="auth-btn"
                  >
                    Request New Link
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>

                  <p className="text-sm text-[#a1a1a1] lg:text-white/40 text-center mt-4">
                    <Link
                      href="/login"
                      className="text-brand hover:text-brand-light transition-colors font-medium inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to login
                    </Link>
                  </p>
                </motion.div>
              )}

              {/* ─── STEP: Reset Password — Token Valid ─── */}
              {step === "reset" && tokenValid === true && (
                <motion.div
                  key="reset"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-5 h-5 text-brand" />
                    <h2 className="text-2xl font-bold text-white lg:text-white">
                      Set new password
                    </h2>
                  </div>
                  <p className="text-sm text-[#a1a1a1] lg:text-white/40 mb-6">
                    Choose a strong password for your account
                  </p>

                  <form onSubmit={handlePerformReset} className="space-y-5">
                    <FormField
                      label="New Password"
                      error={passwordError}
                      touched={passwordTouched}
                      valid={!passwordError && !!password}
                      errorId="reset-password-error"
                      labelClassName="text-[#a1a1a1] lg:text-white/50"
                    >
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666] lg:text-white/40" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => {
                            setPasswordTouched(true);
                            const err = validateField(
                              passwordSchema,
                              password,
                            );
                            setPasswordError(err || "");
                          }}
                          placeholder="Enter new password"
                          className="auth-input pl-10 pr-10"
                          autoComplete="new-password"
                          required
                          aria-required="true"
                          aria-invalid={!!passwordError}
                          aria-describedby={passwordError ? "reset-password-error" : undefined}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white/70 lg:text-white/40 lg:hover:text-white/60 transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormField>

                    <PasswordStrengthMeter password={password} />

                    <div>
                      <label className="auth-label">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666] lg:text-white/40" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (confirmError) setConfirmError("");
                          }}
                          onBlur={() => {
                            if (
                              confirmPassword &&
                              password !== confirmPassword
                            ) {
                              setConfirmError("Passwords do not match");
                            }
                          }}
                          placeholder="Confirm new password"
                          className={`auth-input pl-10 pr-10 ${
                            confirmError ? "!border-danger" : ""
                          }`}
                          autoComplete="new-password"
                          required
                          aria-required="true"
                          aria-invalid={!!confirmError}
                          aria-describedby={confirmError ? "reset-confirm-error" : undefined}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-white/70 lg:text-white/40 lg:hover:text-white/60 transition-colors"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmError && (
                        <motion.p
                          id="reset-confirm-error"
                          role="alert"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-1 text-2xs text-danger mt-1.5"
                        >
                          {confirmError}
                        </motion.p>
                      )}
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileTap={{ scale: 0.97 }}
                      className="auth-btn"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Reset Password
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </form>

                  <p className="text-sm text-[#888] lg:text-white/40 text-center mt-6">
                    <Link
                      href="/login"
                      className="text-brand hover:text-brand-light transition-colors font-medium inline-flex items-center gap-1 min-h-[44px] py-2 -my-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to login
                    </Link>
                  </p>
                </motion.div>
              )}

              {/* ─── STEP: Success ─── */}
              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease }}
                  className="text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-success/10 border border-success/20 shadow-[0_0_24px_rgba(38,166,154,0.15)] flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-success" />
                  </div>
                  <h2 className="text-2xl font-bold text-white lg:text-white mb-2">
                    Password updated
                  </h2>
                  <p className="text-sm text-[#888] lg:text-white/40 mb-6">
                    Your password has been reset successfully. You can now sign
                    in with your new password.
                  </p>

                  <Link href="/login">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      className="auth-btn"
                    >
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </Link>
                </motion.div>
              )}
          </div>
        </motion.div>

        <div className="lg:hidden h-4" />
      </div>
    </div>
  );
}
