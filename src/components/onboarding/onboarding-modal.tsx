"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PiggyBank,
  X,
  Users,
  Settings,
  Link as LinkIcon,
} from "lucide-react";

const TOTAL_STEPS = 5;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const slideTransition = {
  x: { type: "spring", stiffness: 300, damping: 30 },
  opacity: { duration: 0.2 },
} as const;

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [completing, setCompleting] = useState(false);

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const res = await fetch("/api/user/onboarding");
        if (res.ok) {
          const data = await res.json();
          if (!data.onboardingComplete) {
            setIsOpen(true);
          }
        }
      } catch {
        // Silently fail — onboarding check is non-critical
      } finally {
        setLoading(false);
      }
    };
    checkOnboarding();
  }, []);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  const completeOnboarding = useCallback(async () => {
    setCompleting(true);
    try {
      await fetch("/api/user/onboarding", { method: "POST" });
    } catch {
      // Continue closing even if the API call fails — we'll catch it next time
    } finally {
      setCompleting(false);
      setIsOpen(false);
    }
  }, []);

  const dismiss = useCallback(async () => {
    // Mark complete on dismiss so it doesn't reappear
    try {
      await fetch("/api/user/onboarding", { method: "POST" });
    } catch {
      // Non-critical
    }
    setIsOpen(false);
  }, []);

  if (loading || !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-lg glass-panel rounded-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg
                         text-text-tertiary hover:text-text-primary
                         hover:bg-surface-3 transition-colors"
              aria-label="Close onboarding"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Progress bar */}
            <div className="px-8 pt-6">
              <div className="flex items-center gap-2">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-1 rounded-full overflow-hidden bg-surface-3"
                  >
                    <motion.div
                      className="h-full bg-brand rounded-full"
                      initial={false}
                      animate={{ width: i <= step ? "100%" : "0%" }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-tertiary mt-2">
                Step {step + 1} of {TOTAL_STEPS}
              </p>
            </div>

            {/* Step content */}
            <div className="relative h-[360px] sm:h-[340px] overflow-hidden">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTransition}
                  className="absolute inset-0 px-8 py-6 flex flex-col"
                >
                  {step === 0 && <StepWelcome />}
                  {step === 1 && <StepSetupAccount />}
                  {step === 2 && <StepDeposit />}
                  {step === 3 && <StepFindTrader />}
                  {step === 4 && <StepComplete />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="px-8 pb-6 flex items-center justify-between">
              <button
                onClick={goBack}
                disabled={step === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm
                           text-text-secondary hover:text-text-primary hover:bg-surface-3
                           transition-colors disabled:opacity-0 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <div className="flex items-center gap-2">
                {step > 0 && step < TOTAL_STEPS - 1 && (
                  <button
                    onClick={goNext}
                    className="px-3 py-2 rounded-lg text-sm text-text-tertiary
                               hover:text-text-secondary transition-colors"
                  >
                    Skip
                  </button>
                )}

                {step < TOTAL_STEPS - 1 ? (
                  <button onClick={goNext} className="btn-primary text-sm gap-1.5">
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={completeOnboarding}
                    disabled={completing}
                    className="btn-primary text-sm gap-1.5"
                  >
                    {completing ? "Saving..." : "Go to Dashboard"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────── Step Components ──────────────────────────── */

function StepWelcome() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full gap-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center"
      >
        <Sparkles className="w-8 h-8 text-brand" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold text-text-primary">
          Welcome to CopyTrade Pro
        </h2>
        <p className="text-text-secondary mt-2 max-w-sm leading-relaxed">
          The smartest way to trade. Follow top-performing traders and
          automatically mirror their strategies in real time.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full mt-2">
        {[
          { icon: Users, label: "Follow Traders" },
          { icon: TrendingUp, label: "Auto Copy" },
          { icon: PiggyBank, label: "Grow Wealth" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-surface-2"
          >
            <Icon className="w-5 h-5 text-brand" />
            <span className="text-xs text-text-secondary">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepSetupAccount() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full gap-5">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center"
      >
        <Shield className="w-8 h-8 text-brand" />
      </motion.div>

      <div>
        <h2 className="text-xl font-bold text-text-primary">
          Set Up Your Account
        </h2>
        <p className="text-text-secondary mt-2 max-w-sm leading-relaxed">
          Complete your account setup to unlock all features. Connect your
          wallet and configure your preferences from Settings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-xs mt-1">
        <a
          href="/dashboard/settings"
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors"
        >
          <Settings className="w-5 h-5 text-brand" />
          <span className="text-xs text-text-secondary">Settings</span>
        </a>
        <a
          href="/dashboard/follower"
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors"
        >
          <LinkIcon className="w-5 h-5 text-success" />
          <span className="text-xs text-text-secondary">Connect Wallet</span>
        </a>
      </div>

      <p className="text-xs text-text-tertiary">
        You can always do this later from your dashboard.
      </p>
    </div>
  );
}

function StepDeposit() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full gap-5">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center"
      >
        <PiggyBank className="w-8 h-8 text-success" />
      </motion.div>

      <div>
        <h2 className="text-xl font-bold text-text-primary">
          Fund Your Account
        </h2>
        <p className="text-text-secondary mt-2 max-w-sm leading-relaxed">
          Deposit funds to start copy trading. Higher deposits unlock better tiers
          with more daily trades and lower commissions.
        </p>
      </div>

      {/* Tier preview */}
      <div className="flex gap-2 w-full max-w-xs">
        {[
          { name: "Starter", amount: "$0+", trades: "1/day" },
          { name: "Growth", amount: "$3K+", trades: "5/day" },
          { name: "VIP", amount: "$10K+", trades: "Unlimited" },
        ].map((t) => (
          <div key={t.name} className="flex-1 p-2.5 rounded-xl bg-surface-2 text-center">
            <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide">{t.name}</p>
            <p className="text-xs font-bold text-text-primary mt-0.5">{t.amount}</p>
            <p className="text-[10px] text-text-tertiary">{t.trades}</p>
          </div>
        ))}
      </div>

      <a
        href="/dashboard/deposit"
        className="btn-primary text-sm gap-2 inline-flex"
      >
        <PiggyBank className="w-4 h-4" />
        Go to Deposits
      </a>

      <p className="text-xs text-text-tertiary">
        You can skip this step and deposit later.
      </p>
    </div>
  );
}

function StepFindTrader() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full gap-5">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center"
      >
        <TrendingUp className="w-8 h-8 text-brand" />
      </motion.div>

      <div>
        <h2 className="text-xl font-bold text-text-primary">
          Find a Trader to Copy
        </h2>
        <p className="text-text-secondary mt-2 max-w-sm leading-relaxed">
          Browse our marketplace of verified traders. Review their performance,
          win rate, and risk level -- then copy with one click.
        </p>
      </div>

      <a
        href="/dashboard/follower"
        className="btn-primary text-sm gap-2 inline-flex"
      >
        <Users className="w-4 h-4" />
        Browse Traders
      </a>

      <p className="text-xs text-text-tertiary">
        You can explore traders anytime from the Copy Trading page.
      </p>
    </div>
  );
}

function StepComplete() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full gap-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 12,
          delay: 0.1,
        }}
        className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.3,
          }}
        >
          <CheckCircle2 className="w-10 h-10 text-success" />
        </motion.div>
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold text-text-primary">
          You&apos;re All Set!
        </h2>
        <p className="text-text-secondary mt-2 max-w-sm leading-relaxed">
          Your account is ready. Head to your dashboard to explore features,
          track performance, and start copy trading.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full mt-2 max-w-xs">
        {[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Copy Trading", href: "/dashboard/follower" },
          { label: "Deposits", href: "/dashboard/deposit" },
          { label: "Settings", href: "/dashboard/settings" },
        ].map(({ label, href }) => (
          <a
            key={label}
            href={href}
            className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl
                       bg-surface-2 hover:bg-surface-3 transition-colors
                       text-sm text-text-secondary hover:text-text-primary"
          >
            {label}
            <ArrowRight className="w-3 h-3" />
          </a>
        ))}
      </div>
    </div>
  );
}
