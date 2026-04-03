import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  amount: z.number().positive("Amount must be positive").min(10, "Minimum deposit is $10").max(100000),
});

/**
 * POST — Create a Stripe PaymentIntent for a card deposit
 * Returns clientSecret for the frontend to complete payment via Stripe Elements
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { amount } = schema.parse(body);

    // Amount in cents for Stripe
    const amountInCents = Math.round(amount * 100);

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: user.id,
        userEmail: user.email,
        platform: "CopyTrade Pro",
      },
      description: `Deposit for ${user.email}`,
    });

    // Create CardPayment record in PENDING state
    const cardPayment = await prisma.cardPayment.create({
      data: {
        userId: user.id,
        amount,
        status: "PENDING",
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      cardPaymentId: cardPayment.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("Stripe PaymentIntent error:", error);
    return errorResponse("Failed to create payment. Please try again.");
  }
}
