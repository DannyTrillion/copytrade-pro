import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorizedResponse, forbiddenResponse, errorResponse } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const reviewSchema = z.object({
  id: z.string().uuid("Invalid next of kin ID"),
  action: z.enum(["APPROVED", "REJECTED"] as const, {
    message: "Action must be APPROVED or REJECTED",
  }),
  adminNote: z.string().max(500).optional(),
});

/**
 * GET — Fetch all NextOfKin records with user info. Filter by status.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where = status && status !== "ALL" ? { status } : {};

    const records = await prisma.nextOfKin.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ records });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse();
      if (error.message === "Forbidden") return forbiddenResponse();
    }
    console.error("Admin NextOfKin GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH — Approve or reject a next of kin request
 */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRole("ADMIN");
    const body = await req.json();

    const { id, action, adminNote } = reviewSchema.parse(body);

    const record = await prisma.nextOfKin.findUnique({
      where: { id },
    });

    if (!record) {
      return errorResponse("Next of kin record not found", 404);
    }

    if (record.status === "APPROVED" || record.status === "REJECTED") {
      return errorResponse("This request has already been reviewed", 409);
    }

    await prisma.nextOfKin.update({
      where: { id },
      data: {
        status: action,
        adminNote: adminNote || null,
        reviewedAt: new Date(),
      },
    });

    await logAudit({
      adminId: admin.id,
      action: "REVIEW_NEXT_OF_KIN",
      targetType: "NEXT_OF_KIN",
      targetId: id,
      details: {
        userId: record.userId,
        decision: action,
        adminNote: adminNote || null,
      },
    });

    return NextResponse.json({ success: true, status: action });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse();
      if (error.message === "Forbidden") return forbiddenResponse();
    }
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    console.error("Admin NextOfKin PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
