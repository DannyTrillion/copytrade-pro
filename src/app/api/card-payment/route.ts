import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { z } from "zod";

const createCardPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(1_000_000, "Amount exceeds maximum"),
  cardLast4: z.string().length(4, "Card last 4 digits required").regex(/^\d{4}$/, "Must be 4 digits"),
  cardBrand: z.string().min(1, "Card brand is required").max(50),
});

/**
 * GET — Fetch current user's card payments, ordered by createdAt desc
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const payments = await prisma.cardPayment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ payments });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("CardPayment GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST — Create a new card payment (status defaults to PENDING)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const validated = createCardPaymentSchema.parse(body);

    const payment = await prisma.cardPayment.create({
      data: {
        userId: user.id,
        amount: validated.amount,
        cardLast4: validated.cardLast4,
        cardBrand: validated.cardBrand,
        status: "PENDING",
      },
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    console.error("CardPayment POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
