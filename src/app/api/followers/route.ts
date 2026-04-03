import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { followTraderSchema, riskSettingsSchema } from "@/lib/validators/webhook";

export async function GET() {
  try {
    const user = await requireAuth();

    const following = await prisma.follower.findMany({
      where: { userId: user.id },
      include: {
        trader: {
          include: {
            user: { select: { name: true, avatar: true } },
            _count: { select: { followers: true } },
          },
        },
      },
    });

    return NextResponse.json({ following });
  } catch {
    return unauthorizedResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = followTraderSchema.parse(body);

    // Can't follow yourself
    const trader = await prisma.trader.findUnique({
      where: { id: data.traderId },
    });

    if (!trader) {
      return errorResponse("Trader not found", 404);
    }

    if (trader.userId === user.id) {
      return errorResponse("Cannot follow yourself");
    }

    // Check for approved copy request
    const copyRequest = await prisma.copyRequest.findUnique({
      where: {
        userId_traderId: {
          userId: user.id,
          traderId: data.traderId,
        },
      },
    });

    if (!copyRequest || copyRequest.status !== "APPROVED") {
      return errorResponse("You must have an approved copy request before following this trader. Send a copy request first.", 403);
    }

    const follower = await prisma.follower.upsert({
      where: {
        userId_traderId: {
          userId: user.id,
          traderId: data.traderId,
        },
      },
      create: {
        userId: user.id,
        traderId: data.traderId,
        allocationPercent: data.allocationPercent,
        approved: true,
      },
      update: {
        allocationPercent: data.allocationPercent,
        copyEnabled: true,
        approved: true,
      },
    });

    return NextResponse.json({ follower }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to follow trader");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { traderId, ...settings } = body;

    if (!traderId) {
      return errorResponse("traderId is required");
    }

    const validated = riskSettingsSchema.parse(settings);

    // Verify the trader exists
    const trader = await prisma.trader.findUnique({ where: { id: traderId } });
    if (!trader) {
      return errorResponse("Trader not found", 404);
    }

    // Verify user has an approved copy request for this trader
    const copyRequest = await prisma.copyRequest.findUnique({
      where: { userId_traderId: { userId: user.id, traderId } },
    });
    if (!copyRequest || copyRequest.status !== "APPROVED") {
      return errorResponse("You need an approved copy request to update allocation", 403);
    }

    // Upsert the follower record (creates if it doesn't exist yet)
    const follower = await prisma.follower.upsert({
      where: {
        userId_traderId: {
          userId: user.id,
          traderId,
        },
      },
      create: {
        userId: user.id,
        traderId,
        allocationPercent: validated.allocationPercent ?? 100,
        copyEnabled: validated.copyEnabled ?? true,
        approved: true,
      },
      update: validated,
    });

    return NextResponse.json({ follower });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("Failed to update follower settings:", error);
    return errorResponse("Failed to update settings");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const traderId = searchParams.get("traderId");

    if (!traderId) {
      return errorResponse("traderId is required");
    }

    await prisma.follower.delete({
      where: {
        userId_traderId: {
          userId: user.id,
          traderId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return unauthorizedResponse();
  }
}
