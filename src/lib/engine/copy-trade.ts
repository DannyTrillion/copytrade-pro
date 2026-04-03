import { prisma } from "@/lib/prisma";
import { executePolymarketTrade } from "@/lib/polymarket/client";
import { COMMISSION_RATE } from "@/config/constants";

/**
 * Legacy webhook-based signal processing engine.
 * The primary flow now uses TraderTrade + internal balance system (see /api/trader-trades).
 * This engine is kept for backward compatibility with the TradingView webhook flow.
 */
export async function processSignal(signalId: string): Promise<void> {
  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
    include: {
      trader: {
        include: {
          followers: {
            where: { copyEnabled: true, approved: true },
            include: {
              user: {
                include: { wallet: true },
              },
            },
          },
        },
      },
    },
  });

  if (!signal) {
    console.error(`Signal ${signalId} not found`);
    return;
  }

  const followers = signal.trader.followers;

  if (followers.length === 0) {
    await prisma.signal.update({
      where: { id: signalId },
      data: { status: "COMPLETED" },
    });
    return;
  }

  // Process each follower's trade concurrently with concurrency limit
  const BATCH_SIZE = 10;
  for (let i = 0; i < followers.length; i += BATCH_SIZE) {
    const batch = followers.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map((follower) => processFollowerTrade(signal, follower))
    );
  }

  // Update signal status
  const trades = await prisma.trade.findMany({
    where: { signalId },
    select: { status: true },
  });

  const allCompleted = trades.every((t) => t.status === "COMPLETED" || t.status === "FAILED");
  if (allCompleted) {
    await prisma.signal.update({
      where: { id: signalId },
      data: { status: "COMPLETED" },
    });
  }

  // Update trader stats
  await updateTraderStats(signal.traderId);
}

async function processFollowerTrade(
  signal: {
    id: string;
    action: string;
    symbol: string;
    price: number;
    riskPercent: number;
  },
  follower: {
    id: string;
    userId: string;
    allocationPercent: number;
    user: {
      id: string;
      wallet: { address: string; isConnected: boolean } | null;
    };
  }
): Promise<void> {
  const wallet = follower.user.wallet;

  if (!wallet || !wallet.address || !wallet.isConnected) {
    console.warn(`Follower ${follower.userId} has no connected wallet`);
    return;
  }

  // Calculate trade size based on signal risk and follower allocation
  const tradeAmount = signal.price * (signal.riskPercent / 100) * (follower.allocationPercent / 100);

  // Create trade record
  const trade = await prisma.trade.create({
    data: {
      userId: follower.userId,
      signalId: signal.id,
      action: signal.action,
      symbol: signal.symbol,
      amount: tradeAmount,
      price: signal.price,
      status: "EXECUTING",
    },
  });

  try {
    // Execute on Polymarket
    const result = await executePolymarketTrade({
      walletAddress: wallet.address,
      action: signal.action as "BUY" | "SELL",
      symbol: signal.symbol,
      amount: tradeAmount,
      price: signal.price,
    });

    // Update trade as completed
    await prisma.trade.update({
      where: { id: trade.id },
      data: {
        status: "COMPLETED",
        txHash: result.txHash,
      },
    });

    // Calculate and save commission
    const commissionAmount = tradeAmount * COMMISSION_RATE;
    await prisma.commission.create({
      data: {
        tradeId: trade.id,
        amount: commissionAmount,
        rate: COMMISSION_RATE,
        status: "COLLECTED",
      },
    });
  } catch (error) {
    console.error(`Trade execution failed for ${follower.userId}:`, error);

    await prisma.trade.update({
      where: { id: trade.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

async function updateTraderStats(traderId: string): Promise<void> {
  const trades = await prisma.trade.findMany({
    where: {
      signal: { traderId },
      status: "COMPLETED",
    },
    select: { pnl: true },
  });

  const totalTrades = trades.length;
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winningTrades = trades.filter((t) => (t.pnl || 0) > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  await prisma.trader.update({
    where: { id: traderId },
    data: { totalTrades, totalPnl, winRate },
  });
}
