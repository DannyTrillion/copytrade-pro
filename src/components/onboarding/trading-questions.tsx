"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Shield, Target, Wallet, ArrowRight, ArrowLeft,
  Sparkles, BarChart3, Zap, BookOpen, Rocket, PiggyBank, Loader2,
} from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

interface Preferences {
  experienceLevel: string;
  tradingGoal: string;
  riskTolerance: string;
  capitalRange: string;
}

const STEPS = [
  {
    key: "experience",
    title: "What's your trading experience?",
    subtitle: "This helps us tailor the platform to your level",
    icon: BarChart3,
    field: "experienceLevel" as const,
    options: [
      { value: "BEGINNER", label: "Beginner", desc: "New to trading, learning the basics", icon: BookOpen, color: "#0D71FF" },
      { value: "INTERMEDIATE", label: "Intermediate", desc: "Some experience, looking to grow", icon: TrendingUp, color: "#6366F1" },
      { value: "ADVANCED", label: "Advanced", desc: "Experienced trader, seeking alpha", icon: Rocket, color: "#8B5CF6" },
    ],
  },
  {
    key: "goal",
    title: "What's your primary goal?",
    subtitle: "We'll recommend traders that match your objectives",
    icon: Target,
    field: "tradingGoal" as const,
    options: [
      { value: "PASSIVE", label: "Passive Income", desc: "Steady, low-risk returns over time", icon: PiggyBank, color: "#26A69A" },
      { value: "GROWTH", label: "Aggressive Growth", desc: "Higher risk for maximum returns", icon: Zap, color: "#0D71FF" },
      { value: "LEARNING", label: "Learn & Practice", desc: "Observe strategies, build knowledge", icon: BookOpen, color: "#6366F1" },
    ],
  },
  {
    key: "risk",
    title: "What's your risk tolerance?",
    subtitle: "We'll set appropriate default risk parameters",
    icon: Shield,
    field: "riskTolerance" as const,
    options: [
      { value: "LOW", label: "Conservative", desc: "Preserve capital, minimal drawdown", icon: Shield, color: "#26A69A" },
      { value: "MEDIUM", label: "Moderate", desc: "Balanced risk and reward", icon: Target, color: "#0D71FF" },
      { value: "HIGH", label: "Aggressive", desc: "Higher volatility, higher potential", icon: Zap, color: "#EF5350" },
    ],
  },
  {
    key: "capital",
    title: "How much are you planning to invest?",
    subtitle: "This helps us suggest appropriate allocation strategies",
    icon: Wallet,
    field: "capitalRange" as const,
    options: [
      { value: "UNDER_500", label: "Under $500", desc: "Starting small, testing the waters", icon: Wallet, color: "#6366F1" },
      { value: "500_5000", label: "$500 – $5,000", desc: "Meaningful capital, ready to grow", icon: TrendingUp, color: "#0D71FF" },
      { value: "OVER_5000", label: "$5,000+", desc: "Serious investment, maximum features", icon: Sparkles, color: "#D4AF37" },
    ],
  },
];

interface TradingQuestionsProps {
  onComplete: () => void;
}

export function TradingQuestions({ onComplete }: TradingQuestionsProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [preferences, setPreferences] = useState<Preferences>({
    experienceLevel: "",
    tradingGoal: "",
    riskTolerance: "",
    capitalRange: "",
  });
  const [saving, setSaving] = useState(false);
  const [personalizing, setPersonalizing] = useState(false);

  const currentStep = STEPS[step];
  const currentValue = preferences[currentStep.field];
  const isLastStep = step === STEPS.length - 1;

  const selectOption = useCallback((value: string) => {
    setPreferences((p) => ({ ...p, [currentStep.field]: value }));
  }, [currentStep.field]);

  const goNext = useCallback(async () => {
    if (!currentValue) return;

    if (isLastStep) {
      setSaving(true);
      try {
        await fetch("/api/user/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        });
      } catch {
        // Continue even if save fails
      }
      setSaving(false);
      setPersonalizing(true);
      // Show personalizing state for 2.5s
      setTimeout(() => onComplete(), 2500);
      return;
    }

    setDirection(1);
    setStep((s) => s + 1);
  }, [currentValue, isLastStep, preferences, onComplete]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  // Personalizing state
  if (personalizing) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#06060a] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-2xl bg-[#0D71FF]/10 flex items-center justify-center mx-auto mb-6"
          >
            <Sparkles className="w-6 h-6 text-[#0D71FF]" />
          </motion.div>
          <h2 className="text-xl font-bold text-white mb-2">Personalizing your dashboard...</h2>
          <p className="text-sm text-white/35">Setting up your trading environment based on your preferences</p>
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                className="w-2 h-2 rounded-full bg-[#0D71FF]"
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#06060a] flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(13,113,255,0.06),transparent_60%)]" />

      <div className="relative w-full max-w-[520px]">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-[#0D71FF]"
                initial={false}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease }}
              />
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
            transition={{ duration: 0.3, ease }}
          >
            {/* Header */}
            <div className="mb-8">
              <div className="w-11 h-11 rounded-xl bg-[#0D71FF]/10 flex items-center justify-center mb-4">
                <currentStep.icon className="w-5 h-5 text-[#0D71FF]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1.5">{currentStep.title}</h2>
              <p className="text-sm text-white/30">{currentStep.subtitle}</p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentStep.options.map((option) => {
                const isSelected = currentValue === option.value;
                return (
                  <motion.button
                    key={option.value}
                    onClick={() => selectOption(option.value)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 border ${
                      isSelected
                        ? "border-[#0D71FF]/30 bg-[#0D71FF]/[0.06]"
                        : "border-white/[0.05] bg-white/[0.01] hover:border-white/[0.08] hover:bg-white/[0.02]"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                      style={{
                        background: isSelected ? `${option.color}15` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isSelected ? `${option.color}25` : "rgba(255,255,255,0.04)"}`,
                      }}
                    >
                      <option.icon className="w-5 h-5" style={{ color: isSelected ? option.color : "rgba(255,255,255,0.25)" }} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isSelected ? "text-white" : "text-white/60"}`}>{option.label}</p>
                      <p className="text-xs text-white/25 mt-0.5">{option.desc}</p>
                    </div>
                    {/* Radio indicator */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                      isSelected ? "border-[#0D71FF] bg-[#0D71FF]" : "border-white/15"
                    }`}>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          className="w-2 h-2 rounded-full bg-white"
                        />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={goBack}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm text-white/30 hover:text-white/60 transition-colors disabled:opacity-0 disabled:pointer-events-none border-none bg-transparent"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                // Skip — save what we have and continue
                fetch("/api/user/onboarding", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(preferences),
                }).catch(() => {});
                onComplete();
              }}
              className="text-xs text-white/20 hover:text-white/40 transition-colors border-none bg-transparent"
            >
              Skip for now
            </button>

            <button
              onClick={goNext}
              disabled={!currentValue || saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0D71FF] hover:bg-[#0B63E0] text-white text-sm font-semibold rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed border-none active:scale-[0.97]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLastStep ? (
                <>Finish <Sparkles className="w-3.5 h-3.5" /></>
              ) : (
                <>Continue <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>

        {/* Step counter */}
        <p className="text-center text-[10px] text-white/15 mt-6">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
