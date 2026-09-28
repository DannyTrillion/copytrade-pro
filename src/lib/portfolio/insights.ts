/**
 * Portfolio insight aggregation.
 *
 * Pure functions over `CopyResult` rows — no I/O, no framework types. Kept
 * out of the route handler so the maths can be tested directly and reused by
 * any other surface (exports, emails, the admin view) without going through
 * HTTP.
 */

import { toMarketCategory } from "@/lib/markets/sessions";

/** Cap the attribution chart; the tail is folded into an "Other" bucket. */
export const TOP_TICKERS = 6;

export type ResultRow = {
  balanceBefore: number;
  balanceAfter: number;
  profitLoss: number;
  resultPercent: number;
  createdAt: Date;
  traderTrade: { tradeName: string; market: string; tradeDate: Date } | null;
};

export function emptySummary() {
  return {
    totalPnl: 0,
    totalTrades: 0,
    winRate: 0,
    bestTicker: null as string | null,
    worstTicker: null as string | null,
    lastTradeAt: null as string | null,
    tradesThisWeek: 0,
    activeMarkets: [] as string[],
  };
}

export function buildSummary(results: ResultRow[]) {
  const totalPnl = results.reduce((sum, r) => sum + r.profitLoss, 0);
  const wins = results.filter((r) => r.profitLoss > 0).length;

  const byTicker = new Map<string, number>();
  for (const r of results) {
    const ticker = normaliseTicker(r.traderTrade?.tradeName);
    byTicker.set(ticker, (byTicker.get(ticker) ?? 0) + r.profitLoss);
  }

  const ranked = [...byTicker.entries()].sort((a, b) => b[1] - a[1]);
  const weekAgo = Date.now() - 7 * 86_400_000;

  const markets = new Set<string>();
  for (const r of results) {
    const market = toMarketCategory(r.traderTrade?.market);
    if (market) markets.add(market);
  }

  return {
    totalPnl,
    totalTrades: results.length,
    winRate: results.length > 0 ? (wins / results.length) * 100 : 0,
    // Only report a best/worst when the sign actually supports the label.
    bestTicker: ranked.length > 0 && ranked[0][1] > 0 ? ranked[0][0] : null,
    worstTicker:
      ranked.length > 0 && ranked[ranked.length - 1][1] < 0
        ? ranked[ranked.length - 1][0]
        : null,
    lastTradeAt: results[results.length - 1].createdAt.toISOString(),
    tradesThisWeek: results.filter((r) => r.createdAt.getTime() >= weekAgo).length,
    activeMarkets: [...markets],
  };
}

/**
 * Equity curve.
 *
 * Uses `balanceAfter` directly rather than accumulating `profitLoss`, so the
 * line reflects the balance the user actually held — deposits and withdrawals
 * included — instead of a synthetic P&L-only series that would disagree with
 * the balance shown elsewhere on the page.
 *
 * Collapsed to one point per day (the day's last result) so a heavy trading
 * day cannot dominate the x-axis.
 */
export function buildEquityCurve(results: ResultRow[]) {
  const byDay = new Map<string, { balance: number; pnl: number; trades: number }>();

  for (const r of results) {
    const day = r.createdAt.toISOString().slice(0, 10);
    const existing = byDay.get(day);

    byDay.set(day, {
      balance: r.balanceAfter,
      pnl: (existing?.pnl ?? 0) + r.profitLoss,
      trades: (existing?.trades ?? 0) + 1,
    });
  }

  let cumulative = 0;

  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, day]) => {
      cumulative += day.pnl;
      return {
        date,
        balance: Number(day.balance.toFixed(2)),
        pnl: Number(day.pnl.toFixed(2)),
        cumulativePnl: Number(cumulative.toFixed(2)),
        trades: day.trades,
      };
    });
}

/**
 * Per-ticker P&L attribution — which symbols actually made or lost money.
 *
 * `TraderTrade.tradeName` holds the symbol ("AAPL", "BTC"), so this is real
 * instrument-level attribution rather than a category rollup.
 */
export function buildTickerAttribution(results: ResultRow[]) {
  const byTicker = new Map<
    string,
    { pnl: number; trades: number; wins: number; markets: Set<string> }
  >();

  for (const r of results) {
    const ticker = normaliseTicker(r.traderTrade?.tradeName);
    const entry = byTicker.get(ticker) ?? {
      pnl: 0,
      trades: 0,
      wins: 0,
      markets: new Set<string>(),
    };

    entry.pnl += r.profitLoss;
    entry.trades += 1;
    if (r.profitLoss > 0) entry.wins += 1;
    if (r.traderTrade?.market) entry.markets.add(r.traderTrade.market);

    byTicker.set(ticker, entry);
  }

  const rows = [...byTicker.entries()].map(([ticker, e]) => ({
    ticker,
    pnl: Number(e.pnl.toFixed(2)),
    trades: e.trades,
    winRate: Number(((e.wins / e.trades) * 100).toFixed(1)),
    market: [...e.markets][0] ?? "Unknown",
  }));

  // Rank by absolute impact: the biggest loser is as informative as the
  // biggest winner, and sorting by raw P&L would bury it.
  rows.sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));

  const top = rows.slice(0, TOP_TICKERS);
  const rest = rows.slice(TOP_TICKERS);

  if (rest.length > 0) {
    top.push({
      ticker: `Other (${rest.length})`,
      pnl: Number(rest.reduce((s, r) => s + r.pnl, 0).toFixed(2)),
      trades: rest.reduce((s, r) => s + r.trades, 0),
      winRate: 0,
      market: "Mixed",
    });
  }

  return top;
}

/** Allocation and P&L split across the venues the user is exposed to. */
export function buildMarketAllocation(results: ResultRow[]) {
  const byMarket = new Map<string, { pnl: number; trades: number; volume: number }>();

  for (const r of results) {
    const market = r.traderTrade?.market?.trim() || "Unknown";
    const entry = byMarket.get(market) ?? { pnl: 0, trades: 0, volume: 0 };

    entry.pnl += r.profitLoss;
    entry.trades += 1;
    // Absolute movement — a fair proxy for exposure when position size is
    // not recorded on the trade.
    entry.volume += Math.abs(r.profitLoss);

    byMarket.set(market, entry);
  }

  const totalVolume = [...byMarket.values()].reduce((s, e) => s + e.volume, 0);

  return [...byMarket.entries()]
    .map(([market, e]) => ({
      market,
      pnl: Number(e.pnl.toFixed(2)),
      trades: e.trades,
      share: totalVolume > 0 ? Number(((e.volume / totalVolume) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.trades - a.trades);
}

/** Symbols are free text on upload, so normalise before grouping. */
export function normaliseTicker(raw: string | null | undefined): string {
  if (!raw) return "Unknown";
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return "Unknown";
  // "BTC LONG" and "BTC" are the same instrument for attribution purposes.
  return trimmed.split(/[\s/\-_]+/)[0].slice(0, 12);
}
