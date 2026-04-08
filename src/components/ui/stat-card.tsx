"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "./animated-counter";

interface StatCardProps {
  title: string;
  value: string;
  /** Provide numericValue to enable count-up animation */
  numericValue?: number;
  isCurrency?: boolean;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  /** Gradient border accent color — e.g. "from-brand to-brand-light" */
  accentGradient?: string;
  delay?: number;
  /** Optional className for the outermost wrapper (e.g. cursor-pointer) */
  className?: string;
}

export function StatCard({
  title,
  value,
  numericValue,
  isCurrency,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-brand",
  accentGradient,
  delay = 0,
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "relative group cursor-default",
        className
      )}
    >
      {/* Gradient border glow on hover */}
      {accentGradient && (
        <div
          className={cn(
            "absolute -inset-[1px] rounded-lg bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[1px]",
            accentGradient
          )}
        />
      )}

      <div className="relative stat-card" role="status" aria-label={`${title}: ${value}`}>
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              "relative p-2 rounded-lg bg-surface-3 transition-all duration-300 ease-out",
              "group-hover:scale-110 group-hover:rotate-[-6deg]",
              iconColor
            )}
          >
            {/* Icon glow ring on hover */}
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md bg-current" style={{ opacity: 0 }} />
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500 blur-[6px]" style={{ background: "currentColor" }} />
            <Icon className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:scale-105" />
          </div>
          {change && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.2 }}
              className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded",
                changeType === "positive" && "text-success bg-success/10",
                changeType === "negative" && "text-danger bg-danger/10",
                changeType === "neutral" && "text-text-tertiary bg-surface-4"
              )}
            >
              {change}
            </motion.span>
          )}
        </div>

        {numericValue !== undefined ? (
          <AnimatedCounter
            value={Math.abs(numericValue)}
            prefix={isCurrency ? (numericValue < 0 ? "-$" : "$") : ""}
            decimals={isCurrency ? 2 : 0}
            className="text-xl md:text-2xl font-semibold text-text-primary tracking-tight number-value tabular-nums block"
          />
        ) : (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.1, duration: 0.3 }}
            className="text-xl md:text-2xl font-semibold text-text-primary tracking-tight number-value tabular-nums"
          >
            {value}
          </motion.p>
        )}
        <p className="text-xs text-text-tertiary mt-1">{title}</p>
      </div>
    </motion.div>
  );
}
