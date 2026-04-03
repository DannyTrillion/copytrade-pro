"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label?: string;
  error?: string;
  touched?: boolean;
  valid?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  errorId?: string;
  labelClassName?: string;
}

export function FormField({ label, error, touched, valid, hint, children, className, errorId, labelClassName }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className={cn("text-sm text-text-secondary block", labelClassName)}>
          {label}
          {touched && !error && valid && (
            <CheckCircle2 className="w-3.5 h-3.5 text-success inline ml-1.5 -mt-0.5" />
          )}
        </label>
      )}
      <div className={cn(
        "[&>input]:transition-colors [&>input]:duration-200 [&>div]:transition-colors [&>div]:duration-200",
        error && touched && "[&>input]:!border-danger [&>div>input]:!border-danger",
        valid && touched && !error && "[&>input]:!border-success/50 [&>div>input]:!border-success/50"
      )}>
        {children}
      </div>
      <AnimatePresence mode="wait">
        {error && touched ? (
          <motion.p
            key="error"
            id={errorId}
            role="alert"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="flex items-center gap-1 text-2xs text-danger"
          >
            <AlertCircle className="w-3 h-3 shrink-0" />
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xs text-text-tertiary"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ─── Password Strength Meter ─── */

interface PasswordStrengthProps {
  password: string;
}

export function getPasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak" };
  if (score === 2) return { score: 2, label: "Fair" };
  if (score === 3) return { score: 3, label: "Good" };
  return { score: 4, label: "Strong" };
}

const STRENGTH_COLORS = ["", "bg-danger", "bg-warning", "bg-brand", "bg-success"];
const STRENGTH_TEXT = ["", "text-danger", "text-warning", "text-brand", "text-success"];

export function PasswordStrengthMeter({ password }: PasswordStrengthProps) {
  const { score, label } = getPasswordStrength(password);
  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="space-y-1.5 pt-1"
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i <= score ? STRENGTH_COLORS[score] : "bg-surface-4"
            )}
          />
        ))}
      </div>
      <p className={cn("text-2xs font-medium", STRENGTH_TEXT[score])}>{label}</p>
    </motion.div>
  );
}
