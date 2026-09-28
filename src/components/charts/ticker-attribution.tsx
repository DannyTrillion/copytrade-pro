"use client";

/**
 * Per-ticker P&L attribution.
 *
 * Answers the question a copy-trading user actually has — "which instruments
 * made or lost me money?" — which a single portfolio line never can.
 *
 * Horizontal bars rather than a pie: this is a diverging quantity where the
 * losers matter as much as the winners, and a pie cannot show negative values
 * at all. Rows are sorted by absolute impact so the biggest loser sits near
 * the top instead of being buried at the bottom.
 */

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface TickerAttributionRow {
  ticker: string;
  pnl: number;
  trades: number;
  winRate: number;
  market: string;
}

export function TickerAttribution({
  rows,
  className,
}: {
  rows: TickerAttributionRow[];
  className?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className={cn("text-sm text-text-tertiary py-8 text-center", className)}>
        No copied trades in this period yet.
      </p>
    );
  }

  // Bars are scaled against the largest absolute value so the widest bar is
  // always full width — a fixed scale would render every bar as a stub when
  // amounts are small.
  const peak = Math.max(...rows.map((r) => Math.abs(r.pnl)), 1);

  return (
    <div className={cn("space-y-2", className)}>
      {rows.map((row, i) => {
        const positive = row.pnl >= 0;
        const width = (Math.abs(row.pnl) / peak) * 100;

        return (
          <motion.div
            key={row.ticker}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            className="group"
          >
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-text-primary tabular-nums">
                  {row.ticker}
                </span>
                <span className="text-2xs text-text-tertiary truncate">
                  {row.market} · {row.trades} {row.trades === 1 ? "trade" : "trades"}
                </span>
              </span>

              <span
                className={cn(
                  "text-xs font-semibold tabular-nums whitespace-nowrap inline-flex items-center gap-1",
                  positive ? "text-success" : "text-danger"
                )}
              >
                {positive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {positive ? "+" : ""}
                {formatCurrency(row.pnl)}
              </span>
            </div>

            {/* Track is centred so gains grow right and losses grow left,
                making the sign readable without reading the number. */}
            <div className="relative h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ delay: i * 0.04 + 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "absolute inset-y-0 rounded-full",
                  positive ? "left-0 bg-success/70" : "right-0 bg-danger/70"
                )}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
