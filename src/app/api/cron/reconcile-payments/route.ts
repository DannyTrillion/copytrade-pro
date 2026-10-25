/**
 * Scheduled deposit reconciliation.
 *
 * GET /api/cron/reconcile-payments
 *
 * Catches deposits whose webhook never arrived. Invoked by Vercel Cron (see
 * vercel.json); also callable by an admin for an on-demand sweep.
 *
 * AUTHORISATION: Vercel signs cron invocations with `CRON_SECRET` in an
 * Authorization header. The endpoint is otherwise admin-only. It is not
 * dangerous to call — it credits nothing that the gateway does not independently
 * confirm — but it does issue one upstream request per pending order, so it is
 * not left open.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole, errorResponse } from "@/lib/auth";
import { reconcilePendingDeposits } from "@/lib/payments/reconcile";
import { logSecurityEvent } from "@/lib/security/events";

export const dynamic = "force-dynamic";
/** Sweeps are serial and network-bound; the default 10s is not enough. */
export const maxDuration = 60;

async function isAuthorised(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const header = req.headers.get("authorization");
    if (header === `Bearer ${secret}`) return true;
  }

  // Fall through to an admin session for manual runs.
  try {
    await requireRole("ADMIN");
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorised(req))) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const summary = await reconcilePendingDeposits();

    // Recorded as a security event rather than an audit log entry: AuditLog
    // has a foreign key to User and there is no system user to attribute a
    // scheduled job to. Only logged when the sweep changed something — a
    // quiet run every 15 minutes would otherwise bury the log.
    if (summary.credited > 0 || summary.expired > 0) {
      await logSecurityEvent({
        type: "ADMIN_ACTION",
        severity: summary.credited > 0 ? "MEDIUM" : "INFO",
        reason: `Deposit reconciliation: ${summary.credited} credited, ${summary.expired} expired`,
        metadata: { operation: "reconciliation-sweep", ...summary },
      });
    }

    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[cron/reconcile-payments] Failed:", error);
    return errorResponse("Reconciliation failed", 500);
  }
}
