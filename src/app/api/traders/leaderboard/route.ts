import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/traders/leaderboard — Public (no auth required)
 *  Returns top 10 active traders sorted by total P&L descending.
 *  Only exposes safe, non-PII fields. */
export async function GET() {
  try {
    const traders = await prisma.trader.findMany({
      where: { isActive: true },
      select: {
        displayName: true,
        performancePct: true,
        winRate: true,
        totalTrades: true,
        totalPnl: true,
        followerCount: true,
        user: { select: { avatar: true } },
        _count: { select: { followers: true } },
      },
      orderBy: { totalPnl: "desc" },
      take: 10,
    });

    const leaderboard = traders.map((t, index) => ({
      rank: index + 1,
      displayName: t.displayName,
      avatar: t.user.avatar,
      performancePct: t.performancePct,
      winRate: t.winRate,
      totalTrades: t.totalTrades,
      totalPnl: t.totalPnl,
      followers: t.followerCount > 0 ? t.followerCount : t._count.followers,
    }));

    return NextResponse.json(
      { traders: leaderboard },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[Leaderboard API] Failed to fetch leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
