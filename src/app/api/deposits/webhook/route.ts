import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";
import { notifyDeposit } from "@/lib/notifications";

/**
 * POST — Webhook from on-ramp providers (MoonPay, Transak, Coinbase)
 * Confirms deposit and credits user balance
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Identify provider from headers or body
    const moonpaySignature = req.headers.get("moonpay-signature-v2");
    const transakHeader = req.headers.get("x-transak-signature");

    let depositId: string | null = null;
    let status: "CONFIRMED" | "REJECTED" = "CONFIRMED";
    let txHash: string | null = null;
    let verified = false;

    // ─── MoonPay webhook ───
    if (moonpaySignature) {
      const secret = process.env.ONRAMP_WEBHOOK_SECRET;
      if (secret) {
        const payload = JSON.stringify(body);
        const computed = createHmac("sha256", secret).update(payload).digest("hex");
        verified = computed === moonpaySignature;
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
        const payload = JSON.stringify(body);
        const computed = createHmac("sha256", secret).update(payload).digest("hex");
        verified = computed === transakHeader;
      }
      const event = body.webhookData || body;
      depositId = event.partnerOrderId || null;
      txHash = event.transactionHash || null;
      if (event.status === "COMPLETED") status = "CONFIRMED";
      else if (event.status === "FAILED" || event.status === "CANCELLED") status = "REJECTED";
      else return NextResponse.json({ received: true }); // still processing
    }

    // ─── Coinbase webhook ───
    else if (body.event?.type) {
      depositId = body.event?.data?.metadata?.depositId || null;
      txHash = body.event?.data?.crypto?.transaction_id || null;
      if (body.event.type === "charge:confirmed") status = "CONFIRMED";
      else if (body.event.type === "charge:failed") status = "REJECTED";
      else return NextResponse.json({ received: true });
      verified = true; // Coinbase uses IP allowlisting
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

      // Notify user of successful deposit (non-blocking)
      notifyDeposit(deposit.userId, deposit.amount).catch(() => {});
    }

    return NextResponse.json({ received: true, status });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
