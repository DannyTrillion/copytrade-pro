/**
 * Start a card/alternative-method deposit.
 *
 * POST /api/payments/paymegate/create  { amount, method }
 *
 * Creates a local CardPayment row first, then a gateway order keyed to that
 * row's id via `externalId`. Local-first ordering matters: if the gateway call
 * succeeds but our write fails, a real payment would exist with nothing on our
 * side to reconcile it against.
 *
 * Returns a `checkoutUrl` for the browser to navigate to. No card data is ever
 * posted to this application.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createOrder, isConfigured, PayMeGateError } from "@/lib/payments/paymegate";
import { getPublicAppUrl } from "@/lib/app-url";
import {
  DEPOSIT_LIMITS,
  getPaymentMethod,
  PAYMENT_METHOD_KEYS,
} from "@/config/payments";

export const dynamic = "force-dynamic";

const schema = z.object({
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(DEPOSIT_LIMITS.max, `Amount exceeds the ${DEPOSIT_LIMITS.max} limit`),
  method: z.enum(PAYMENT_METHOD_KEYS as [string, ...string[]]),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    if (!isConfigured()) {
      return errorResponse("Card payments are temporarily unavailable", 503);
    }

    // Each attempt creates a gateway order, so this is rate limited to stop a
    // single account flooding the merchant dashboard with abandoned orders.
    const { allowed } = await checkRateLimit(`deposit:${user.id}`, 10, 15 * 60 * 1000);
    if (!allowed) {
      return errorResponse("Too many deposit attempts. Please try again shortly.", 429);
    }

    const { amount, method } = schema.parse(await req.json());

    const option = getPaymentMethod(method);
    if (!option) return errorResponse("Unsupported payment method", 400);

    // Checked here for a clear message; the gateway enforces it regardless.
    if (amount < option.min) {
      return errorResponse(
        `Minimum for ${option.label} is ${option.min} ${option.minCurrency}`,
        400
      );
    }

    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true, suspended: true, bannedAt: true },
    });

    if (!account || account.suspended || account.bannedAt) {
      return errorResponse("Deposits are unavailable on this account", 403);
    }

    // Local row first — this id becomes the gateway's externalId.
    const payment = await prisma.cardPayment.create({
      data: {
        userId: user.id,
        amount,
        currency: DEPOSIT_LIMITS.currency,
        status: "PENDING",
        provider: "PAYMEGATE",
        paymentMethod: method,
      },
      select: { id: true },
    });

    // The gateway rejects anything that is not a public HTTPS origin, so this
    // cannot be built from NEXTAUTH_URL directly — in development that is
    // http://localhost, which fails validation.
    const backUrl = `${getPublicAppUrl()}/dashboard/deposit?payment=${payment.id}`;

    try {
      const order = await createOrder({
        amount,
        currency: DEPOSIT_LIMITS.currency,
        paymentMethodsKeys: [method],
        customer: { email: account.email, fullName: account.name },
        externalId: payment.id,
        backUrl,
        metadata: { userId: user.id, cardPaymentId: payment.id },
      });

      await prisma.cardPayment.update({
        where: { id: payment.id },
        data: {
          providerOrderId: order.orderUUID,
          checkoutUrl: order.checkoutUrl,
        },
      });

      return NextResponse.json({
        paymentId: payment.id,
        checkoutUrl: order.checkoutUrl,
      });
    } catch (error) {
      // The gateway refused, so no payment can ever arrive for this row.
      // Close it immediately rather than leaving it pending for the sweep.
      await prisma.cardPayment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          adminNote:
            error instanceof PayMeGateError
              ? `Gateway rejected order: ${error.message}`
              : "Gateway error creating order",
        },
      });

      console.error("[paymegate/create] Order creation failed:", error);
      return errorResponse("Could not start the payment. Please try again.", 502);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message ?? "Invalid request", 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("[paymegate/create] Failed:", error);
    return errorResponse("Could not start the payment", 500);
  }
}
