/**
 * Poll a deposit's status from the return page.
 *
 * GET /api/payments/paymegate/status?id=<cardPaymentId>
 *
 * Doubles as a self-heal: a user landing back on the site is strong evidence
 * they finished checkout, so a still-pending order is re-verified against the
 * gateway here. That means a dropped or delayed webhook resolves the moment
 * the user returns, instead of waiting for the reconciliation sweep.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { settleOrder } from "@/lib/payments/settlement";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return errorResponse("Missing payment id", 400);

    const payment = await prisma.cardPayment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        providerOrderId: true,
        providerTxRef: true,
        paidAt: true,
        createdAt: true,
      },
    });

    // Same response for "not yours" and "does not exist" — a different answer
    // would let one account probe for another's payment ids.
    if (!payment || payment.userId !== user.id) {
      return errorResponse("Payment not found", 404);
    }

    if (payment.status === "PENDING" && payment.providerOrderId) {
      const result = await settleOrder(payment.providerOrderId);

      if (result.outcome === "CREDITED") {
        return NextResponse.json({
          status: "CONFIRMED",
          amount: payment.amount,
          currency: payment.currency,
          method: payment.paymentMethod,
          reference: payment.providerTxRef,
          justCredited: true,
        });
      }
    }

    return NextResponse.json({
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.paymentMethod,
      reference: payment.providerTxRef,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("[paymegate/status] Failed:", error);
    return errorResponse("Could not load payment status", 500);
  }
}
