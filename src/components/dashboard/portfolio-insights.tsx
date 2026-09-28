"use client";

/**
 * Portfolio insights panel for the Copy Trading tab.
 *
 * Self-contained: owns its own fetch and range state so it can be dropped into
 * the (already 1,700-line) follower page with a single line and lifted out
 * again without untangling shared state.
 *
 * Everything shown is derived from real records — the user's own copy results
 * and published exchange hours. Nothing is simulated. Where data is absent the
 * panel says so rather than rendering a plausible-looking placeholder series.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, PieChart, Target } from "lucide-react";
import { EquityCurve, type EquityPoint, type EquityRange } from "@/components/charts/equity-curve";
import {
  TickerAttribution,
  type TickerAttributionRow,
} from "@/components/charts/ticker-attribution";
import {
  MarketAllocation,
  type MarketAllocationRow,
} from "@/components/charts/market-allocation";
import { LiveMarketPill, TraderActivity } from "@/components/markets/market-status";
import { MarketPulse } from "@/components/markets/market-pulse";
import { toMarketCategory, type MarketCategory } from "@/lib/markets/sessions";

interface InsightsResponse {
  range: string;
  summary: {
    totalPnl: number;
    totalTrades: number;
    winRate: number;
    bestTicker: string | null;
    worstTicker: string | null;
    lastTradeAt: string | null;
    tradesThisWeek: number;
    activeMarkets: string[];
  };
  equityCurve: EquityPoint[];
  tickerAttribution: TickerAttributionRow[];
  marketAllocation: MarketAllocationRow[];
}

export function PortfolioInsights({ className }: { className?: string }) {
  // Defaults to the full history. A windowed default hid data from accounts
  // whose activity predates the window, which read as a broken chart while the
  // stat cards above showed a non-zero trade count.
  const [range, setRange] = useState<EquityRange>("all");
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/portfolio/insights?range=${range}`);
      if (!res.ok) throw new Error("Failed to load portfolio insights");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  // Only the venues this user is actually exposed to — a status bar listing
  // markets they have never traded is noise.
  const markets = useMemo<MarketCategory[]>(() => {
    const raw = data?.summary.activeMarkets ?? [];
    return raw
      .map(toMarketCategory)
      .filter((m): m is MarketCategory => m !== null);
  }, [data]);

  const tickers = useMemo(
    () => (data?.tickerAttribution ?? []).map((row) => row.ticker),
    [data]
  );

  if (error) {
    return (
      <section className={className}>
        <div className="glass-panel p-4">
          <p className="text-sm text-danger">{error}</p>
          <button onClick={load} className="btn-secondary btn-sm mt-3">
            Retry
          </button>
        </div>
      </section>
    );
  }

  const hasActivity = (data?.equityCurve.length ?? 0) > 0;

  return (
    <section className={className}>
      {/* Live context strip — market sessions, real prices, honest activity. */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2.5 mb-4"
      >
        <MarketPulse
          symbols={tickers}
          markets={markets.length > 0 ? markets : undefined}
        />

        <TraderActivity
          lastTradeAt={data?.summary.lastTradeAt ?? null}
          tradesThisWeek={data?.summary.tradesThisWeek ?? 0}
        />
      </motion.div>

      {/* Equity curve — replaces the scattered P&L charts with one control. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-panel p-4 mb-4"
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-semibold text-text-primary">
              Portfolio performance
            </h3>
          </div>

          {/* Only lit while a venue this user trades is actually open. */}
          <LiveMarketPill markets={markets.length > 0 ? markets : undefined} />
        </div>

        <EquityCurve
          data={data?.equityCurve ?? []}
          range={range}
          onRangeChange={setRange}
          loading={loading}
        />
      </motion.div>

      {/* Attribution and allocation sit side by side: "which instruments" and
          "which venues" are the two halves of the same question. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-4"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-semibold text-text-primary">
                P&amp;L by instrument
              </h3>
            </div>
            {data?.summary.bestTicker && (
              <span className="text-2xs text-text-tertiary">
                Best: <span className="text-success">{data.summary.bestTicker}</span>
              </span>
            )}
          </div>

          <TickerAttribution rows={data?.tickerAttribution ?? []} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-panel p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-semibold text-text-primary">
              Market exposure
            </h3>
          </div>

          <MarketAllocation rows={data?.marketAllocation ?? []} />
        </motion.div>
      </div>

      {!loading && !hasActivity && (
        <p className="text-2xs text-text-tertiary text-center mt-3">
          Charts populate once your copied trader posts results.
        </p>
      )}
    </section>
  );
}
