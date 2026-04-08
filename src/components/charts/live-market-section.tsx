"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/theme-provider";

const AdvancedChart = dynamic(
  () => import("./tradingview-widgets").then((m) => ({ default: m.AdvancedChart })),
  { ssr: false, loading: () => <WidgetSkeleton height={500} /> }
);

function WidgetSkeleton({ height }: { height: number }) {
  return (
    <div
      className="rounded-xl border border-border bg-surface-1 animate-pulse flex items-center justify-center"
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-surface-3" />
        <div className="w-24 h-2 bg-surface-3 rounded" />
      </div>
    </div>
  );
}

const CHART_SYMBOLS = [
  { symbol: "BINANCE:BTCUSDT", label: "BTC/USDT" },
  { symbol: "BINANCE:ETHUSDT", label: "ETH/USDT" },
  { symbol: "BINANCE:SOLUSDT", label: "SOL/USDT" },
  { symbol: "BINANCE:BNBUSDT", label: "BNB/USDT" },
  { symbol: "FX:EURUSD", label: "EUR/USD" },
  { symbol: "FOREXCOM:SPXUSD", label: "S&P 500" },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function LiveMarketSection() {
  const [mainSymbol, setMainSymbol] = useState(CHART_SYMBOLS[0].symbol);
  const { theme } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
      className="space-y-3"
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
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border-none",
              mainSymbol === s.symbol
                ? "bg-brand text-white shadow-sm"
                : "bg-surface-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-3"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Main advanced chart */}
      <AdvancedChart key={`chart-${theme}`} symbol={mainSymbol} height={500} />
    </motion.div>
  );
}
