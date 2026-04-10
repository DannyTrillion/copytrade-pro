import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { z } from "zod";
import { notifyTradeResult } from "@/lib/notifications";
import { canReceiveTrade, getTotalDeposited } from "@/lib/tiers";

const uploadTradeSchema = z.object({
  tradeName: z.string().min(1, "Trade name is required").max(100),
  market: z.string().min(1, "Market is required").max(50),
  tradeType: z.enum(["BUY", "SELL"]).optional(),
  resultPercent: z.number().min(-100).max(10000),
  profitLoss: z.number(),
  tradeAmount: z.number().positive().optional(),
  targetMode: z.enum(["ALL", "SELECTED"]).default("ALL"),
  targetUserIds: z.array(z.string()).optional(), // user IDs for SELECTED mode
  notes: z.string().max(1000).optional(),
  screenshotUrl: z.string().url().optional(),
  tradeDate: z.string().optional(),
});

/**
 * GET — Fetch trader trades.
 * MASTER_TRADER sees own trades. FOLLOWER sees trades of traders they follow. ADMIN sees all.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const traderId = searchParams.get("traderId");

    let where: Record<string, unknown> = {};

    if (user.role === "MASTER_TRADER") {
      const trader = await prisma.trader.findUnique({ where: { userId: user.id } });
      if (!trader) return NextResponse.json({ trades: [] });
      where = { traderId: trader.id };
    } else if (user.role === "FOLLOWER") {
      if (traderId) {
        where = { traderId };
      } else {
        const following = await prisma.follower.findMany({
          where: { userId: user.id, approved: true, copyEnabled: true },
          select: { traderId: true },
        });
        where = { traderId: { in: following.map((f) => f.traderId) } };
      }
    }

    const trades = await prisma.traderTrade.findMany({
      where,
      include: {
        trader: { select: { displayName: true } },
        _count: { select: { copyResults: true } },
      },
      orderBy: { tradeDate: "desc" },
      take: limit,
    });

    return NextResponse.json({ trades });
  } catch {
    return unauthorizedResponse();
  }
}

/**
 * POST — Master trader uploads a trade. Automatically applies to all approved followers.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role !== "MASTER_TRADER" && user.role !== "ADMIN") {
      return errorResponse("Only master traders can upload trades", 403);
    }

    const trader = await prisma.trader.findUnique({ where: { userId: user.id } });
    if (!trader) {
      return errorResponse("Trader profile not found", 404);
    }

    const body = await req.json();
    const data = uploadTradeSchema.parse(body);

    const targetMode = data.targetMode || "ALL";
    const targetUserIds = data.targetUserIds || [];

    // 1. Create the trader trade
    const traderTrade = await prisma.traderTrade.create({
      data: {
        traderId: trader.id,
        tradeName: data.tradeName,
        market: data.market,
        tradeType: data.tradeType || null,
        resultPercent: data.resultPercent,
        profitLoss: data.profitLoss,
        tradeAmount: data.tradeAmount || null,
        targetMode,
        targetUserIds: targetMode === "SELECTED" ? targetUserIds.join(",") : null,
        notes: data.notes || null,
        screenshotUrl: data.screenshotUrl || null,
        tradeDate: data.tradeDate ? new Date(data.tradeDate) : new Date(),
      },
    });

    // 2. Get followers — filter by targetMode
    const followerWhere: Record<string, unknown> = {
      traderId: trader.id,
      approved: true,
      copyEnabled: true,
    };

    // If SELECTED mode, only apply to specific users
    if (targetMode === "SELECTED" && targetUserIds.length > 0) {
      followerWhere.userId = { in: targetUserIds };
    }

    const followers = await prisma.follower.findMany({
      where: followerWhere,
      include: {
        user: {
          include: { balance: true },
        },
      },
    });

    let affectedCount = 0;
    let skippedByTier = 0;

    for (const follower of followers) {
      const balance = follower.user.balance;
      if (!balance) continue;

      // ── Tier-based daily trade limit check ──
      const tradeCheck = await canReceiveTrade(follower.userId);
      if (!tradeCheck.allowed) {
        skippedByTier++;
        continue;
      }

      // Base amount = total deposited capital (not current balance which includes P&L)
      // This ensures allocation is always calculated on deposited funds only
      const totalDeposited = await getTotalDeposited(follower.userId);
      const baseAmount = totalDeposited > 0 ? totalDeposited : balance.totalBalance;

      // Skip if the user has zero funds entirely
      if (baseAmount <= 0) continue;

      // allocationPercent from Follower record (default 100 = full allocation)
      const allocationPct = follower.allocationPercent ?? 100;
      const followerAllocation = baseAmount * (allocationPct / 100);

      // Apply tier-specific commission on profits
      const rawPnl = followerAllocation * (data.resultPercent / 100);
      const commission = rawPnl > 0 ? rawPnl * tradeCheck.tier.commissionRate : 0;
      const followerPnl = rawPnl - commission;

      // Calculate new balances — PnL applies to actual balance, but was calculated on deposited capital
      const newTotal = Math.max(0, balance.totalBalance + followerPnl);
      const newProfit = balance.totalProfit + followerPnl;
      // If user has explicit allocation, PnL goes to allocated; otherwise to available
      const newAllocated = balance.allocatedBalance > 0
        ? Math.max(0, balance.allocatedBalance + followerPnl)
        : balance.allocatedBalance;
      const newAvailable = balance.allocatedBalance > 0
        ? balance.availableBalance
        : Math.max(0, balance.availableBalance + followerPnl);

      // Update follower balance atomically
      await prisma.balance.update({
        where: { userId: follower.userId },
        data: {
          allocatedBalance: newAllocated,
          totalBalance: newTotal,
          availableBalance: newAvailable,
          totalProfit: newProfit,
        },
      });

      // Record copy result — one entry per follower per trade
      await prisma.copyResult.create({
        data: {
          userId: follower.userId,
          traderTradeId: traderTrade.id,
          balanceBefore: baseAmount,
          balanceAfter: newAllocated,
          profitLoss: followerPnl,
          resultPercent: data.resultPercent,
        },
      });

      // Record balance transaction for history
      await prisma.balanceTransaction.create({
        data: {
          userId: follower.userId,
          type: followerPnl >= 0 ? "COPY_PROFIT" : "COPY_LOSS",
          amount: followerPnl,
          balanceBefore: balance.totalBalance,
          balanceAfter: newTotal,
          description: `Copy trade: ${data.tradeName} (${data.resultPercent > 0 ? "+" : ""}${data.resultPercent}%)`,
        },
      });

      // Notify follower of trade result
      notifyTradeResult(follower.userId, data.tradeName, followerPnl).catch(() => {});

      affectedCount++;
    }

    // 3. Update trader stats
    const allTrades = await prisma.traderTrade.findMany({
      where: { traderId: trader.id },
      select: { resultPercent: true, profitLoss: true },
    });

    const totalTrades = allTrades.length;
    const totalPnl = allTrades.reduce((sum, t) => sum + t.profitLoss, 0);
    const wins = allTrades.filter((t) => t.resultPercent > 0).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    await prisma.trader.update({
      where: { id: trader.id },
      data: { totalTrades, totalPnl, winRate },
    });

    return NextResponse.json({
      trade: traderTrade,
      affectedFollowers: affectedCount,
      skippedByTierLimit: skippedByTier,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("Trade upload failed:", error);
    return errorResponse("Failed to upload trade");
  }
}
