/**
 * Deposit reconciliation.
 *
 * A webhook is a best-effort delivery: it can be dropped, delayed, or fail
 * while our database is briefly unreachable. Without a sweep, any of those
 * strands a user who genuinely paid — the worst failure this system has,
 * because the money left their account and nothing arrived in ours.
 *
 * So the gateway is polled for anything still open. Two outcomes:
 *
 *   PAID    → settled through the same path a webhook would have taken
 *   stale   → closed as EXPIRED so the admin queue stays readable
 *
 * Crediting decisions are not made here. This only decides *which* orders are
 * worth asking about; `settleOrder` remains the single place balance moves.
 */

import { prisma } from "@/lib/prisma";
import { settleOrder, type SettlementOutcome } from "./settlement";
import { ORDER_EXPIRY_MINUTES, RECONCILE_AFTER_MINUTES } from "@/config/payments";

export interface ReconcileSummary {
  checked: number;
  credited: number;
  expired: number;
  stillPending: number;
  errors: number;
  creditedTotal: number;
}

/** Processed in small serial chunks so a backlog cannot exhaust the pool. */
const CHUNK_SIZE = 5;

/** Upper bound per run, so one invocation cannot run unboundedly long. */
const MAX_PER_RUN = 100;

export async function reconcilePendingDeposits(): Promise<ReconcileSummary> {
  const now = Date.now();

  // Old enough that a webhook would plausibly have arrived, so we are not
  // racing a user who is still on the checkout page.
  const readyBefore = new Date(now - RECONCILE_AFTER_MINUTES * 60_000);
  const expiredBefore = new Date(now - ORDER_EXPIRY_MINUTES * 60_000);

  const candidates = await prisma.cardPayment.findMany({
    where: {
      provider: "PAYMEGATE",
      status: "PENDING",
      providerOrderId: { not: null },
      createdAt: { lt: readyBefore },
    },
    orderBy: { createdAt: "asc" },
    take: MAX_PER_RUN,
    select: { id: true, providerOrderId: true, createdAt: true },
  });

  const summary: ReconcileSummary = {
    checked: candidates.length,
    credited: 0,
    expired: 0,
    stillPending: 0,
    errors: 0,
    creditedTotal: 0,
  };

  for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
    const chunk = candidates.slice(i, i + CHUNK_SIZE);

    const results = await Promise.allSettled(
      chunk.map(async (row) => ({
        row,
        result: await settleOrder(row.providerOrderId!),
      }))
    );

    for (const settled of results) {
      if (settled.status === "rejected") {
        summary.errors += 1;
        continue;
      }

      const { row, result } = settled.value;
      const outcome: SettlementOutcome = result.outcome;

      if (outcome === "CREDITED") {
        summary.credited += 1;
        summary.creditedTotal += result.creditedAmount ?? 0;
        continue;
      }

      if (outcome === "GATEWAY_ERROR") {
        // Leave it pending; the next run retries. Marking it failed here
        // would strand a user over a transient network fault.
        summary.errors += 1;
        continue;
      }

      // The gateway has no record of it, so it can never be paid. Close it
      // on the same schedule as an abandoned checkout.
      if (outcome === "NOT_PAID" || outcome === "ORDER_NOT_FOUND") {
        // Abandoned checkouts are the common case, not an anomaly. Close
        // them once they are past the window so the queue reflects reality.
        if (row.createdAt < expiredBefore) {
          await prisma.cardPayment.update({
            where: { id: row.id },
            data: {
              status: "EXPIRED",
              adminNote:
                outcome === "ORDER_NOT_FOUND"
                  ? "Closed automatically — no such order at the gateway"
                  : "Closed automatically — not completed at the gateway",
            },
          });
          summary.expired += 1;
        } else {
          summary.stillPending += 1;
        }
        continue;
      }

      // ALREADY_SETTLED, AMOUNT_MISMATCH and UNKNOWN_ORDER are all handled
      // inside settleOrder; nothing further to do here.
    }
  }

  return summary;
}
