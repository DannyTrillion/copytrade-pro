"use client";

/**
 * Market session indicators.
 *
 * These exist to make the dashboard feel alive *truthfully*. Every state here
 * is derived from the clock and published exchange hours — nothing is
 * simulated, and nothing claims activity that did not happen. A pill that
 * invents liveness on a platform where people commit real money is worse than
 * a static page.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarketSessions, useMarketSession } from "@/hooks/use-market-sessions";
import type { MarketCategory, MarketSession, SessionState } from "@/lib/markets/sessions";

/** Dot colour per state. Only a genuinely open market gets the live pulse. */
const STATE_STYLES: Record<SessionState, { dot: string; text: string; pulse: boolean }> = {
  OPEN:        { dot: "bg-success", text: "text-success",        pulse: true  },
  PRE_MARKET:  { dot: "bg-warning", text: "text-warning",        pulse: false },
  AFTER_HOURS: { dot: "bg-warning", text: "text-warning",        pulse: false },
  CLOSED:      { dot: "bg-surface-5", text: "text-text-tertiary", pulse: false },
  WEEKEND:     { dot: "bg-surface-5", text: "text-text-tertiary", pulse: false },
  HOLIDAY:     { dot: "bg-accent",  text: "text-accent",         pulse: false },
};

function StateDot({ state, size = "sm" }: { state: SessionState; size?: "sm" | "md" }) {
  const style = STATE_STYLES[state];
  const dim = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";

  return (
    <span className="relative flex shrink-0">
      {style.pulse && (
        <span className={cn("absolute inline-flex rounded-full opacity-75 animate-ping", dim, style.dot)} />
      )}
      <span className={cn("relative inline-flex rounded-full", dim, style.dot)} />
    </span>
  );
}

/** One market, one pill. */
export function MarketStatusPill({
  market,
  className,
}: {
  market: MarketCategory;
  className?: string;
}) {
  const session = useMarketSession(market);
  return <SessionPill session={session} className={className} />;
}

function SessionPill({
  session,
  className,
}: {
  session: MarketSession;
  className?: string;
}) {
  const style = STATE_STYLES[session.state];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2/60 border border-border/60 whitespace-nowrap",
        className
      )}
      title={`${session.market} — ${session.label}`}
    >
      <StateDot state={session.state} />
      <span className="text-2xs font-medium text-text-secondary">{session.market}</span>
      <span className={cn("text-2xs tabular-nums", style.text)}>{session.label}</span>
    </span>
  );
}

/**
 * Summary bar. Collapsed it reads "4 of 7 markets open"; expanded it lists
 * every venue. Collapsed by default because the count is the answer most
 * users want, and seven pills is a lot of chrome for a dashboard header.
 */
export function MarketStatusBar({
  markets,
  className,
}: {
  /** Restrict to specific venues — e.g. only those a trader actually trades. */
  markets?: MarketCategory[];
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const all = useMarketSessions();

  const sessions = markets?.length
    ? all.filter((s) => markets.includes(s.market))
    : all;

  if (sessions.length === 0) return null;

  const openCount = sessions.filter((s) => s.isTradeable).length;
  const anyOpen = openCount > 0;

  return (
    <div className={cn("w-full", className)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-surface-1/60 border border-border/60 hover:border-border transition-colors"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 min-w-0">
          <StateDot state={anyOpen ? "OPEN" : "CLOSED"} size="md" />
          <span className="text-xs font-medium text-text-primary">
            {openCount} of {sessions.length} markets open
          </span>
          <span className="hidden sm:inline text-2xs text-text-tertiary truncate">
            {sessions
              .filter((s) => s.isTradeable)
              .slice(0, 3)
              .map((s) => s.market)
              .join(" · ") || "All venues closed"}
          </span>
        </span>

        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-text-tertiary transition-transform shrink-0",
            expanded && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 pt-2">
              {sessions.map((session) => (
                <SessionPill key={session.market} session={session} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Trader activity, stated honestly.
 *
 * Deliberately NOT a "trading now" indicator. The data model stores settled
 * results with no open-position state, so real-time trading activity is not
 * something the platform knows. This reports what is actually true: when the
 * last trade landed and how many arrived this week.
 */
export function TraderActivity({
  lastTradeAt,
  tradesThisWeek,
  className,
}: {
  lastTradeAt: string | null;
  tradesThisWeek: number;
  className?: string;
}) {
  const session = useMarketSessions();
  const anyOpen = session.some((s) => s.isTradeable);

  const age = lastTradeAt
    ? Date.now() - new Date(lastTradeAt).getTime()
    : null;

  // "Live" is reserved for a trade that genuinely landed in the last 15
  // minutes. Rare by design — which is what makes it meaningful.
  const isFresh = age !== null && age < 15 * 60 * 1000;

  const relative = (() => {
    if (age === null) return "No trades yet";
    const minutes = Math.floor(age / 60_000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  })();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {isFresh ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20">
          <StateDot state="OPEN" />
          <span className="text-2xs font-semibold text-success">
            New trade · {relative}
          </span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2/60 border border-border/60">
          <span className="text-2xs text-text-tertiary">Last trade</span>
          <span className="text-2xs font-medium text-text-secondary">{relative}</span>
        </span>
      )}

      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2/60 border border-border/60">
        <span className="text-2xs font-semibold text-text-primary tabular-nums">
          {tradesThisWeek}
        </span>
        <span className="text-2xs text-text-tertiary">
          {tradesThisWeek === 1 ? "trade" : "trades"} this week
        </span>
      </span>

      {!anyOpen && (
        <span className="text-2xs text-text-tertiary">All markets closed</span>
      )}
    </div>
  );
}

/**
 * Compact LIVE pill for a card header.
 *
 * Renders only while at least one relevant market is actually open, so its
 * presence carries information — a pill that is always lit tells the user
 * nothing. Hidden entirely when everything is closed rather than shown in a
 * greyed-out state, which would be visual noise at this size.
 */
export function LiveMarketPill({
  markets,
  variant = "default",
  className,
}: {
  /** Restrict to specific venues; defaults to any market being open. */
  markets?: MarketCategory[];
  /**
   * "onDark" is for the gradient hero cards, where success-green on saturated
   * blue fails contrast. That variant switches to translucent white with a
   * light dot, which stays legible on any brand gradient.
   */
  variant?: "default" | "onDark";
  className?: string;
}) {
  const sessions = useMarketSessions();

  const relevant = markets?.length
    ? sessions.filter((s) => markets.includes(s.market))
    : sessions;

  const open = relevant.filter((s) => s.isTradeable);
  if (open.length === 0) return null;

  const onDark = variant === "onDark";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border shrink-0",
        onDark
          ? "bg-white/15 border-white/20 backdrop-blur-sm"
          : "bg-success/10 border-success/20",
        className
      )}
      title={`Open now: ${open.map((s) => s.market).join(", ")}`}
    >
      <span className="relative flex shrink-0">
        <span
          className={cn(
            "absolute inline-flex h-1.5 w-1.5 rounded-full opacity-75 animate-ping",
            onDark ? "bg-emerald-300" : "bg-success"
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-1.5 w-1.5 rounded-full",
            onDark ? "bg-emerald-300" : "bg-success"
          )}
        />
      </span>
      <span
        className={cn(
          "text-2xs font-semibold tracking-wide",
          onDark ? "text-white" : "text-success"
        )}
      >
        LIVE
      </span>
    </span>
  );
}
