import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role === "MASTER_TRADER") {
      const trader = await prisma.trader.findUnique({
        where: { userId: user.id },
        include: {
          _count: { select: { followers: true } },
        },
      });

      if (!trader) {
        return NextResponse.json({ stats: null });
      }

      return NextResponse.json({
        stats: {
          totalPnl: trader.totalPnl,
          winRate: Math.round(trader.winRate * 10) / 10,
          totalTrades: trader.totalTrades,
          activeFollowers: trader._count.followers,
        },
      });
    }

    if (user.role === "FOLLOWER" || user.role === "ADMIN") {
      const balance = await prisma.balance.findUnique({
        where: { userId: user.id },
      });

      const following = await prisma.follower.count({
        where: { userId: user.id, approved: true, copyEnabled: true },
      });

      const copyResults = await prisma.copyResult.findMany({
        where: { userId: user.id },
        select: { profitLoss: true },
      });

      const totalCopyPnl = copyResults.reduce((sum, r) => sum + r.profitLoss, 0);
      const wins = copyResults.filter((r) => r.profitLoss > 0).length;
      const winRate = copyResults.length > 0 ? (wins / copyResults.length) * 100 : 0;

      // Include full copy results with trade details if requested
      const { searchParams } = new URL(req.url);
      let fullCopyResults = undefined;
      if (searchParams.get("include") === "copyResults") {
        const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);
        fullCopyResults = await prisma.copyResult.findMany({
          where: { userId: user.id },
          include: {
            traderTrade: {
              select: {
                tradeName: true,
                market: true,
                tradeType: true,
                resultPercent: true,
                tradeDate: true,
                trader: { select: { displayName: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        });
      }

      return NextResponse.json({
        stats: {
          totalBalance: balance?.totalBalance ?? 0,
          availableBalance: balance?.availableBalance ?? 0,
          allocatedBalance: balance?.allocatedBalance ?? 0,
          totalProfit: balance?.totalProfit ?? 0,
          totalCopyPnl,
          winRate: Math.round(winRate * 10) / 10,
          totalCopiedTrades: copyResults.length,
          following,
        },
        ...(fullCopyResults ? { copyResults: fullCopyResults } : {}),
      });
    }

    // ADMIN
    return NextResponse.json({ stats: null });
  } catch {
    return unauthorizedResponse();
  }
}
