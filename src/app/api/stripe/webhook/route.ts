import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

/**
 * POST — Stripe Webhook handler
 * Listens for payment_intent.succeeded to confirm card deposits
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSuccess(paymentIntent);
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailure(paymentIntent);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      await handleChargeRefunded(charge);
      break;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      await handleDisputeCreated(dispute);
      break;
    }
    default:
      // Unhandled event type — ignore
      break;
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { id: stripeId, metadata, amount } = paymentIntent;
  const userId = metadata.userId;
  if (!userId) return;

  const amountUsd = amount / 100;

  // Find the CardPayment record
  const cardPayment = await prisma.cardPayment.findFirst({
    where: { stripePaymentIntentId: stripeId },
  });

  if (!cardPayment) {
    console.error(`No CardPayment found for PaymentIntent ${stripeId}`);
    return;
  }

  // Skip if already confirmed
  if (cardPayment.status === "CONFIRMED") return;

  // Extract card details from the payment method
  let cardLast4 = "****";
  let cardBrand = "Card";
  try {
    const charges = await stripe.charges.list({ payment_intent: stripeId, limit: 1 });
    const charge = charges.data[0];
    if (charge?.payment_method_details?.card) {
      cardLast4 = charge.payment_method_details.card.last4 || "****";
      cardBrand = (charge.payment_method_details.card.brand || "card").replace(/^./, (c) => c.toUpperCase());
    }
  } catch {
    // Non-critical — keep defaults
  }

  // Update card payment to ADMIN_REVIEW with card details
  await prisma.cardPayment.update({
    where: { id: cardPayment.id },
    data: {
      status: "ADMIN_REVIEW",
      cardLast4,
      cardBrand,
    },
  });

  // Notify admin (create a notification for all admin users)
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "DEPOSIT",
        title: "New Card Payment",
        message: `${cardBrand} ending ${cardLast4} — $${amountUsd.toFixed(2)} pending your confirmation`,
        actionUrl: "/dashboard/admin/card-payments",
      })),
    });
  } catch {
    // Non-critical
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const { id: stripeId } = paymentIntent;

  await prisma.cardPayment.updateMany({
    where: { stripePaymentIntentId: stripeId, status: "PENDING" },
    data: {
      status: "REJECTED",
      adminNote: "Payment failed — card was declined or payment did not complete",
      reviewedAt: new Date(),
    },
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const stripeId = charge.payment_intent as string;
  if (!stripeId) return;

  const cardPayment = await prisma.cardPayment.findFirst({
    where: { stripePaymentIntentId: stripeId },
  });

  if (!cardPayment || cardPayment.status === "REJECTED") return;

  await prisma.cardPayment.update({
    where: { id: cardPayment.id },
    data: {
      status: "REJECTED",
      adminNote: `Refunded via Stripe on ${new Date().toISOString()}`,
      reviewedAt: new Date(),
    },
  });

  // Notify admins of the refund
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: "DEPOSIT" as const,
      title: "Stripe Refund Processed",
      message: `Card payment of $${(cardPayment.amount / 100).toFixed(2)} was refunded`,
      actionUrl: "/dashboard/admin/card-payments",
    })),
  }).catch(() => {});
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const stripeId = dispute.payment_intent as string;
  if (!stripeId) return;

  const cardPayment = await prisma.cardPayment.findFirst({
    where: { stripePaymentIntentId: stripeId },
  });

  if (!cardPayment) return;

  // Flag the payment and notify admins
  await prisma.cardPayment.update({
    where: { id: cardPayment.id },
    data: {
      adminNote: `⚠️ DISPUTE opened: ${dispute.reason || "unknown reason"} — ${new Date().toISOString()}`,
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: "DEPOSIT" as const,
      title: "⚠️ Stripe Dispute Opened",
      message: `Dispute on $${(dispute.amount / 100).toFixed(2)} payment — ${dispute.reason || "unknown reason"}`,
      actionUrl: "/dashboard/admin/card-payments",
    })),
  }).catch(() => {});
}
