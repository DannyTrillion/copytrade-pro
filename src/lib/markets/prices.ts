/**
 * Shared contract for the live price feed.
 *
 * Kept out of the route module so both the client and the API handler can
 * import it: Next.js route files are expected to export only route handlers
 * and segment config.
 *
 * PROVIDER NOTE: this deliberately does not use Binance. Binance answers
 * HTTP 451 ("restricted location") to a large set of regions including
 * US-hosted serverless functions, so it fails exactly where this app is
 * deployed. CoinGecko's public endpoint is reachable globally, needs no key,
 * and returns price and 24h change in a single call.
 */

export interface TickerPrice {
  symbol: string;
  price: number;
  /** 24-hour change, percent. */
  changePercent: number;
  /** 24-hour traded volume in USD. */
  volume: number;
  /**
   * Downsampled 7-day price series for the sparkline. Kept short server-side:
   * the upstream returns 168 hourly points per asset, which is far more
   * resolution than a 60px sparkline can show and multiplies payload size
   * across every symbol on screen.
   */
  sparkline: number[];
}

/** Points retained per sparkline after downsampling. */
export const SPARKLINE_POINTS = 32;

export interface PriceResponse {
  prices: TickerPrice[];
  available: boolean;
  cached?: boolean;
  stale?: boolean;
  reason?: string;
}

/**
 * Ticker symbol → upstream asset id.
 *
 * This map is also the definition of "priceable": equity and index tickers
 * that appear in the trade log (AAPL, SPX, XAU) have no entry, so they are
 * filtered out on both sides rather than sent upstream to fail.
 */
export const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  BNB: "binancecoin",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  LINK: "chainlink",
  LTC: "litecoin",
  TRX: "tron",
  SHIB: "shiba-inu",
  UNI: "uniswap",
  ATOM: "cosmos",
  XLM: "stellar",
  NEAR: "near",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  FIL: "filecoin",
  ICP: "internet-computer",
  ETC: "ethereum-classic",
  HBAR: "hedera-hashgraph",
  VET: "vechain",
  INJ: "injective-protocol",
  SUI: "sui",
  TIA: "celestia",
  SEI: "sei-network",
};

export function isPriceable(symbol: string): boolean {
  return symbol.trim().toUpperCase() in COINGECKO_IDS;
}

/** Keep only the symbols worth asking the upstream about. */
export function filterPriceable(symbols: string[], max = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of symbols) {
    const symbol = raw.trim().toUpperCase();
    if (!isPriceable(symbol) || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push(symbol);
    if (out.length >= max) break;
  }

  return out;
}
