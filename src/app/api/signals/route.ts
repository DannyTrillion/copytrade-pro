import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    const where: Record<string, unknown> = {};

    if (user.role === "MASTER_TRADER") {
      const trader = await prisma.trader.findUnique({ where: { userId: user.id } });
      if (trader) where.traderId = trader.id;
    } else if (user.role === "FOLLOWER") {
      const following = await prisma.follower.findMany({
        where: { userId: user.id },
        select: { traderId: true },
      });
      where.traderId = { in: following.map((f) => f.traderId) };
    }
    // ADMIN sees all

    const [signals, total] = await Promise.all([
      prisma.signal.findMany({
        where,
        include: {
          trader: {
            select: { displayName: true },
          },
          _count: { select: { trades: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.signal.count({ where }),
    ]);

    return NextResponse.json({
      signals,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return unauthorizedResponse();
  }
}
