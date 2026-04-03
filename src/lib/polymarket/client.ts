interface TradeParams {
  walletAddress: string;
  action: "BUY" | "SELL";
  symbol: string;
  amount: number;
  price: number;
}

interface TradeResult {
  txHash: string;
  status: "success" | "failed";
  executedPrice: number;
  executedAmount: number;
}

const POLYMARKET_API_URL = process.env.POLYMARKET_API_URL || "https://clob.polymarket.com";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executePolymarketTrade(params: TradeParams): Promise<TradeResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await executeTrade(params);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Trade attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
      }
    }
  }

  throw lastError || new Error("Trade execution failed after retries");
}

async function executeTrade(params: TradeParams): Promise<TradeResult> {
  // Polymarket CLOB API integration
  // In production, this would use the Polymarket SDK or direct API calls
  // with proper wallet signing via ethers.js

  const endpoint = `${POLYMARKET_API_URL}/order`;

  const orderPayload = {
    tokenID: params.symbol,
    price: params.price.toString(),
    size: params.amount.toString(),
    side: params.action,
    feeRateBps: "0",
    nonce: Date.now().toString(),
    expiration: (Math.floor(Date.now() / 1000) + 300).toString(), // 5 min expiry
    taker: params.walletAddress,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.POLYMARKET_API_KEY && {
          Authorization: `Bearer ${process.env.POLYMARKET_API_KEY}`,
        }),
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Polymarket API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();

    return {
      txHash: data.transactionHash || data.orderID || `pm-${Date.now()}`,
      status: "success",
      executedPrice: data.price ? parseFloat(data.price) : params.price,
      executedAmount: data.size ? parseFloat(data.size) : params.amount,
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Network error: Unable to reach Polymarket API");
    }
    throw error;
  }
}

export async function getMarketData(tokenId: string): Promise<{
  price: number;
  volume: number;
  liquidity: number;
} | null> {
  try {
    const response = await fetch(`${POLYMARKET_API_URL}/book?token_id=${tokenId}`);
    if (!response.ok) return null;

    const data = await response.json();
    return {
      price: parseFloat(data.market?.price || "0"),
      volume: parseFloat(data.market?.volume || "0"),
      liquidity: parseFloat(data.market?.liquidity || "0"),
    };
  } catch {
    return null;
  }
}
