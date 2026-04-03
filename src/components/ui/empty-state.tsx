"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  BarChart3,
  Activity,
  Users,
  Upload,
  Wallet,
  TrendingUp,
  Copy,
  type LucideIcon,
} from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

interface EmptyStateProps {
  variant: "no-trades" | "no-activity" | "no-followers" | "no-traders" | "no-deposits" | "no-copy" | "generic";
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

const VARIANTS: Record<
  string,
  { icon: LucideIcon; title: string; description: string; color: string; bgColor: string; actionLabel?: string; actionHref?: string }
> = {
  "no-trades": {
    icon: BarChart3,
    title: "No trades yet",
    description: "Upload your first trade to start tracking performance and attracting followers.",
    color: "text-warning",
    bgColor: "bg-warning/10 border-warning/20",
    actionLabel: "Upload Trade",
    actionHref: "/dashboard/trader",
  },
  "no-activity": {
    icon: Activity,
    title: "No activity yet",
    description: "Deposit funds and start copy trading to see your activity here.",
    color: "text-brand",
    bgColor: "bg-brand/10 border-brand/20",
    actionLabel: "Make a Deposit",
    actionHref: "/dashboard/deposit",
  },
  "no-followers": {
    icon: Users,
    title: "No followers yet",
    description: "Share your trading signals to attract followers and earn from their copy trades.",
    color: "text-info",
    bgColor: "bg-info/10 border-info/20",
  },
  "no-traders": {
    icon: TrendingUp,
    title: "No traders available",
    description: "Check back later for verified traders to copy.",
    color: "text-success",
    bgColor: "bg-success/10 border-success/20",
  },
  "no-deposits": {
    icon: Wallet,
    title: "No deposits yet",
    description: "Fund your account to start copy trading.",
    color: "text-brand",
    bgColor: "bg-brand/10 border-brand/20",
    actionLabel: "Deposit Now",
    actionHref: "/dashboard/deposit",
  },
  "no-copy": {
    icon: Copy,
    title: "Not copying anyone",
    description: "Find top traders and start copying their trades automatically.",
    color: "text-success",
    bgColor: "bg-success/10 border-success/20",
    actionLabel: "Browse Traders",
    actionHref: "/dashboard/follower",
  },
  generic: {
    icon: Upload,
    title: "Nothing here yet",
    description: "This section will populate as you use the platform.",
    color: "text-text-tertiary",
    bgColor: "bg-surface-3 border-border",
  },
};

export function EmptyState({ variant, title, description, actionLabel, actionHref }: EmptyStateProps) {
  const config = VARIANTS[variant] || VARIANTS.generic;
  const Icon = config.icon;
  const finalTitle = title || config.title;
  const finalDesc = description || config.description;
  const finalAction = actionLabel || config.actionLabel;
  const finalHref = actionHref || config.actionHref;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex flex-col items-center justify-center py-10 px-4 gap-4"
    >
      {/* Animated icon with rings */}
      <div className="relative">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
          className={`p-4 rounded-2xl border ${config.bgColor}`}
        >
          <Icon className={`w-7 h-7 ${config.color}`} />
        </motion.div>
        {/* Decorative rings */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
          className={`absolute -inset-3 rounded-3xl border ${config.bgColor}`}
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.08 }}
          transition={{ delay: 0.3, duration: 0.7, ease: EASE }}
          className={`absolute -inset-6 rounded-[28px] border ${config.bgColor}`}
        />
      </div>

      <div className="text-center max-w-[280px]">
        <p className="text-sm font-semibold text-text-primary">{finalTitle}</p>
        <p className="text-xs text-text-tertiary mt-1.5 leading-relaxed">{finalDesc}</p>
      </div>

      {finalAction && finalHref && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link href={finalHref} className="btn-primary text-xs gap-1.5 px-5 py-2">
            {finalAction}
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}
