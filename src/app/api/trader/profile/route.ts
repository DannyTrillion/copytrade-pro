import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { z } from "zod";

/**
 * GET — Fetch current trader's profile
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const trader = await prisma.trader.findUnique({
      where: { userId: user.id },
      include: {
        user: { select: { name: true, email: true, avatar: true } },
        _count: { select: { followers: true, traderTrades: true } },
      },
    });

    if (!trader) return errorResponse("Trader profile not found", 404);

    return NextResponse.json({ trader });
  } catch {
    return unauthorizedResponse();
  }
}

/**
 * PATCH — Update trader profile fields (including avatar on the User model)
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.role !== "MASTER_TRADER" && user.role !== "ADMIN") {
      return errorResponse("Forbidden", 403);
    }

    const trader = await prisma.trader.findUnique({ where: { userId: user.id } });
    if (!trader) return errorResponse("Trader profile not found", 404);

    const body = await req.json();
    const schema = z.object({
      displayName: z.string().min(1).max(100).optional(),
      bio: z.string().max(500).optional(),
      description: z.string().max(2000).optional(),
      avatar: z.string().url().optional(),
    });
    const data = schema.parse(body);

    // Update trader record
    const updated = await prisma.trader.update({
      where: { id: trader.id },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.bio !== undefined && { bio: data.bio || null }),
        ...(data.description !== undefined && { description: data.description || null }),
      },
      include: {
        user: { select: { name: true, email: true, avatar: true } },
        _count: { select: { followers: true, traderTrades: true } },
      },
    });

    // Update avatar on User model if provided
    if (data.avatar !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: data.avatar },
      });
    }

    return NextResponse.json({ trader: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("Profile update error:", error);
    return errorResponse("Failed to update profile");
  }
}
