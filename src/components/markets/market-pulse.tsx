"use client";

/**
 * Market Pulse.
 *
 * Gives the dashboard a heartbeat between trader uploads. Every number here is
 * real: prices and 7-day sparklines come from a live exchange aggregator, and
 * session states are computed from published exchange hours.
 *
 * Nothing is simulated. That was a deliberate product decision — a copy-trading
 * dashboard that invents activity misrepresents a real trader's conduct to
 * users deciding whether to deposit, and the provenance line at the foot of
 * this widget is what lets a user verify that for themselves.
 *
 * Degrades to nothing if the upstream is unreachable, rather than rendering
 * placeholder rows that imply broken data.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketStatusBar } from "./market-status";
import { filterPriceable, type PriceResponse, type TickerPrice } from "@/lib/markets/prices";
import type { MarketCategory } from "@/lib/markets/sessions";

/** Matches the server cache TTL; polling faster only re-serves the cache. */
const POLL_MS = 30_000;
const DEFAULT_SYMBOLS = ["BTC", "ETH", "SOL", "XRP"];

export function MarketPulse({
  symbols,
  markets,
  compact = false,
  className,
}: {
  /** Instruments to track; falls back to majors when the user has none. */
  symbols?: string[];
  /** Restrict the session bar to venues the user is exposed to. */
  markets?: MarketCategory[];
  /** Drops the session bar and volume line for tighter placements. */
  compact?: boolean;
  className?: string;
}) {
  const [prices, setPrices] = useState<TickerPrice[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);

  const tracked = useMemo(() => {
    const priceable = filterPriceable(symbols ?? [], 6);
    return priceable.length > 0 ? priceable : DEFAULT_SYMBOLS;
  }, [symbols]);

  const key = tracked.join(",");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/market/prices?symbols=${encodeURIComponent(key)}`);
      if (!res.ok) {
        setAvailable(false);
        return;
      }

      const data: PriceResponse = await res.json();
      setPrices(data.prices ?? []);
      setAvailable(Boolean(data.available) && (data.prices?.length ?? 0) > 0);
    } catch {
      setAvailable(false);
    }
  }, [key]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);

    // Don't keep polling a tab nobody is looking at.
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const mover = useMemo(() => {
    if (prices.length === 0) return null;
    return prices.reduce((best, p) =>
      Math.abs(p.changePercent) > Math.abs(best.changePercent) ? p : best
    );
  }, [prices]);

  // Session states are pure clock maths and always available, so the bar is
  // worth showing even when the price upstream is down.
  const pricesUnavailable = available === false || prices.length === 0;

  return (
    <div className={cn("glass-panel p-4", className)}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-semibold text-text-primary">Market pulse</h3>
        </div>

        {mover && (
          <span className="text-2xs text-text-tertiary hidden sm:inline">
            Top mover{" "}
            <span className={mover.changePercent >= 0 ? "text-success" : "text-danger"}>
              {mover.symbol} {mover.changePercent >= 0 ? "+" : ""}
              {mover.changePercent.toFixed(2)}%
            </span>
          </span>
        )}
      </div>

      {!compact && <MarketStatusBar markets={markets} className="mb-3" />}

      {pricesUnavailable ? (
        <p className="text-2xs text-text-tertiary py-4 text-center">
          Live prices are temporarily unavailable.
        </p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {prices.map((price, i) => (
            <PriceTile key={price.symbol} price={price} delay={i * 0.04} compact={compact} />
          ))}
        </div>
      )}

      <p className="text-2xs text-text-tertiary mt-3 pt-2.5 border-t border-border/40">
        Live prices and 7-day trends from public exchange data · market hours from
        exchange calendars. Reference data only — not your portfolio.
      </p>
    </div>
  );
}

function PriceTile({
  price,
  delay,
  compact,
}: {
  price: TickerPrice;
  delay: number;
  compact: boolean;
}) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [previous, setPrevious] = useState(price.price);

  useEffect(() => {
    if (price.price === previous) return;

    setFlash(price.price > previous ? "up" : "down");
    setPrevious(price.price);

    const timer = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(timer);
  }, [price.price, previous]);

  const positive = price.changePercent >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        "relative rounded-xl border p-2.5 overflow-hidden transition-colors duration-700",
        flash === "up"
          ? "bg-success/5 border-success/30"
          : flash === "down"
            ? "bg-danger/5 border-danger/30"
            : "bg-surface-1/50 border-border/50"
      )}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-2xs font-semibold text-text-primary">{price.symbol}</span>
        <span
          className={cn(
            "text-2xs font-medium tabular-nums inline-flex items-center gap-0.5",
            positive ? "text-success" : "text-danger"
          )}
        >
          {positive ? (
            <TrendingUp className="w-2.5 h-2.5" />
          ) : (
            <TrendingDown className="w-2.5 h-2.5" />
          )}
          {positive ? "+" : ""}
          {price.changePercent.toFixed(2)}%
        </span>
      </div>

      <p className="text-sm font-semibold text-text-primary tabular-nums mb-1.5">
        {formatPrice(price.price)}
      </p>

      <Sparkline points={price.sparkline} positive={positive} />

      {!compact && price.volume > 0 && (
        <p className="text-2xs text-text-tertiary mt-1.5 tabular-nums">
          Vol {formatCompact(price.volume)}
        </p>
      )}
    </motion.div>
  );
}

/**
 * Inline SVG sparkline. Hand-drawn rather than a charting component: this
 * renders up to six times per panel and a library instance per tile would be
 * disproportionate for a 28px polyline.
 */
function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  const path = useMemo(() => {
    if (points.length < 2) return null;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || 1;

    const width = 100;
    const height = 28;

    return points
      .map((value, i) => {
        const x = (i / (points.length - 1)) * width;
        // SVG y grows downward, so invert the normalised value.
        const y = height - ((value - min) / span) * height;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [points]);

  if (!path) return <div className="h-7" />;

  const stroke = positive ? "#26A69A" : "#EF5350";

  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      className="w-full h-7"
      aria-hidden="true"
    >
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function formatPrice(value: number): string {
  if (value >= 1000) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
}

function formatCompact(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}
