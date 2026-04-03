"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatLiveClock(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

interface DashboardHeaderProps {
  firstName: string;
  children?: React.ReactNode;
}

export function DashboardHeader({ firstName, children }: DashboardHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [clock, setClock] = useState("");
  const [greeting, setGreeting] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    setClock(formatLiveClock());
    setGreeting(getGreeting());
    setDate(formatDate());
    setMounted(true);

    const interval = setInterval(() => setClock(formatLiveClock()), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
    >
      <div>
        {mounted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 mb-1"
          >
            <span className="text-xs text-text-tertiary font-medium">{date}</span>
            <span className="text-xs text-text-tertiary">·</span>
            <span className="text-xs text-text-tertiary tabular-nums font-medium">{clock}</span>
          </motion.div>
        )}
        <h2 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">
          {mounted ? greeting : "Welcome"}, {firstName}
        </h2>
        <p className="text-sm text-text-tertiary mt-0.5">
          Here&apos;s your portfolio overview
        </p>
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </motion.div>
  );
}
