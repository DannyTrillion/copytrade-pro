"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  Users,
  Upload,
  Copy,
  Check,
  User,
} from "lucide-react";

const TOTAL_STEPS = 4;

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

interface TraderProfile {
  traderId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
}

export function TraderOnboardingModal() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [completing, setCompleting] = useState(false);

  // Profile form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [traderId, setTraderId] = useState("");
  const [copied, setCopied] = useState(false);

  // Check onboarding status + fetch trader profile
  useEffect(() => {
    const init = async () => {
      try {
        const [onboardingRes, profileRes] = await Promise.all([
          fetch("/api/user/onboarding"),
          fetch("/api/trader/profile"),
        ]);

        if (onboardingRes.ok) {
          const onboardingData = await onboardingRes.json();

          // Only show for MASTER_TRADER who hasn't completed onboarding
          if (
            onboardingData.role !== "MASTER_TRADER" ||
            onboardingData.onboardingComplete
          ) {
            setLoading(false);
            return;
          }
        } else {
          setLoading(false);
          return;
        }

        if (profileRes.ok) {
          const profileData: TraderProfile = await profileRes.json();
          setTraderId(profileData.traderId || "");
          setDisplayName(profileData.displayName || "");
          setBio(profileData.bio || "");
        }

        setIsOpen(true);
      } catch {
        // Silently fail — onboarding check is non-critical
      } finally {
        setLoading(false);
      }
    };

    init();
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
      // Continue closing even if the API call fails
    } finally {
      setCompleting(false);
      setIsOpen(false);
    }
  }, []);

  const dismiss = useCallback(async () => {
    try {
      await fetch("/api/user/onboarding", { method: "POST" });
    } catch {
      // Non-critical
    }
    setIsOpen(false);
  }, []);

  const copyTraderId = useCallback(() => {
    if (!traderId) return;
    navigator.clipboard.writeText(traderId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [traderId]);

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
            <div className="relative h-[400px] sm:h-[380px] overflow-hidden">
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
                  {step === 0 && (
                    <StepProfileSetup
                      displayName={displayName}
                      setDisplayName={setDisplayName}
                      bio={bio}
                      setBio={setBio}
                      sessionName={session?.user?.name || ""}
                    />
                  )}
                  {step === 1 && (
                    <StepTraderId
                      traderId={traderId}
                      copied={copied}
                      onCopy={copyTraderId}
                    />
                  )}
                  {step === 2 && <StepManageFollowers />}
                  {step === 3 && <StepUploadTrades />}
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
                    {completing ? "Saving..." : "Complete Setup"}
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

function StepProfileSetup({
  displayName,
  setDisplayName,
  bio,
  setBio,
  sessionName,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  sessionName: string;
}) {
  const initials = (displayName || sessionName || "T")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
          Welcome, Trader
        </h2>
        <p className="text-text-secondary mt-1 max-w-sm leading-relaxed text-sm">
          Set up your public trader profile. Followers will see your name and
          bio when browsing traders.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-3 mt-1">
        {/* Avatar preview */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-surface-3 border border-border-primary
                          flex items-center justify-center text-lg font-semibold text-text-primary">
            {initials}
          </div>
        </div>

        {/* Display name input */}
        <div className="text-left">
          <label className="text-xs text-text-tertiary mb-1 block">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your trader name"
            className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border-primary
                       text-sm text-text-primary placeholder:text-text-tertiary
                       focus:outline-none focus:ring-1 focus:ring-brand/50 focus:border-brand/50
                       transition-colors"
          />
        </div>

        {/* Bio input */}
        <div className="text-left">
          <label className="text-xs text-text-tertiary mb-1 block">
            Short Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="e.g. Swing trader focused on BTC & ETH"
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border-primary
                       text-sm text-text-primary placeholder:text-text-tertiary resize-none
                       focus:outline-none focus:ring-1 focus:ring-brand/50 focus:border-brand/50
                       transition-colors"
          />
        </div>
      </div>
    </div>
  );
}

function StepTraderId({
  traderId,
  copied,
  onCopy,
}: {
  traderId: string;
  copied: boolean;
  onCopy: () => void;
}) {
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
          Your Trader ID
        </h2>
        <p className="text-text-secondary mt-2 max-w-sm leading-relaxed text-sm">
          Share this unique ID with potential followers. They can use it to find
          your profile and request to copy your trades.
        </p>
      </div>

      {/* Trader ID card */}
      <div className="w-full max-w-xs">
        <div
          className="flex items-center gap-2 p-3 rounded-xl bg-surface-2 border border-border-primary"
        >
          <div className="flex-1 text-left">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium mb-0.5">
              Trader ID
            </p>
            <p className="text-sm font-mono font-semibold text-text-primary truncate">
              {traderId || "Loading..."}
            </p>
          </div>
          <button
            onClick={onCopy}
            disabled={!traderId}
            className="p-2 rounded-lg bg-surface-3 hover:bg-brand/10
                       text-text-secondary hover:text-brand transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Copy trader ID"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {copied && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-success mt-2"
          >
            Copied to clipboard
          </motion.p>
        )}
      </div>

      <p className="text-xs text-text-tertiary max-w-xs">
        Your Trader ID is permanent and cannot be changed. You can find it
        anytime on your profile page.
      </p>
    </div>
  );
}

function StepManageFollowers() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full gap-5">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center"
      >
        <Users className="w-8 h-8 text-brand" />
      </motion.div>

      <div>
        <h2 className="text-xl font-bold text-text-primary">
          Managing Followers
        </h2>
        <p className="text-text-secondary mt-2 max-w-sm leading-relaxed text-sm">
          When users request to follow you, you can approve or decline them from
          your Followers page. Approved followers will automatically mirror your
          trades.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
        {[
          {
            icon: User,
            title: "Review Requests",
            desc: "Approve or decline incoming follower requests",
          },
          {
            icon: Shield,
            title: "Full Control",
            desc: "Remove followers or pause copy trading anytime",
          },
          {
            icon: Users,
            title: "Track Performance",
            desc: "See how your followers are performing",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-3 p-3 rounded-xl bg-surface-2 text-left"
          >
            <div className="p-1.5 rounded-lg bg-brand/10 mt-0.5">
              <Icon className="w-3.5 h-3.5 text-brand" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{title}</p>
              <p className="text-xs text-text-tertiary">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <a
        href="/dashboard/followers"
        className="text-xs text-brand hover:text-brand/80 transition-colors flex items-center gap-1"
      >
        Go to Followers Page
        <ArrowRight className="w-3 h-3" />
      </a>
    </div>
  );
}

function StepUploadTrades() {
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
          <Upload className="w-10 h-10 text-success" />
        </motion.div>
      </motion.div>

      <div>
        <h2 className="text-xl font-bold text-text-primary">
          Upload Your Trades
        </h2>
        <p className="text-text-secondary mt-2 max-w-sm leading-relaxed text-sm">
          Import your trading history to build your public track record.
          Followers evaluate traders based on verified performance data.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
        {[
          {
            icon: Upload,
            title: "Import History",
            desc: "Upload CSV or connect your exchange for auto-sync",
          },
          {
            icon: CheckCircle2,
            title: "Build Credibility",
            desc: "Verified trade history attracts more followers",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-3 p-3 rounded-xl bg-surface-2 text-left"
          >
            <div className="p-1.5 rounded-lg bg-success/10 mt-0.5">
              <Icon className="w-3.5 h-3.5 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{title}</p>
              <p className="text-xs text-text-tertiary">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <a
        href="/dashboard/upload"
        className="btn-primary text-sm gap-2 inline-flex"
      >
        <Upload className="w-4 h-4" />
        Go to Upload Page
      </a>

      <p className="text-xs text-text-tertiary">
        You can upload trades anytime from your dashboard.
      </p>
    </div>
  );
}
