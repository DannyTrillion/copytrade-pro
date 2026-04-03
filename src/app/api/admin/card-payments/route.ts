import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorizedResponse, forbiddenResponse, errorResponse } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const reviewSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
  action: z.enum(["CONFIRMED", "REJECTED"] as const, {
    message: "Action must be CONFIRMED or REJECTED",
  }),
  adminNote: z.string().max(500).optional(),
});

/**
 * GET — Fetch all card payments with user info. Filter by status query param.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where = status && status !== "ALL" ? { status } : {};

    const payments = await prisma.cardPayment.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Aggregate stats
    const [pendingCount, confirmedSum, rejectedCount] = await Promise.all([
      prisma.cardPayment.count({ where: { status: "PENDING" } }),
      prisma.cardPayment.aggregate({
        where: { status: "CONFIRMED" },
        _sum: { amount: true },
      }),
      prisma.cardPayment.count({ where: { status: "REJECTED" } }),
    ]);

    return NextResponse.json({
      payments,
      stats: {
        pendingCount,
        confirmedTotal: confirmedSum._sum.amount ?? 0,
        rejectedCount,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse();
      if (error.message === "Forbidden") return forbiddenResponse();
    }
    console.error("Admin CardPayments GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH — Confirm or reject a card payment
 */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRole("ADMIN");
    const body = await req.json();

    const { paymentId, action, adminNote } = reviewSchema.parse(body);

    // Fetch the payment to ensure it exists and is reviewable
    const payment = await prisma.cardPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return errorResponse("Card payment not found", 404);
    }

    if (payment.status === "CONFIRMED" || payment.status === "REJECTED") {
      return errorResponse("This payment has already been reviewed", 409);
    }

    if (action === "CONFIRMED") {
      // Use a transaction: update payment, update balance, create balance transaction
      await prisma.$transaction(async (tx) => {
        // Update the card payment status
        await tx.cardPayment.update({
          where: { id: paymentId },
          data: {
            status: "CONFIRMED",
            adminNote: adminNote || null,
            reviewedAt: new Date(),
          },
        });

        // Get or create user balance
        let balance = await tx.balance.findUnique({
          where: { userId: payment.userId },
        });

        if (!balance) {
          balance = await tx.balance.create({
            data: { userId: payment.userId },
          });
        }

        const balanceBefore = balance.totalBalance;
        const balanceAfter = balanceBefore + payment.amount;

        // Update user's balance
        await tx.balance.update({
          where: { userId: payment.userId },
          data: {
            totalBalance: { increment: payment.amount },
            availableBalance: { increment: payment.amount },
          },
        });

        // Create a BalanceTransaction
        await tx.balanceTransaction.create({
          data: {
            userId: payment.userId,
            type: "DEPOSIT",
            amount: payment.amount,
            balanceBefore,
            balanceAfter,
            description: "Card deposit (confirmed by admin)",
          },
        });
      });

      await logAudit({
        adminId: admin.id,
        action: "CONFIRM_CARD_PAYMENT",
        targetType: "CARD_PAYMENT",
        targetId: paymentId,
        details: {
          userId: payment.userId,
          amount: payment.amount,
          currency: payment.currency,
          adminNote: adminNote || null,
        },
      });

      return NextResponse.json({ success: true, status: "CONFIRMED" });
    }

    // REJECTED
    await prisma.cardPayment.update({
      where: { id: paymentId },
      data: {
        status: "REJECTED",
        adminNote: adminNote || null,
        reviewedAt: new Date(),
      },
    });

    await logAudit({
      adminId: admin.id,
      action: "REJECT_CARD_PAYMENT",
      targetType: "CARD_PAYMENT",
      targetId: paymentId,
      details: {
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        adminNote: adminNote || null,
      },
    });

    return NextResponse.json({ success: true, status: "REJECTED" });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse();
      if (error.message === "Forbidden") return forbiddenResponse();
    }
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    console.error("Admin CardPayments PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
