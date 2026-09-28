"use client";

/**
 * Market allocation donut.
 *
 * Shows which venues a user's copied exposure actually sits in. Share is
 * computed from absolute P&L movement rather than position size, because
 * `TraderTrade` does not reliably record trade size — so this is a proxy for
 * exposure, and the legend says "activity" rather than implying it is capital.
 *
 * Drawn as SVG arcs rather than pulling in a charting dependency: a donut is
 * an arc-length calculation, and the existing recharts bundle is already the
 * heaviest thing on this page.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useMarketSessions } from "@/hooks/use-market-sessions";
import { toMarketCategory } from "@/lib/markets/sessions";

export interface MarketAllocationRow {
  market: string;
  pnl: number;
  trades: number;
  share: number;
}

/** Distinguishable at small arc widths and stable across themes. */
const PALETTE = [
  "#2962FF", "#26A69A", "#AB47BC", "#FF7043",
  "#42A5F5", "#FFCA28", "#66BB6A", "#EC407A",
];

const SIZE = 168;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function MarketAllocation({
  rows,
  className,
}: {
  rows: MarketAllocationRow[];
  className?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const sessions = useMarketSessions();

  if (rows.length === 0) {
    return (
      <p className={cn("text-sm text-text-tertiary py-8 text-center", className)}>
        No market exposure yet.
      </p>
    );
  }

  const total = rows.reduce((sum, r) => sum + r.share, 0) || 1;
  const activeRow = rows.find((r) => r.market === active) ?? null;

  let offset = 0;
  const arcs = rows.map((row, i) => {
    const fraction = row.share / total;
    const arc = {
      row,
      color: PALETTE[i % PALETTE.length],
      dash: fraction * CIRCUMFERENCE,
      offset,
    };
    offset += fraction * CIRCUMFERENCE;
    return arc;
  });

  const totalTrades = rows.reduce((s, r) => s + r.trades, 0);

  return (
    <div className={cn("flex flex-col sm:flex-row items-center gap-5", className)}>
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgb(var(--surface-2))"
            strokeWidth={STROKE}
          />
          {arcs.map((arc) => (
            <motion.circle
              key={arc.row.market}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={arc.color}
              strokeWidth={active === arc.row.market ? STROKE + 3 : STROKE}
              strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
              strokeDashoffset={-arc.offset}
              initial={{ opacity: 0 }}
              animate={{
                opacity: active && active !== arc.row.market ? 0.35 : 1,
              }}
              transition={{ duration: 0.2 }}
              onMouseEnter={() => setActive(arc.row.market)}
              onMouseLeave={() => setActive(null)}
              className="cursor-pointer transition-[stroke-width] duration-200"
            />
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-semibold text-text-primary tabular-nums">
            {activeRow ? `${activeRow.share.toFixed(0)}%` : totalTrades}
          </span>
          <span className="text-2xs text-text-tertiary text-center px-4">
            {activeRow ? activeRow.market : "copied trades"}
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-1.5">
        {rows.map((row, i) => {
          // Surface whether the venue is tradeable right now — the donut is
          // historical, this makes the panel feel current.
          const category = toMarketCategory(row.market);
          const session = category
            ? sessions.find((s) => s.market === category)
            : null;

          return (
            <div
              key={row.market}
              onMouseEnter={() => setActive(row.market)}
              onMouseLeave={() => setActive(null)}
              className={cn(
                "flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg transition-colors cursor-default",
                active === row.market ? "bg-surface-2/60" : "hover:bg-surface-2/40"
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                />
                <span className="text-xs text-text-secondary truncate">
                  {row.market}
                </span>
                {session?.isTradeable && (
                  <span className="w-1 h-1 rounded-full bg-success shrink-0" title="Market open" />
                )}
              </span>

              <span className="flex items-center gap-2 shrink-0">
                <span className="text-2xs text-text-tertiary tabular-nums">
                  {row.share.toFixed(0)}%
                </span>
                <span
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    row.pnl >= 0 ? "text-success" : "text-danger"
                  )}
                >
                  {row.pnl >= 0 ? "+" : ""}
                  {formatCurrency(row.pnl)}
                </span>
              </span>
            </div>
          );
        })}

        <p className="text-2xs text-text-tertiary pt-1.5 border-t border-border/40">
          Share reflects trading activity, not capital allocated.
        </p>
      </div>
    </div>
  );
}
