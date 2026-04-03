import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { z } from "zod";

// ── Zod Schemas ──────────────────────────────────────────────────────

const walletSchema = z.object({
  type: z.literal("WALLET"),
  label: z.string().min(1, "Label is required").max(100),
  walletAddress: z.string().min(10, "Invalid wallet address").max(200),
  network: z.enum(["ERC20", "TRC20", "BEP20", "SOL", "Bitcoin"]),
  walletType: z.enum(["DEPOSIT", "WITHDRAWAL", "BOTH"]),
});

const cardSchema = z.object({
  type: z.literal("CARD"),
  label: z.string().min(1, "Label is required").max(100),
  cardLast4: z.string().regex(/^\d{4}$/, "Must be exactly 4 digits"),
  cardBrand: z.string().min(1, "Card brand is required").max(50),
  cardExpiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiry must be MM/YY"),
  stripePaymentMethodId: z.string().optional(),
});

const createPaymentMethodSchema = z.discriminatedUnion("type", [walletSchema, cardSchema]);

const patchSchema = z.object({
  id: z.string().uuid("Invalid payment method ID"),
  label: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
});

const deleteSchema = z.object({
  id: z.string().uuid("Invalid payment method ID"),
});

// ── GET — Fetch all payment methods for current user ─────────────────

export async function GET() {
  try {
    const user = await requireAuth();

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ paymentMethods });
  } catch {
    return unauthorizedResponse();
  }
}

// ── POST — Create a new payment method ───────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = createPaymentMethodSchema.parse(body);

    const data =
      parsed.type === "WALLET"
        ? {
            userId: user.id,
            type: parsed.type,
            label: parsed.label,
            walletAddress: parsed.walletAddress,
            network: parsed.network,
            walletType: parsed.walletType,
          }
        : {
            userId: user.id,
            type: parsed.type,
            label: parsed.label,
            cardLast4: parsed.cardLast4,
            cardBrand: parsed.cardBrand,
            cardExpiry: parsed.cardExpiry,
            stripePaymentMethodId: parsed.stripePaymentMethodId ?? null,
          };

    const paymentMethod = await prisma.paymentMethod.create({ data });

    return NextResponse.json({ paymentMethod }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("Create payment method failed:", error);
    return errorResponse("Failed to create payment method");
  }
}

// ── PATCH — Update a payment method (label, set as default) ──────────

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { id, label, isDefault } = patchSchema.parse(body);

    // Verify ownership
    const existing = await prisma.paymentMethod.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return errorResponse("Payment method not found", 404);
    }

    // If setting as default, unset all others first
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.paymentMethod.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json({ paymentMethod: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("Update payment method failed:", error);
    return errorResponse("Failed to update payment method");
  }
}

// ── DELETE — Remove a payment method ─────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { id } = deleteSchema.parse(body);

    // Verify ownership before deleting
    const existing = await prisma.paymentMethod.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return errorResponse("Payment method not found", 404);
    }

    await prisma.paymentMethod.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("Delete payment method failed:", error);
    return errorResponse("Failed to delete payment method");
  }
}
