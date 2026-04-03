import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { z } from "zod";

const nextOfKinSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be at most 100 characters")
    .trim(),
  relationship: z.enum(["Spouse", "Parent", "Child", "Sibling", "Other"] as const, {
    message: "Please select a valid relationship",
  }),
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  phone: z
    .string()
    .min(7, "Phone number is too short")
    .max(20, "Phone number is too long")
    .trim()
    .optional()
    .or(z.literal("")),
  beneficiaryId: z.string().trim().optional().or(z.literal("")),
  documentUrl: z.string().url("Invalid document URL").optional().or(z.literal("")),
});

/**
 * GET — Fetch the current user's next of kin record
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const record = await prisma.nextOfKin.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({ nextOfKin: record ?? null });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to fetch next of kin");
  }
}

/**
 * POST — Create or update the current user's next of kin
 * Always resets status to PENDING on update so admin can re-review.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const validated = nextOfKinSchema.parse(body);

    // Resolve beneficiaryId from email if provided
    let beneficiaryId: string | null = null;
    if (validated.beneficiaryId && validated.beneficiaryId.length > 0) {
      const beneficiary = await prisma.user.findUnique({
        where: { email: validated.beneficiaryId.toLowerCase() },
        select: { id: true },
      });

      if (!beneficiary) {
        return errorResponse("No platform user found with that email", 400);
      }

      if (beneficiary.id === user.id) {
        return errorResponse("You cannot designate yourself as beneficiary", 400);
      }

      beneficiaryId = beneficiary.id;
    }

    const record = await prisma.nextOfKin.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        fullName: validated.fullName,
        relationship: validated.relationship,
        email: validated.email,
        phone: validated.phone || null,
        beneficiaryId,
        documentUrl: validated.documentUrl || null,
        status: "PENDING",
      },
      update: {
        fullName: validated.fullName,
        relationship: validated.relationship,
        email: validated.email,
        phone: validated.phone || null,
        beneficiaryId,
        documentUrl: validated.documentUrl || null,
        status: "PENDING",
        adminNote: null,
        reviewedAt: null,
      },
    });

    return NextResponse.json({ nextOfKin: record }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to save next of kin");
  }
}
