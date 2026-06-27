import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";
import { notifyDeposit } from "@/lib/notifications";
import { recomputeAllocatedBalance } from "@/lib/allocation";

/** Constant-time hex-string comparison. Returns false on any length/format mismatch. */
function safeEqualHex(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length === 0 || bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * POST — Webhook from on-ramp providers (MoonPay, Transak, Coinbase)
 * Confirms deposit and credits user balance
 */
export async function POST(req: NextRequest) {
  try {
    // Read the RAW body once and verify signatures against it. Providers sign the
    // exact bytes they sent — re-serializing via JSON.stringify(parsed) would not
    // reproduce that, so HMACs must be computed over `raw`, not a re-stringified object.
    const raw = await req.text();
    const body = JSON.parse(raw);

    // Identify provider from headers or body
    const moonpaySignature = req.headers.get("moonpay-signature-v2");
    const transakHeader = req.headers.get("x-transak-signature");
    const coinbaseSignature = req.headers.get("x-cc-webhook-signature");

    let depositId: string | null = null;
    let status: "CONFIRMED" | "REJECTED" = "CONFIRMED";
    let txHash: string | null = null;
    let verified = false;

    // ─── MoonPay webhook ───
    if (moonpaySignature) {
      const secret = process.env.ONRAMP_WEBHOOK_SECRET;
      if (secret) {
        const computed = createHmac("sha256", secret).update(raw).digest("hex");
        verified = safeEqualHex(computed, moonpaySignature);
      }
      depositId = body.externalTransactionId || null;
      txHash = body.cryptoTransactionId || null;
      if (body.status === "completed") status = "CONFIRMED";
      else if (body.status === "failed") status = "REJECTED";
      else return NextResponse.json({ received: true }); // pending, ignore
    }

    // ─── Transak webhook ───
    else if (transakHeader || body.webhookData?.id) {
      const secret = process.env.ONRAMP_WEBHOOK_SECRET;
      if (secret && transakHeader) {
        const computed = createHmac("sha256", secret).update(raw).digest("hex");
        verified = safeEqualHex(computed, transakHeader);
      }
      const event = body.webhookData || body;
      depositId = event.partnerOrderId || null;
      txHash = event.transactionHash || null;
      if (event.status === "COMPLETED") status = "CONFIRMED";
      else if (event.status === "FAILED" || event.status === "CANCELLED") status = "REJECTED";
      else return NextResponse.json({ received: true }); // still processing
    }

    // ─── Coinbase Commerce webhook ───
    // Coinbase signs the raw payload with the shared webhook secret and sends the
    // HMAC-SHA256 in X-CC-Webhook-Signature. Verify it — never trust the request blindly.
    else if (body.event?.type) {
      const secret = process.env.COINBASE_WEBHOOK_SECRET;
      if (secret && coinbaseSignature) {
        const computed = createHmac("sha256", secret).update(raw).digest("hex");
        verified = safeEqualHex(computed, coinbaseSignature);
      }
      depositId = body.event?.data?.metadata?.depositId || null;
      txHash = body.event?.data?.crypto?.transaction_id || null;
      if (body.event.type === "charge:confirmed") status = "CONFIRMED";
      else if (body.event.type === "charge:failed") status = "REJECTED";
      else return NextResponse.json({ received: true });
    }

    // No recognized provider
    if (!depositId) {
      return NextResponse.json({ error: "Unrecognized webhook" }, { status: 400 });
    }

    // REJECT unverified webhooks — signature must match
    if (!verified) {
      console.warn("Rejected unverified webhook for deposit:", depositId);
      return NextResponse.json({ error: "Signature verification failed" }, { status: 403 });
    }

    // Find the deposit record
    const deposit = await prisma.depositRequest.findUnique({
      where: { id: depositId },
    });

    if (!deposit || deposit.status !== "PENDING") {
      return NextResponse.json({ received: true, skipped: true });
    }

    // Update deposit status
    await prisma.depositRequest.update({
      where: { id: depositId },
      data: {
        status,
        txHash: txHash || deposit.txHash,
        reviewedAt: new Date(),
      },
    });

    // If confirmed, credit user balance atomically
    if (status === "CONFIRMED") {
      await prisma.$transaction(async (tx) => {
        // Upsert balance with atomic increment to prevent race conditions
        const existing = await tx.balance.findUnique({
          where: { userId: deposit.userId },
        });

        const balanceBefore = existing?.totalBalance || 0;

        const updated = existing
          ? await tx.balance.update({
              where: { userId: deposit.userId },
              data: {
                totalBalance: { increment: deposit.amount },
                availableBalance: { increment: deposit.amount },
              },
            })
          : await tx.balance.create({
              data: {
                userId: deposit.userId,
                totalBalance: deposit.amount,
                availableBalance: deposit.amount,
                allocatedBalance: 0,
                totalProfit: 0,
              },
            });

        await tx.balanceTransaction.create({
          data: {
            userId: deposit.userId,
            type: "DEPOSIT",
            amount: deposit.amount,
            balanceBefore,
            balanceAfter: updated.totalBalance,
            description: `Deposit via ${deposit.note || deposit.method}`,
            txHash: txHash || undefined,
          },
        });
      });

      // Rebalance allocated/available so allocation scales with the new deposit
      await recomputeAllocatedBalance(deposit.userId);

      // Notify user of successful deposit (non-blocking)
      notifyDeposit(deposit.userId, deposit.amount).catch(() => {});
    }

    return NextResponse.json({ received: true, status });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
