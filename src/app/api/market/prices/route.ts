/**
 * Live crypto prices.
 *
 * GET /api/market/prices?symbols=BTC,ETH,SOL
 *
 * Proxied server-side rather than called from the browser for three reasons:
 * the upstream sets no permissive CORS headers, a shared server cache means
 * 200 concurrent dashboards make one upstream call instead of 200, and the
 * provider can be swapped here without shipping new client code.
 *
 * DEGRADES QUIETLY BY DESIGN. Binance answers HTTP 451 to US-hosted requests,
 * and any upstream can rate-limit or fall over. Every failure path returns
 * `{ prices: [], available: false }` with HTTP 200 so the dashboard simply
 * omits the ticker strip. A price widget must never be able to break the page
 * a user opens to check their balance.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";
import {
  COINGECKO_IDS,
  SPARKLINE_POINTS,
  filterPriceable,
  type TickerPrice,
} from "@/lib/markets/prices";

export const dynamic = "force-dynamic";

/** Upstream is only consulted this often; everyone else is served the cache. */
// 30s: the upstream free tier is rate-limited and a market pulse does not
// need sub-minute resolution.
const CACHE_TTL_MS = 30_000;
const UPSTREAM_TIMEOUT_MS = 4_000;
const MAX_SYMBOLS = 12;

interface CacheEntry {
  at: number;
  prices: TickerPrice[];
}

/**
 * Held on globalThis so dev-mode hot reloads reuse one cache rather than
 * leaking a fresh one per reload — same pattern as the Prisma client here.
 */
const globalForPrices = globalThis as unknown as {
  marketPriceCache: Map<string, CacheEntry> | undefined;
};

const cache: Map<string, CacheEntry> =
  globalForPrices.marketPriceCache ?? new Map();

if (process.env.NODE_ENV !== "production") {
  globalForPrices.marketPriceCache = cache;
}

export async function GET(req: NextRequest) {
  try {
    // Authenticated: this is dashboard furniture, not a public price API, and
    // leaving it open would let anyone use the deployment as a free proxy.
    await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(req.url);

  const symbols = filterPriceable(
    (searchParams.get("symbols") ?? "BTC,ETH,SOL").split(","),
    MAX_SYMBOLS
  );

  if (symbols.length === 0) {
    return NextResponse.json({ prices: [], available: false, reason: "no-priceable-symbols" });
  }

  const key = symbols.sort().join(",");
  const hit = cache.get(key);

  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json({ prices: hit.prices, available: true, cached: true });
  }

  const prices = await fetchUpstream(symbols);

  if (prices === null) {
    // Serve stale data over nothing — a slightly old price beats a blank strip.
    if (hit) {
      return NextResponse.json({ prices: hit.prices, available: true, stale: true });
    }
    return NextResponse.json({ prices: [], available: false, reason: "upstream-unavailable" });
  }

  cache.set(key, { at: Date.now(), prices });

  return NextResponse.json({ prices, available: true, cached: false });
}

/** Returns null on any failure; the caller decides how to degrade. */
async function fetchUpstream(symbols: string[]): Promise<TickerPrice[] | null> {
  const ids = symbols.map((s) => COINGECKO_IDS[s]).filter(Boolean);
  if (ids.length === 0) return null;

  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    "?vs_currency=usd" +
    `&ids=${encodeURIComponent(ids.join(","))}` +
    "&order=market_cap_desc&sparkline=true&price_change_percentage=24h";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      // 429 is the free-tier rate limit; the cache above normally prevents it.
      console.warn(`[market/prices] Upstream ${res.status}`);
      return null;
    }

    const raw: unknown = await res.json();
    if (!Array.isArray(raw)) return null;

    const bySymbol = new Map<string, TickerPrice>();

    for (const entry of raw) {
      const ticker = toTicker(entry);
      if (ticker) bySymbol.set(ticker.symbol, ticker);
    }

    // Preserve the caller's ordering rather than the upstream's market-cap
    // sort, so the strip matches the instruments the user actually trades.
    return symbols
      .map((symbol) => bySymbol.get(symbol))
      .filter((t): t is TickerPrice => t !== undefined);
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    console.warn(`[market/prices] Upstream ${aborted ? "timed out" : "failed"}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function toTicker(entry: unknown): TickerPrice | null {
  if (typeof entry !== "object" || entry === null) return null;

  const e = entry as Record<string, unknown>;
  const symbol = typeof e.symbol === "string" ? e.symbol.toUpperCase() : null;
  const price = Number(e.current_price);

  if (!symbol || !Number.isFinite(price)) return null;

  const rawSeries = (e.sparkline_in_7d as { price?: unknown } | undefined)?.price;
  const series = Array.isArray(rawSeries)
    ? rawSeries.filter((n): n is number => typeof n === "number" && Number.isFinite(n))
    : [];

  return {
    symbol,
    price,
    changePercent: Number(e.price_change_percentage_24h) || 0,
    volume: Number(e.total_volume) || 0,
    sparkline: downsample(series, SPARKLINE_POINTS),
  };
}

/**
 * Evenly sample a series down to `points`, always keeping the final value so
 * the sparkline's right edge matches the quoted price.
 */
function downsample(series: number[], points: number): number[] {
  if (series.length <= points) return series;

  const step = (series.length - 1) / (points - 1);
  const out: number[] = [];

  for (let i = 0; i < points; i++) {
    out.push(series[Math.round(i * step)]);
  }

  return out;
}
