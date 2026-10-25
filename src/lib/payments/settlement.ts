/**
 * Deposit settlement.
 *
 * The single place a card deposit turns into user balance. Both the webhook
 * and the reconciliation sweep funnel through `settleOrder`, so the rules
 * below hold no matter how a payment is discovered.
 *
 * Guarantees:
 *  - **Gateway is authoritative.** Nothing is credited on the strength of a
 *    webhook payload; the order is re-read server-to-server first.
 *  - **Amount is re-checked.** We credit what we recorded at order creation,
 *    only if the gateway agrees the same amount was actually paid.
 *  - **Idempotent.** Settlement is an atomic compare-and-set on status, so a
 *    replayed webhook, a racing sweep and an impatient user refreshing the
 *    return page cannot compound into a double credit.
 */

import { prisma } from "@/lib/prisma";
import { amountMatches, getOrder, PayMeGateError } from "./paymegate";
import { logSecurityEventAsync } from "@/lib/security/events";

export type SettlementOutcome =
  | "CREDITED"
  | "ALREADY_SETTLED"
  | "NOT_PAID"
  | "AMOUNT_MISMATCH"
  | "UNKNOWN_ORDER"
  /** The gateway has no such order — terminal, never worth retrying. */
  | "ORDER_NOT_FOUND"
  | "GATEWAY_ERROR";

export interface SettlementResult {
  outcome: SettlementOutcome;
  cardPaymentId?: string;
  creditedAmount?: number;
  detail?: string;
}

/** Statuses that may still transition to CONFIRMED. */
const SETTLEABLE = ["PENDING", "ADMIN_REVIEW"];

/**
 * Verify an order with the gateway and, if genuinely paid, credit the user.
 *
 * Safe to call repeatedly with the same order id.
 */
export async function settleOrder(orderUUID: string): Promise<SettlementResult> {
  const payment = await prisma.cardPayment.findUnique({
    where: { providerOrderId: orderUUID },
    select: { id: true, userId: true, amount: true, currency: true, status: true },
  });

  if (!payment) {
    // A webhook for an order we never created is either a forgery or a
    // cross-tenant misdelivery. Either way it is worth recording.
    logSecurityEventAsync({
      type: "ADMIN_ACTION",
      severity: "HIGH",
      reason: `Settlement requested for unknown gateway order ${orderUUID}`,
      metadata: { orderUUID },
    });
    return { outcome: "UNKNOWN_ORDER" };
  }

  if (!SETTLEABLE.includes(payment.status)) {
    return {
      outcome: "ALREADY_SETTLED",
      cardPaymentId: payment.id,
      detail: `Status is ${payment.status}`,
    };
  }

  // ─── Authoritative read ───
  let order;
  try {
    order = await getOrder(orderUUID);
  } catch (error) {
    const detail =
      error instanceof PayMeGateError ? error.message : "Gateway unreachable";

    // 404 means the order does not exist upstream. That is a settled fact, not
    // a transient fault, so it must not be retried forever — the caller is
    // free to close the payment out.
    if (error instanceof PayMeGateError && error.status === 404) {
      return { outcome: "ORDER_NOT_FOUND", cardPaymentId: payment.id, detail };
    }

    console.error("[settlement] Gateway read failed:", detail);
    // Anything else is treated as transient: the sweep retries. Marking the
    // payment failed here would strand a user who genuinely paid.
    return { outcome: "GATEWAY_ERROR", cardPaymentId: payment.id, detail };
  }

  if (order.status !== "PAID") {
    return {
      outcome: "NOT_PAID",
      cardPaymentId: payment.id,
      detail: `Gateway reports ${order.status}`,
    };
  }

  if (!amountMatches(payment.amount, order.amount)) {
    // Recorded and settled amounts disagreeing is never routine. Park it for
    // a human rather than crediting either figure.
    await prisma.cardPayment.update({
      where: { id: payment.id },
      data: {
        status: "ADMIN_REVIEW",
        adminNote: `Amount mismatch — recorded ${payment.amount} ${payment.currency}, gateway reports ${order.amount} ${order.currency}`,
      },
    });

    logSecurityEventAsync({
      type: "ADMIN_ACTION",
      severity: "CRITICAL",
      userId: payment.userId,
      reason: "Deposit amount mismatch between platform and gateway",
      metadata: {
        orderUUID,
        recorded: payment.amount,
        gateway: order.amount,
      },
    });

    return { outcome: "AMOUNT_MISMATCH", cardPaymentId: payment.id };
  }

  // ─── Credit ───
  const credited = await prisma.$transaction(async (tx) => {
    // Atomic compare-and-set. If a concurrent caller already moved this row
    // out of a settleable status, count is 0 and we must not credit again.
    const claim = await tx.cardPayment.updateMany({
      where: { id: payment.id, status: { in: SETTLEABLE } },
      data: {
        status: "CONFIRMED",
        paidAt: order.paidAt ? new Date(order.paidAt) : new Date(),
        providerTxId: order.transactionUUID ?? null,
        providerTxRef: order.transactionRef ?? null,
        reviewedAt: new Date(),
        adminNote: "Auto-confirmed — verified with payment gateway",
      },
    });

    if (claim.count === 0) return null;

    const balance = await tx.balance.upsert({
      where: { userId: payment.userId },
      create: {
        userId: payment.userId,
        totalBalance: 0,
        availableBalance: 0,
        allocatedBalance: 0,
        totalProfit: 0,
      },
      update: {},
    });

    const balanceBefore = balance.totalBalance;
    const balanceAfter = balanceBefore + payment.amount;

    await tx.balance.update({
      where: { userId: payment.userId },
      data: {
        totalBalance: balanceAfter,
        availableBalance: balance.availableBalance + payment.amount,
      },
    });

    await tx.balanceTransaction.create({
      data: {
        userId: payment.userId,
        type: "DEPOSIT",
        amount: payment.amount,
        balanceBefore,
        balanceAfter,
        description: `Card deposit · ${order.transactionRef ?? orderUUID.slice(0, 8)}`,
      },
    });

    return payment.amount;
  });

  if (credited === null) {
    return { outcome: "ALREADY_SETTLED", cardPaymentId: payment.id };
  }

  return {
    outcome: "CREDITED",
    cardPaymentId: payment.id,
    creditedAmount: credited,
  };
}
