/**
 * Verifies the portfolio insight aggregation and the live price provider.
 *   npx tsx scripts/verify-portfolio-insights.ts
 */
import {
  buildEquityCurve, buildMarketAllocation, buildSummary,
  buildTickerAttribution, normaliseTicker, type ResultRow,
} from "../src/lib/portfolio/insights";
import { COINGECKO_IDS, filterPriceable } from "../src/lib/markets/prices";

let pass = 0, fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}\n      expected: ${e}\n      actual:   ${a}`); }
}

const row = (o: Partial<ResultRow> & { pnl: number; day: string; ticker?: string; market?: string; balance?: number }): ResultRow => ({
  balanceBefore: (o.balance ?? 1000) - o.pnl,
  balanceAfter: o.balance ?? 1000,
  profitLoss: o.pnl,
  resultPercent: 0,
  createdAt: new Date(`${o.day}T12:00:00Z`),
  traderTrade: { tradeName: o.ticker ?? "BTC", market: o.market ?? "Crypto", tradeDate: new Date(`${o.day}T12:00:00Z`) },
});

console.log("\n── Ticker normalisation ──");
check("strips direction suffix", normaliseTicker("BTC Long"), "BTC");
check("uppercases", normaliseTicker("aapl"), "AAPL");
check("splits on slash", normaliseTicker("EUR/USD"), "EUR");
check("handles null", normaliseTicker(null), "Unknown");
check("handles blank", normaliseTicker("   "), "Unknown");

console.log("\n── Equity curve ──");
const curve = buildEquityCurve([
  row({ day: "2026-01-01", pnl: 100, balance: 1100 }),
  row({ day: "2026-01-01", pnl: 50,  balance: 1150 }),
  row({ day: "2026-01-02", pnl: -30, balance: 1120 }),
]);
check("collapses to one point per day", curve.length, 2);
check("day 1 pnl sums both trades", curve[0].pnl, 150);
check("day 1 balance = last of day", curve[0].balance, 1150);
check("day 1 trade count", curve[0].trades, 2);
check("cumulative accumulates", curve[1].cumulativePnl, 120);
check("balance tracks real balance", curve[1].balance, 1120);

console.log("\n── Ticker attribution ──");
const attribution = buildTickerAttribution([
  row({ day: "2026-01-01", pnl: 500, ticker: "BTC" }),
  row({ day: "2026-01-02", pnl: -900, ticker: "ETH" }),
  row({ day: "2026-01-03", pnl: 100, ticker: "SOL" }),
  row({ day: "2026-01-04", pnl: -50, ticker: "BTC" }),
]);
check("biggest absolute impact ranks first", attribution[0].ticker, "ETH");
check("losses are preserved as negative", attribution[0].pnl, -900);
check("same ticker aggregates", attribution.find(a => a.ticker === "BTC")?.pnl, 450);
check("win rate computed", attribution.find(a => a.ticker === "SOL")?.winRate, 100);
check("BTC win rate 1 of 2", attribution.find(a => a.ticker === "BTC")?.winRate, 50);

const many = Array.from({ length: 10 }, (_, i) =>
  row({ day: "2026-01-01", pnl: 100 - i * 10, ticker: `T${i}` }));
const capped = buildTickerAttribution(many);
check("caps at 6 + Other", capped.length, 7);
check("Other bucket labelled with count", capped[6].ticker, "Other (4)");

console.log("\n── Market allocation ──");
const allocation = buildMarketAllocation([
  row({ day: "2026-01-01", pnl: 100, market: "Crypto" }),
  row({ day: "2026-01-02", pnl: -100, market: "Crypto" }),
  row({ day: "2026-01-03", pnl: 200, market: "Forex" }),
]);
check("groups by market", allocation.length, 2);
check("crypto nets to zero", allocation.find(a => a.market === "Crypto")?.pnl, 0);
check("shares sum to 100", Math.round(allocation.reduce((s, a) => s + a.share, 0)), 100);
check("crypto share by absolute movement", allocation.find(a => a.market === "Crypto")?.share, 50);

console.log("\n── Summary ──");
const summary = buildSummary([
  row({ day: "2026-01-01", pnl: 500, ticker: "BTC", market: "Crypto" }),
  row({ day: "2026-01-02", pnl: -200, ticker: "ETH", market: "Crypto" }),
  row({ day: "2026-01-03", pnl: 100, ticker: "EUR", market: "Forex" }),
]);
check("total pnl", summary.totalPnl, 400);
check("trade count", summary.totalTrades, 3);
check("win rate", Math.round(summary.winRate), 67);
check("best ticker", summary.bestTicker, "BTC");
check("worst ticker", summary.worstTicker, "ETH");
check("active markets", summary.activeMarkets.sort(), ["Crypto", "Forex"]);

const allLosses = buildSummary([row({ day: "2026-01-01", pnl: -50, ticker: "BTC" })]);
check("no best ticker when all losing", allLosses.bestTicker, null);

async function priceProvider() {
  console.log("\n── Price provider ──");
  check("filters non-crypto tickers", filterPriceable(["BTC", "AAPL", "ETH", "SPX"]), ["BTC", "ETH"]);
  check("dedupes", filterPriceable(["BTC", "btc", "BTC"]), ["BTC"]);
  check("respects max", filterPriceable(["BTC","ETH","SOL","XRP"], 2), ["BTC", "ETH"]);

  const ids = Object.values(COINGECKO_IDS).join(",");
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
  check("upstream reachable", res.status, 200);

  const payload = await res.json() as Record<string, { usd?: number }>;
  const missing = Object.entries(COINGECKO_IDS).filter(([, id]) => typeof payload[id]?.usd !== "number");
  check("every mapped symbol resolves upstream", missing.map(([s]) => s), []);
  console.log(`  (BTC spot: $${payload.bitcoin?.usd?.toLocaleString()})`);
}

priceProvider().finally(() => {
  console.log(`\n${"─".repeat(48)}\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
});
