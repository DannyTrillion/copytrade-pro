"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Signal } from "lucide-react";
import Link from "next/link";

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

interface FollowedTrader {
  name: string;
  isActive: boolean;
}

interface DashboardHeaderProps {
  firstName: string;
  followedTraders?: FollowedTrader[];
  children?: React.ReactNode;
}

export function DashboardHeader({ firstName, followedTraders, children }: DashboardHeaderProps) {
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

  const activeTraders = followedTraders?.filter((t) => t.isActive) || [];

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
            className="flex items-center gap-2 mb-1 flex-wrap"
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

        {/* Active trader badges */}
        {activeTraders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
            className="flex items-center gap-2 mt-2.5 flex-wrap"
          >
            <span className="text-xs text-text-quaternary">Copying:</span>
            {activeTraders.slice(0, 3).map((trader) => (
              <Link
                key={trader.name}
                href="/dashboard/follower"
                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-surface-2/50 hover:bg-surface-3 hover:border-brand/20 transition-all duration-200"
              >
                <div className="relative">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-[8px] font-bold text-white">
                    {trader.name[0]}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success border border-surface-1" />
                </div>
                <span className="text-xs font-medium text-text-secondary group-hover:text-brand transition-colors">{trader.name}</span>
                <Signal className="w-2.5 h-2.5 text-success/60" />
              </Link>
            ))}
            {activeTraders.length > 3 && (
              <Link
                href="/dashboard/follower"
                className="text-xs text-text-tertiary hover:text-brand transition-colors"
              >
                +{activeTraders.length - 3} more
              </Link>
            )}
          </motion.div>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </motion.div>
  );
}
