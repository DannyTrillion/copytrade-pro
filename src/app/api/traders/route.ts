import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    const traders = await prisma.trader.findMany({
      where: { isActive: true },
      include: {
        user: { select: { name: true, avatar: true } },
        _count: { select: { followers: true } },
      },
      orderBy: { totalPnl: "desc" },
      take: 20,
    });

    // Check which traders the current user follows
    const following = await prisma.follower.findMany({
      where: { userId: user.id },
      select: { traderId: true, allocationPercent: true, copyEnabled: true },
    });

    const followingMap = new Map(
      following.map((f) => [f.traderId, f])
    );

    const result = traders.map((t) => {
      const follow = followingMap.get(t.id);
      return {
        id: t.id,
        name: t.displayName || t.user.name,
        avatar: t.user.avatar,
        pnl: t.totalPnl,
        winRate: t.winRate,
        totalTrades: t.totalTrades,
        followers: t.followerCount > 0 ? t.followerCount : t._count.followers,
        isFollowing: !!follow,
        allocationPercent: follow?.allocationPercent ?? 0,
        copyEnabled: follow?.copyEnabled ?? false,
      };
    });

    return NextResponse.json({ traders: result });
  } catch {
    return unauthorizedResponse();
  }
}
