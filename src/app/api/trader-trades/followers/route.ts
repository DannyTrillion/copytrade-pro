import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

/**
 * GET — Returns the list of approved followers for the current trader.
 * Used by the upload trade UI to let traders select specific users.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    if (user.role !== "MASTER_TRADER" && user.role !== "ADMIN") {
      return NextResponse.json({ followers: [] });
    }

    const trader = await prisma.trader.findUnique({ where: { userId: user.id } });
    if (!trader) return NextResponse.json({ followers: [] });

    const followers = await prisma.follower.findMany({
      where: {
        traderId: trader.id,
        approved: true,
        copyEnabled: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            balance: {
              select: { allocatedBalance: true, totalBalance: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      followers: followers.map((f) => ({
        userId: f.userId,
        name: f.user.name,
        email: f.user.email,
        allocationPercent: f.allocationPercent,
        allocatedBalance: f.user.balance?.allocatedBalance ?? 0,
        totalBalance: f.user.balance?.totalBalance ?? 0,
      })),
    });
  } catch {
    return unauthorizedResponse();
  }
}
