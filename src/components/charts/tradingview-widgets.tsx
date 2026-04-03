"use client";

import { useEffect, useRef, memo } from "react";
import { useTheme } from "@/components/theme/theme-provider";

/* ─────────────── Shared script injector ─────────────── */

function useWidget(
  containerRef: React.RefObject<HTMLDivElement | null>,
  scriptSrc: string,
  config: Record<string, unknown>,
  deps: unknown[] = []
) {
  const createdRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (createdRef.current && container.querySelector("script")) return;
    createdRef.current = true;

    container.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container";
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    widgetContainer.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify(config);
    widgetContainer.appendChild(script);

    container.appendChild(widgetContainer);

    return () => {
      createdRef.current = false;
      if (container) container.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ─────────────── Advanced Chart (Main Large Chart) ─────────────── */

interface AdvancedChartProps {
  symbol?: string;
  height?: number;
}

export const AdvancedChart = memo(function AdvancedChart({
  symbol = "BINANCE:BTCUSDT",
  height = 500,
}: AdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const tvTheme = theme === "light" ? "light" : "dark";
  const bgColor = theme === "light" ? "rgba(248, 249, 251, 1)" : "rgba(18, 19, 26, 1)";
  const gridColor = theme === "light" ? "rgba(229, 231, 235, 0.6)" : "rgba(30, 31, 43, 0.6)";

  useWidget(
    containerRef,
    "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js",
    {
      autosize: true,
      symbol,
      interval: "15",
      timezone: "Etc/UTC",
      theme: tvTheme,
      style: "1",
      locale: "en",
      backgroundColor: bgColor,
      gridColor: gridColor,
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    },
    [symbol, height, tvTheme]
  );

  return (
    <div
      className="tradingview-widget-container rounded-xl overflow-hidden border border-border"
      style={{ height }}
    >
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
});

/* ─────────────── Mini Chart Widget ─────────────── */

interface MiniChartWidgetProps {
  symbol?: string;
  width?: string;
  height?: number;
}

export const MiniChartWidget = memo(function MiniChartWidget({
  symbol = "BINANCE:BTCUSDT",
  height = 220,
}: MiniChartWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const tvTheme = theme === "light" ? "light" : "dark";

  useWidget(
    containerRef,
    "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js",
    {
      symbol,
      width: "100%",
      height,
      locale: "en",
      dateRange: "1D",
      colorTheme: tvTheme,
      isTransparent: true,
      autosize: false,
      largeChartUrl: "",
      chartOnly: false,
      noTimeScale: false,
    },
    [symbol, height, tvTheme]
  );

  return (
    <div
      className="tradingview-widget-container rounded-xl overflow-hidden border border-border bg-surface-1"
      style={{ height }}
    >
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
});

/* ─────────────── Market Overview / Watchlist ─────────────── */

interface MarketOverviewProps {
  height?: number;
}

export const MarketOverview = memo(function MarketOverview({
  height = 500,
}: MarketOverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const tvTheme = theme === "light" ? "light" : "dark";

  useWidget(
    containerRef,
    "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js",
    {
      colorTheme: tvTheme,
      dateRange: "1D",
      showChart: true,
      locale: "en",
      largeChartUrl: "",
      isTransparent: true,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      width: "100%",
      height,
      tabs: [
        {
          title: "Crypto",
          symbols: [
            { s: "BINANCE:BTCUSDT", d: "Bitcoin" },
            { s: "BINANCE:ETHUSDT", d: "Ethereum" },
            { s: "BINANCE:SOLUSDT", d: "Solana" },
            { s: "BINANCE:BNBUSDT", d: "BNB" },
            { s: "BINANCE:XRPUSDT", d: "XRP" },
            { s: "BINANCE:ADAUSDT", d: "Cardano" },
          ],
          originalTitle: "Crypto",
        },
        {
          title: "Forex",
          symbols: [
            { s: "FX:EURUSD", d: "EUR/USD" },
            { s: "FX:GBPUSD", d: "GBP/USD" },
            { s: "FX:USDJPY", d: "USD/JPY" },
            { s: "FX:AUDUSD", d: "AUD/USD" },
          ],
          originalTitle: "Forex",
        },
        {
          title: "Indices",
          symbols: [
            { s: "FOREXCOM:SPXUSD", d: "S&P 500" },
            { s: "FOREXCOM:NSXUSD", d: "NASDAQ" },
            { s: "FOREXCOM:DJI", d: "Dow Jones" },
          ],
          originalTitle: "Indices",
        },
      ],
    },
    [height, tvTheme]
  );

  return (
    <div
      className="tradingview-widget-container rounded-xl overflow-hidden border border-border bg-surface-1"
      style={{ height }}
    >
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
});

/* ─────────────── Ticker Tape (Horizontal scrolling prices) ─────────────── */

export const TickerTape = memo(function TickerTape() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const tvTheme = theme === "light" ? "light" : "dark";

  useWidget(
    containerRef,
    "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js",
    {
      symbols: [
        { proName: "BINANCE:BTCUSDT", title: "BTC/USDT" },
        { proName: "BINANCE:ETHUSDT", title: "ETH/USDT" },
        { proName: "BINANCE:SOLUSDT", title: "SOL/USDT" },
        { proName: "BINANCE:BNBUSDT", title: "BNB/USDT" },
        { proName: "BINANCE:XRPUSDT", title: "XRP/USDT" },
        { proName: "FX:EURUSD", title: "EUR/USD" },
        { proName: "FX:GBPUSD", title: "GBP/USD" },
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
        { proName: "FOREXCOM:NSXUSD", title: "NASDAQ" },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: tvTheme,
      locale: "en",
    },
    [tvTheme]
  );

  return (
    <div className="tradingview-widget-container overflow-hidden rounded-xl border border-border bg-surface-1">
      <div ref={containerRef} />
    </div>
  );
});

/* ─────────────── Hotlists / Trending Markets ─────────────── */

interface HotlistsProps {
  height?: number;
}

export const Hotlists = memo(function Hotlists({ height = 500 }: HotlistsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const tvTheme = theme === "light" ? "light" : "dark";

  useWidget(
    containerRef,
    "https://s3.tradingview.com/external-embedding/embed-widget-hotlists.js",
    {
      colorTheme: tvTheme,
      dateRange: "1D",
      exchange: "CRYPTO",
      showChart: true,
      locale: "en",
      largeChartUrl: "",
      isTransparent: true,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      width: "100%",
      height,
    },
    [height, tvTheme]
  );

  return (
    <div
      className="tradingview-widget-container rounded-xl overflow-hidden border border-border bg-surface-1"
      style={{ height }}
    >
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
});
