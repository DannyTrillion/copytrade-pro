"use client";

import { useState, useEffect } from "react";
import { TradingQuestions } from "./trading-questions";

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
        // Non-critical
      } finally {
        setLoading(false);
      }
    };
    checkOnboarding();
  }, []);

  if (loading || !isOpen) return null;

  return <TradingQuestions onComplete={() => setIsOpen(false)} />;
}
