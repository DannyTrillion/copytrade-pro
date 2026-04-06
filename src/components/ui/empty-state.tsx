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
  { icon: LucideIcon; title: string; description: string; color: string; accent: string; actionLabel?: string; actionHref?: string }
> = {
  "no-trades": {
    icon: BarChart3,
    title: "No trades yet",
    description: "Upload your first trade to start tracking performance and attracting followers.",
    color: "text-warning",
    accent: "#FF9800",
    actionLabel: "Upload Trade",
    actionHref: "/dashboard/trader",
  },
  "no-activity": {
    icon: Activity,
    title: "No activity yet",
    description: "Deposit funds and start copy trading to see your transaction history here.",
    color: "text-brand",
    accent: "#2962FF",
    actionLabel: "Make a Deposit",
    actionHref: "/dashboard/deposit",
  },
  "no-followers": {
    icon: Users,
    title: "No followers yet",
    description: "Share your signals to attract followers and earn commissions from their copy trades.",
    color: "text-info",
    accent: "#2962FF",
  },
  "no-traders": {
    icon: TrendingUp,
    title: "No traders available",
    description: "Check back later for verified top traders to copy.",
    color: "text-success",
    accent: "#26A69A",
  },
  "no-deposits": {
    icon: Wallet,
    title: "No deposits yet",
    description: "Fund your account to unlock copy trading and start following top traders.",
    color: "text-brand",
    accent: "#2962FF",
    actionLabel: "Deposit Now",
    actionHref: "/dashboard/deposit",
  },
  "no-copy": {
    icon: Copy,
    title: "Not copying anyone",
    description: "Find top-performing traders and start copying their trades automatically.",
    color: "text-success",
    accent: "#26A69A",
    actionLabel: "Browse Traders",
    actionHref: "/dashboard/follower",
  },
  generic: {
    icon: Upload,
    title: "Nothing here yet",
    description: "This section will populate as you use the platform.",
    color: "text-text-tertiary",
    accent: "#6B7084",
  },
};

/* ─── SVG Illustrations ─── */

function ChartIllustration({ accent }: { accent: string }) {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" className="mx-auto">
      {/* Grid lines */}
      <line x1="10" y1="20" x2="110" y2="20" stroke="currentColor" strokeOpacity="0.06" />
      <line x1="10" y1="40" x2="110" y2="40" stroke="currentColor" strokeOpacity="0.06" />
      <line x1="10" y1="60" x2="110" y2="60" stroke="currentColor" strokeOpacity="0.06" />
      {/* Bars */}
      <motion.rect initial={{ height: 0, y: 60 }} animate={{ height: 15, y: 45 }} transition={{ delay: 0.2, duration: 0.6, ease: EASE }} x="18" width="10" rx="3" fill={accent} fillOpacity="0.15" />
      <motion.rect initial={{ height: 0, y: 60 }} animate={{ height: 30, y: 30 }} transition={{ delay: 0.3, duration: 0.6, ease: EASE }} x="34" width="10" rx="3" fill={accent} fillOpacity="0.25" />
      <motion.rect initial={{ height: 0, y: 60 }} animate={{ height: 20, y: 40 }} transition={{ delay: 0.4, duration: 0.6, ease: EASE }} x="50" width="10" rx="3" fill={accent} fillOpacity="0.2" />
      <motion.rect initial={{ height: 0, y: 60 }} animate={{ height: 40, y: 20 }} transition={{ delay: 0.5, duration: 0.6, ease: EASE }} x="66" width="10" rx="3" fill={accent} fillOpacity="0.35" />
      <motion.rect initial={{ height: 0, y: 60 }} animate={{ height: 25, y: 35 }} transition={{ delay: 0.6, duration: 0.6, ease: EASE }} x="82" width="10" rx="3" fill={accent} fillOpacity="0.2" />
      <motion.rect initial={{ height: 0, y: 60 }} animate={{ height: 35, y: 25 }} transition={{ delay: 0.7, duration: 0.6, ease: EASE }} x="98" width="10" rx="3" fill={accent} fillOpacity="0.3" />
      {/* Trend line */}
      <motion.path
        d="M23 50 L39 35 L55 42 L71 22 L87 38 L103 28"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.7 }}
        transition={{ delay: 0.5, duration: 1.2, ease: EASE }}
      />
      {/* Dot at end */}
      <motion.circle
        cx="103" cy="28" r="3"
        fill={accent}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.5, type: "spring", stiffness: 300 }}
      />
    </svg>
  );
}

function ActivityIllustration({ accent }: { accent: string }) {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" className="mx-auto">
      {/* Card lines */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <motion.rect
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 90, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.15, duration: 0.5, ease: EASE }}
            x="15" y={16 + i * 22} height="16" rx="6"
            fill="currentColor" fillOpacity="0.04"
            stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.5"
          />
          <motion.circle
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.35 + i * 0.15, type: "spring", stiffness: 300 }}
            cx="28" cy={24 + i * 22} r="4"
            fill={accent} fillOpacity={0.3 - i * 0.08}
          />
          <motion.rect
            initial={{ width: 0 }}
            animate={{ width: 40 - i * 8 }}
            transition={{ delay: 0.4 + i * 0.15, duration: 0.4, ease: EASE }}
            x="38" y={21 + i * 22} height="6" rx="3"
            fill="currentColor" fillOpacity={0.1 - i * 0.02}
          />
        </g>
      ))}
      {/* Pulse ring */}
      <motion.circle
        cx="95" cy="24" r="8"
        fill="none" stroke={accent} strokeWidth="1.5"
        initial={{ scale: 0, opacity: 0.5 }}
        animate={{ scale: [0.5, 1.5], opacity: [0.5, 0] }}
        transition={{ delay: 0.8, duration: 2, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.circle
        cx="95" cy="24" r="3"
        fill={accent} fillOpacity="0.4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
      />
    </svg>
  );
}

function WalletIllustration({ accent }: { accent: string }) {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" className="mx-auto">
      {/* Wallet body */}
      <motion.rect
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
        x="20" y="15" width="80" height="50" rx="12"
        fill="currentColor" fillOpacity="0.04"
        stroke="currentColor" strokeOpacity="0.08" strokeWidth="1"
      />
      {/* Card slot */}
      <motion.rect
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 70, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
        y="28" width="35" height="24" rx="6"
        fill={accent} fillOpacity="0.12"
        stroke={accent} strokeOpacity="0.2" strokeWidth="0.8"
      />
      {/* Coin circles */}
      <motion.circle
        cx="45" cy="40" r="10"
        fill={accent} fillOpacity="0.08"
        stroke={accent} strokeOpacity="0.15" strokeWidth="1"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
      />
      <motion.text
        x="45" y="44" textAnchor="middle" fill={accent} fillOpacity="0.5" fontSize="10" fontWeight="700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >$</motion.text>
      {/* Floating coins */}
      {[0, 1].map((i) => (
        <motion.circle
          key={i}
          cx={35 + i * 25} cy={20 - i * 5}
          r="5"
          fill={accent} fillOpacity={0.15 + i * 0.1}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: [0, -6, 0], opacity: 1 }}
          transition={{ delay: 0.7 + i * 0.2, duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}

function UsersIllustration({ accent }: { accent: string }) {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" className="mx-auto">
      {/* Center person */}
      <motion.circle
        cx="60" cy="28" r="10"
        fill={accent} fillOpacity="0.12"
        stroke={accent} strokeOpacity="0.2" strokeWidth="1"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      />
      <motion.path
        d="M45 58 C45 48 55 42 60 42 C65 42 75 48 75 58"
        fill={accent} fillOpacity="0.08"
        stroke={accent} strokeOpacity="0.12" strokeWidth="0.8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      />
      {/* Side people */}
      {[-1, 1].map((dir) => (
        <g key={dir}>
          <motion.circle
            cx={60 + dir * 30} cy="32" r="7"
            fill="currentColor" fillOpacity="0.06"
            stroke="currentColor" strokeOpacity="0.08" strokeWidth="0.8"
            initial={{ scale: 0, x: -dir * 10 }}
            animate={{ scale: 1, x: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          />
          <motion.path
            d={`M${48 + dir * 30} 55 C${48 + dir * 30} 48 ${55 + dir * 30} 43 ${60 + dir * 30} 43 C${65 + dir * 30} 43 ${72 + dir * 30} 48 ${72 + dir * 30} 55`}
            fill="currentColor" fillOpacity="0.04"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          />
        </g>
      ))}
      {/* Connection lines */}
      <motion.line
        x1="50" y1="30" x2="37" y2="32"
        stroke={accent} strokeOpacity="0.15" strokeWidth="1" strokeDasharray="2 2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      />
      <motion.line
        x1="70" y1="30" x2="83" y2="32"
        stroke={accent} strokeOpacity="0.15" strokeWidth="1" strokeDasharray="2 2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      />
    </svg>
  );
}

function getIllustration(variant: string, accent: string) {
  switch (variant) {
    case "no-trades": return <ChartIllustration accent={accent} />;
    case "no-activity": return <ActivityIllustration accent={accent} />;
    case "no-deposits": case "no-copy": return <WalletIllustration accent={accent} />;
    case "no-followers": case "no-traders": return <UsersIllustration accent={accent} />;
    default: return <ChartIllustration accent={accent} />;
  }
}

export function EmptyState({ variant, title, description, actionLabel, actionHref }: EmptyStateProps) {
  const config = VARIANTS[variant] || VARIANTS.generic;
  const finalTitle = title || config.title;
  const finalDesc = description || config.description;
  const finalAction = actionLabel || config.actionLabel;
  const finalHref = actionHref || config.actionHref;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex flex-col items-center justify-center py-12 px-6 gap-2"
    >
      {/* Illustrated SVG */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
        className="mb-2"
      >
        {getIllustration(variant, config.accent)}
      </motion.div>

      <div className="text-center max-w-[300px]">
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-sm font-semibold text-text-primary"
        >
          {finalTitle}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-xs text-text-tertiary mt-1.5 leading-relaxed"
        >
          {finalDesc}
        </motion.p>
      </div>

      {finalAction && finalHref && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-3"
        >
          <Link href={finalHref} className="btn-primary text-xs gap-1.5 px-5 py-2.5">
            {finalAction}
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}
