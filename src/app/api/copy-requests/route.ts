import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { notifyCopyRequest, notifyCopyApproved, notifyCopyRejected } from "@/lib/notifications";
import { z } from "zod";

const copyRequestSchema = z.object({
  traderName: z.string().min(1, "Trader name is required"),
  traderId: z.string().uuid("Invalid trader ID"),
  riskPercent: z.number().min(0.1).max(100).default(2),
  message: z.string().max(500).optional(),
});

/**
 * GET — Fetch copy requests.
 * - MASTER_TRADER: sees requests sent TO them
 * - FOLLOWER: sees requests they sent
 * - ADMIN: sees all
 */
export async function GET() {
  try {
    const user = await requireAuth();

    let where: Record<string, unknown> = {};

    if (user.role === "MASTER_TRADER") {
      const trader = await prisma.trader.findUnique({ where: { userId: user.id } });
      if (!trader) return NextResponse.json({ requests: [] });
      where = { traderId: trader.id };
    } else if (user.role === "FOLLOWER") {
      where = { userId: user.id };
    }
    // ADMIN sees all (empty where)

    const requests = await prisma.copyRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            wallet: { select: { address: true, isConnected: true } },
          },
        },
        trader: {
          select: { id: true, displayName: true, userId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch {
    return unauthorizedResponse();
  }
}

/**
 * POST — Follower sends a copy request.
 * Requires: traderName + traderId must match a real trader.
 * Requires: wallet must be connected.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = copyRequestSchema.parse(body);

    // 1. Verify wallet is connected
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || !wallet.isConnected) {
      return errorResponse("You must connect your wallet before requesting copy access", 400);
    }

    // 2. Verify trader exists and name + ID match
    const trader = await prisma.trader.findUnique({
      where: { id: data.traderId },
    });

    if (!trader) {
      return errorResponse("No trader found with that ID", 404);
    }

    if (trader.displayName.toLowerCase() !== data.traderName.toLowerCase()) {
      return errorResponse("Trader name does not match the provided ID", 400);
    }

    // 3. Can't request yourself
    if (trader.userId === user.id) {
      return errorResponse("Cannot send a copy request to yourself", 400);
    }

    // 4. Check for existing request
    const existing = await prisma.copyRequest.findUnique({
      where: {
        userId_traderId: {
          userId: user.id,
          traderId: data.traderId,
        },
      },
    });

    if (existing) {
      if (existing.status === "PENDING") {
        return errorResponse("You already have a pending request for this trader", 400);
      }
      if (existing.status === "APPROVED") {
        return errorResponse("You are already approved to copy this trader", 400);
      }
      // If REJECTED or CANCELLED, allow re-request by updating
      const updated = await prisma.copyRequest.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          traderName: data.traderName,
          riskPercent: data.riskPercent,
          message: data.message || null,
          reviewedAt: null,
        },
      });
      return NextResponse.json({ request: updated }, { status: 201 });
    }

    // 5. Create new copy request
    const copyRequest = await prisma.copyRequest.create({
      data: {
        userId: user.id,
        traderId: data.traderId,
        traderName: data.traderName,
        riskPercent: data.riskPercent,
        message: data.message || null,
      },
    });

    // Notify the trader
    notifyCopyRequest(data.traderId, trader.userId, user.name || "A user").catch(() => {});

    return NextResponse.json({ request: copyRequest }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to create copy request");
  }
}

/**
 * PATCH — Master trader approves/rejects, or follower cancels a request.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { requestId, action } = body;

    if (!requestId || !["APPROVED", "REJECTED", "CANCELLED"].includes(action)) {
      return errorResponse("requestId and action (APPROVED|REJECTED|CANCELLED) are required", 400);
    }

    const copyRequest = await prisma.copyRequest.findUnique({
      where: { id: requestId },
      include: { trader: true },
    });

    if (!copyRequest) {
      return errorResponse("Request not found", 404);
    }

    // CANCELLED — only the follower who sent it can cancel, and only while PENDING
    if (action === "CANCELLED") {
      if (copyRequest.userId !== user.id) {
        return errorResponse("You can only cancel your own requests", 403);
      }
      if (copyRequest.status !== "PENDING") {
        return errorResponse("Only pending requests can be cancelled", 400);
      }
      const updated = await prisma.copyRequest.update({
        where: { id: requestId },
        data: { status: "CANCELLED", reviewedAt: new Date() },
      });
      return NextResponse.json({ request: updated });
    }

    // APPROVED / REJECTED — only the trader or admin
    if (copyRequest.trader.userId !== user.id && user.role !== "ADMIN") {
      return errorResponse("You can only manage your own copy requests", 403);
    }

    // Cannot approve/reject a cancelled request
    if (copyRequest.status === "CANCELLED") {
      return errorResponse("Cannot process a cancelled request", 400);
    }

    // Update request status
    const updated = await prisma.copyRequest.update({
      where: { id: requestId },
      data: {
        status: action,
        reviewedAt: new Date(),
      },
    });

    // If approved, create/update Follower record with approved=true
    if (action === "APPROVED") {
      await prisma.follower.upsert({
        where: {
          userId_traderId: {
            userId: copyRequest.userId,
            traderId: copyRequest.traderId,
          },
        },
        create: {
          userId: copyRequest.userId,
          traderId: copyRequest.traderId,
          allocationPercent: copyRequest.riskPercent,
          copyEnabled: true,
          approved: true,
        },
        update: {
          copyEnabled: true,
          approved: true,
          allocationPercent: copyRequest.riskPercent,
        },
      });

      notifyCopyApproved(copyRequest.userId, copyRequest.traderName).catch(() => {});
    }

    // If rejected, disable copy trading for this follower if they exist
    if (action === "REJECTED") {
      await prisma.follower.updateMany({
        where: {
          userId: copyRequest.userId,
          traderId: copyRequest.traderId,
        },
        data: {
          copyEnabled: false,
          approved: false,
        },
      });

      notifyCopyRejected(copyRequest.userId, copyRequest.traderName).catch(() => {});
    }

    return NextResponse.json({ request: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to process request");
  }
}
