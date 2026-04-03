"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Globe, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Lazy-load all TradingView widgets (no SSR, loaded on demand) ─── */

const AdvancedChart = dynamic(
  () => import("./tradingview-widgets").then((m) => ({ default: m.AdvancedChart })),
  { ssr: false, loading: () => <WidgetSkeleton height={500} /> }
);

const MiniChartWidget = dynamic(
  () => import("./tradingview-widgets").then((m) => ({ default: m.MiniChartWidget })),
  { ssr: false, loading: () => <WidgetSkeleton height={220} /> }
);

const MarketOverview = dynamic(
  () => import("./tradingview-widgets").then((m) => ({ default: m.MarketOverview })),
  { ssr: false, loading: () => <WidgetSkeleton height={500} /> }
);

const TickerTape = dynamic(
  () => import("./tradingview-widgets").then((m) => ({ default: m.TickerTape })),
  { ssr: false, loading: () => <WidgetSkeleton height={46} /> }
);

const Hotlists = dynamic(
  () => import("./tradingview-widgets").then((m) => ({ default: m.Hotlists })),
  { ssr: false, loading: () => <WidgetSkeleton height={500} /> }
);

/* ─── Skeleton placeholder ─── */

function WidgetSkeleton({ height }: { height: number }) {
  return (
    <div
      className="rounded-xl border border-border bg-surface-1 animate-pulse flex items-center justify-center"
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-2">
        <BarChart3 className="w-6 h-6 text-text-quaternary" />
        <span className="text-xs text-text-tertiary">Loading chart...</span>
      </div>
    </div>
  );
}

/* ─── Symbol selector for main chart ─── */

const CHART_SYMBOLS = [
  { symbol: "BINANCE:BTCUSDT", label: "BTC/USDT" },
  { symbol: "BINANCE:ETHUSDT", label: "ETH/USDT" },
  { symbol: "BINANCE:SOLUSDT", label: "SOL/USDT" },
  { symbol: "BINANCE:BNBUSDT", label: "BNB/USDT" },
  { symbol: "FX:EURUSD", label: "EUR/USD" },
  { symbol: "FOREXCOM:SPXUSD", label: "S&P 500" },
];

const MINI_CHART_ASSETS = [
  { symbol: "BINANCE:BTCUSDT", label: "Bitcoin" },
  { symbol: "BINANCE:ETHUSDT", label: "Ethereum" },
  { symbol: "BINANCE:SOLUSDT", label: "Solana" },
  { symbol: "BINANCE:XRPUSDT", label: "XRP" },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ─── Main Section Component ─── */

export function LiveMarketSection() {
  const [mainSymbol, setMainSymbol] = useState(CHART_SYMBOLS[0].symbol);

  return (
    <div className="space-y-5">
      {/* ── Ticker Tape ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, ease: EASE }}
      >
        <TickerTape />
      </motion.div>

      {/* ── Main Chart + Market Overview ── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-5">
        {/* Main chart — 3 cols */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
          className="xl:col-span-3 space-y-3"
        >
          {/* Symbol tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <div className="flex items-center gap-1.5 mr-2">
              <TrendingUp className="w-4 h-4 text-brand" />
              <span className="text-xs font-semibold text-text-secondary whitespace-nowrap">Live Chart</span>
            </div>
            {CHART_SYMBOLS.map((s) => (
              <button
                key={s.symbol}
                onClick={() => setMainSymbol(s.symbol)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  mainSymbol === s.symbol
                    ? "bg-brand text-white shadow-sm"
                    : "bg-surface-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-3"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <AdvancedChart symbol={mainSymbol} height={500} />
        </motion.div>

        {/* Market Overview — 1 col */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: EASE }}
          className="space-y-3"
        >
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-info" />
            <span className="text-xs font-semibold text-text-secondary">Market Overview</span>
          </div>
          <MarketOverview height={530} />
        </motion.div>
      </div>

      {/* ── Mini Charts Grid ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
        className="space-y-3"
      >
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-success" />
          <span className="text-xs font-semibold text-text-secondary">Asset Snapshots</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MINI_CHART_ASSETS.map((asset, i) => (
            <motion.div
              key={asset.symbol}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05, ease: EASE }}
            >
              <MiniChartWidget symbol={asset.symbol} height={220} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Trending Markets ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
        className="space-y-3"
      >
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-warning" />
          <span className="text-xs font-semibold text-text-secondary">Trending Markets</span>
        </div>
        <Hotlists height={460} />
      </motion.div>
    </div>
  );
}
