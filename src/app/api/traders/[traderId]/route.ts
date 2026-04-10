import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const RECENT_TRADES_LIMIT = 20;

/**
 * GET — Public trader profile
 *
 * Returns trader data, follower count, recent trades, reviews,
 * computed stats (avg trade %, best/worst trade, streak), and
 * (if the viewer is authenticated) their follow / copy-request status.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ traderId: string }> }
) {
  try {
    const { traderId } = await params;

    // ── Fetch trader with aggregated data ──
    const trader = await prisma.trader.findUnique({
      where: { id: traderId },
      include: {
        user: { select: { name: true, avatar: true, createdAt: true } },
        _count: { select: { followers: true } },
        traderTrades: {
          select: {
            id: true,
            tradeName: true,
            market: true,
            tradeType: true,
            resultPercent: true,
            profitLoss: true,
            tradeDate: true,
          },
          orderBy: { tradeDate: "desc" },
          take: RECENT_TRADES_LIMIT,
        },
        reviews: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!trader) {
      return NextResponse.json(
        { error: "Trader not found" },
        { status: 404 }
      );
    }

    // ── Compute review stats ──
    const reviewCount = trader.reviews.length;
    const averageRating =
      reviewCount > 0
        ? parseFloat(
            (
              trader.reviews.reduce((sum, r) => sum + r.rating, 0) /
              reviewCount
            ).toFixed(1)
          )
        : 0;

    // ── Compute extended trade stats from ALL trades ──
    const allTrades = await prisma.traderTrade.findMany({
      where: { traderId: trader.id },
      select: { resultPercent: true, profitLoss: true, market: true },
      orderBy: { tradeDate: "desc" },
    });

    const totalTradesCount = allTrades.length;
    const wins = allTrades.filter((t) => t.resultPercent > 0).length;
    const losses = allTrades.filter((t) => t.resultPercent < 0).length;
    const computedWinRate = totalTradesCount > 0 ? (wins / totalTradesCount) * 100 : 0;

    const avgTradePercent = totalTradesCount > 0
      ? allTrades.reduce((s, t) => s + t.resultPercent, 0) / totalTradesCount
      : 0;

    const bestTrade = totalTradesCount > 0
      ? Math.max(...allTrades.map((t) => t.resultPercent))
      : 0;
    const worstTrade = totalTradesCount > 0
      ? Math.min(...allTrades.map((t) => t.resultPercent))
      : 0;

    const totalProfitFromTrades = allTrades.reduce((s, t) => s + t.profitLoss, 0);

    // Market breakdown
    const marketMap: Record<string, { count: number; pnl: number }> = {};
    for (const t of allTrades) {
      const m = t.market.toUpperCase();
      if (!marketMap[m]) marketMap[m] = { count: 0, pnl: 0 };
      marketMap[m].count++;
      marketMap[m].pnl += t.profitLoss;
    }
    const marketBreakdown = Object.entries(marketMap)
      .map(([market, data]) => ({ market, ...data }))
      .sort((a, b) => b.count - a.count);

    // Current streak
    let streak = 0;
    let streakType: "win" | "loss" | "none" = "none";
    for (const t of allTrades) {
      if (streakType === "none") {
        streakType = t.resultPercent >= 0 ? "win" : "loss";
        streak = 1;
      } else if (
        (streakType === "win" && t.resultPercent >= 0) ||
        (streakType === "loss" && t.resultPercent < 0)
      ) {
        streak++;
      } else {
        break;
      }
    }

    // ── Optional auth — check viewer's relationship with this trader ──
    let viewerRelation: {
      isFollowing: boolean;
      copyRequestStatus: string | null;
    } | null = null;

    try {
      const session = await getSession();

      if (session?.user?.id) {
        const [follower, copyRequest] = await Promise.all([
          prisma.follower.findUnique({
            where: {
              userId_traderId: {
                userId: session.user.id,
                traderId: trader.id,
              },
            },
            select: { id: true },
          }),
          prisma.copyRequest.findUnique({
            where: {
              userId_traderId: {
                userId: session.user.id,
                traderId: trader.id,
              },
            },
            select: { status: true },
          }),
        ]);

        viewerRelation = {
          isFollowing: !!follower,
          copyRequestStatus: copyRequest?.status ?? null,
        };
      }
    } catch {
      // Auth failed or session unavailable — continue without viewer context
    }

    // ── Shape response ──
    const profile = {
      id: trader.id,
      displayName: trader.displayName,
      bio: trader.bio,
      description: trader.description,
      avatar: trader.user.avatar,
      performancePct: trader.performancePct,
      totalPnl: trader.totalPnl,
      winRate: trader.winRate,
      totalTrades: trader.totalTrades,
      isActive: trader.isActive,
      followerCount: trader.followerCount > 0 ? trader.followerCount : trader._count.followers,
      joinedAt: trader.user.createdAt,
      // Extended stats
      computedStats: {
        totalTradesCount,
        wins,
        losses,
        computedWinRate: Math.round(computedWinRate * 10) / 10,
        avgTradePercent: Math.round(avgTradePercent * 100) / 100,
        bestTrade: Math.round(bestTrade * 100) / 100,
        worstTrade: Math.round(worstTrade * 100) / 100,
        totalProfitFromTrades: Math.round(totalProfitFromTrades * 100) / 100,
        streak,
        streakType,
        marketBreakdown,
      },
      recentTrades: trader.traderTrades.map((t) => ({
        id: t.id,
        tradeName: t.tradeName,
        market: t.market,
        tradeType: t.tradeType,
        resultPercent: t.resultPercent,
        profitLoss: t.profitLoss,
        tradeDate: t.tradeDate,
      })),
      reviews: {
        averageRating,
        totalReviews: reviewCount,
        list: trader.reviews.map((r) => ({
          userId: r.user.id,
          userName: r.user.name,
          userAvatar: r.user.avatar,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
        })),
      },
      ...(viewerRelation ? { viewer: viewerRelation } : {}),
    };

    return NextResponse.json({ trader: profile });
  } catch {
    return NextResponse.json(
      { error: "Failed to load trader profile" },
      { status: 500 }
    );
  }
}
