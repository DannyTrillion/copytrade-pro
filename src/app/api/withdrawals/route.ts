import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { z } from "zod";

const withdrawSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  walletAddress: z.string().min(10, "Invalid wallet address"),
  network: z.string().min(1, "Network is required"),
});

/**
 * GET — Fetch user's withdrawal requests
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Get available balance
    const balance = await prisma.balance.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      withdrawals,
      availableBalance: balance?.availableBalance || 0,
    });
  } catch {
    return unauthorizedResponse();
  }
}

/**
 * POST — Create a withdrawal request
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = withdrawSchema.parse(body);

    // Atomic check-and-create to prevent race conditions
    const withdrawal = await prisma.$transaction(async (tx) => {
      const balance = await tx.balance.findUnique({
        where: { userId: user.id },
      });

      if (!balance || balance.availableBalance < data.amount) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const pendingCount = await tx.withdrawalRequest.count({
        where: { userId: user.id, status: "PENDING" },
      });

      if (pendingCount >= 3) {
        throw new Error("MAX_PENDING");
      }

      return tx.withdrawalRequest.create({
        data: {
          userId: user.id,
          amount: data.amount,
          walletAddress: data.walletAddress,
          network: data.network,
          status: "PENDING",
        },
      });
    });

    return NextResponse.json({ withdrawal }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse();
      if (error.message === "INSUFFICIENT_BALANCE") return errorResponse("Insufficient available balance", 400);
      if (error.message === "MAX_PENDING") return errorResponse("Maximum 3 pending withdrawal requests allowed", 400);
    }
    return errorResponse("Failed to create withdrawal request");
  }
}
