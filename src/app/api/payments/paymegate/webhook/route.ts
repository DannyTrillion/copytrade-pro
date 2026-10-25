/**
 * PayMeGate webhook receiver.
 *
 * POST /api/payments/paymegate/webhook
 *
 * Two independent controls guard this endpoint, because it is publicly
 * reachable and it moves money:
 *
 *  1. **Signature.** Deliveries are HMAC-SHA256 signed over
 *     `${timestamp}.${rawBody}` with the secret issued by PUT /v1/webhook.
 *     The raw body is verified before it is parsed — re-serialising JSON
 *     changes the bytes and would invalidate a genuine signature.
 *
 *  2. **Re-read.** Even a valid delivery is treated only as a hint about
 *     *which* order to inspect. Amount, status and customer in the payload
 *     are ignored; `settleOrder` re-reads the order from the gateway over an
 *     authenticated channel and decides from that.
 *
 * The second control is what makes the endpoint safe rather than merely
 * guarded: if the signing secret ever leaked, a forged delivery would still
 * credit nothing.
 */

import { NextRequest, NextResponse } from "next/server";
import { settleOrder } from "@/lib/payments/settlement";
import {
  EVENT_HEADER,
  EVENT_ID_HEADER,
  isSignatureConfigured,
  verifySignature,
} from "@/lib/payments/webhook-signature";
import { prisma } from "@/lib/prisma";
import { logSecurityEventAsync } from "@/lib/security/events";

export const dynamic = "force-dynamic";

/** Tolerate reasonable envelope variation rather than assuming one shape. */
function extractOrderId(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;

  const root = body as Record<string, unknown>;
  const data = (root.data ?? root.order ?? root) as Record<string, unknown>;

  for (const key of ["orderUUID", "orderUuid", "order_uuid", "orderId"]) {
    const value = data[key] ?? root[key];
    if (typeof value === "string" && value.length > 0) return value;
  }

  return null;
}

export async function POST(req: NextRequest) {
  // Raw bytes, exactly as received — required for signature verification.
  const rawBody = await req.text();

  if (isSignatureConfigured()) {
    const result = verifySignature(rawBody, req.headers);

    if (!result.valid) {
      logSecurityEventAsync({
        type: "ADMIN_ACTION",
        severity: "HIGH",
        reason: `Rejected payment webhook: ${result.reason}`,
        metadata: {
          reason: result.reason,
          event: req.headers.get(EVENT_HEADER),
        },
      });

      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    // Fail loudly rather than silently accepting unverified money events.
    console.error(
      "[paymegate/webhook] PAYMEGATE_WEBHOOK_SECRET is not set — delivery accepted without signature verification. The gateway re-read still gates crediting."
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderUUID = extractOrderId(body);

  if (!orderUUID) {
    // 400 rather than 200 so an undeliverable event surfaces in the gateway's
    // own delivery log instead of appearing to succeed.
    return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  }

  /**
   * Delivery-level idempotency, as the provider instructs: record each
   * event id and act on it once.
   *
   * Settlement is already safe against double-crediting, so this is defence
   * in depth — its practical value is absorbing a redelivery storm without
   * issuing a redundant verification call per delivery. The unique constraint
   * does the work; a duplicate insert throws and we exit early.
   */
  const eventId = req.headers.get(EVENT_ID_HEADER);

  if (eventId) {
    try {
      await prisma.webhookEvent.create({
        data: {
          provider: "PAYMEGATE",
          eventId,
          eventType: req.headers.get(EVENT_HEADER),
          orderRef: orderUUID,
        },
      });
    } catch (error) {
      // ONLY a unique-constraint violation means "already seen". Treating any
      // error as a duplicate would acknowledge a genuine payment during a
      // transient database fault and strand it — the delivery would never be
      // retried and the user would never be credited.
      const code = (error as { code?: string } | null)?.code;

      if (code === "P2002") {
        return NextResponse.json({ received: true, outcome: "DUPLICATE_EVENT" });
      }

      // Anything else: log it and continue to settlement. Settlement is
      // idempotent on its own, so losing the dedup record is survivable;
      // dropping the payment is not.
      console.error("[paymegate/webhook] Could not record event id:", error);
    }
  }

  const result = await settleOrder(orderUUID);

  // Only a gateway read failure warrants a retry. Everything else is settled —
  // replying 200 stops PayMeGate redelivering for an order that is already
  // confirmed, unknown to us, or genuinely unpaid.
  if (result.outcome === "GATEWAY_ERROR") {
    // Retry is wanted, so release the dedup record — otherwise the
    // redelivery would be swallowed as a duplicate and the payment stranded.
    if (eventId) {
      await prisma.webhookEvent
        .deleteMany({ where: { provider: "PAYMEGATE", eventId } })
        .catch(() => {
          /* best effort; the daily sweep is the backstop */
        });
    }

    return NextResponse.json({ received: true, retry: true }, { status: 503 });
  }

  return NextResponse.json({ received: true, outcome: result.outcome });
}

/** Some gateways probe the endpoint before saving it. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
