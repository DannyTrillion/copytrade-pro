import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { userMeetsTier, TIERS } from "@/lib/tier-guard";

/**
 * GET /api/pdt
 *
 * Returns the user's PDT account status. We store status in AdminConfig per-user
 * under key "pdt_status_{userId}" so admins can flip it manually after review.
 * Values: "available" (default), "requested", "approved", "denied".
 */
export async function GET() {
  try {
    const user = await requireAuth();

    if (!(await userMeetsTier(user.id, TIERS.TIER_4))) {
      return errorResponse("Diamond tier required", 403);
    }

    const cfg = await prisma.adminConfig.findUnique({
      where: { key: `pdt_status_${user.id}` },
    });
    const requestedConfig = await prisma.adminConfig.findUnique({
      where: { key: `pdt_requested_at_${user.id}` },
    });

    const status = (cfg?.value as "available" | "requested" | "approved" | "denied") || "available";

    // Count day trades from CopyResult in last 5 business days (simplified to 5 calendar days)
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const dayTradeCount = await prisma.copyResult.count({
      where: { userId: user.id, createdAt: { gte: fiveDaysAgo } },
    });

    return NextResponse.json({
      status,
      requestedAt: requestedConfig?.value || null,
      dayTradeCount,
      maxBeforePDT: 3, // regulatory threshold
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to load PDT status");
  }
}

/**
 * POST /api/pdt — request PDT activation. Sets status to "requested".
 */
export async function POST() {
  try {
    const user = await requireAuth();

    if (!(await userMeetsTier(user.id, TIERS.TIER_4))) {
      return errorResponse("Diamond tier required", 403);
    }

    const existing = await prisma.adminConfig.findUnique({
      where: { key: `pdt_status_${user.id}` },
    });
    if (existing?.value === "approved") {
      return errorResponse("PDT is already active on your account", 400);
    }
    if (existing?.value === "requested") {
      return errorResponse("Your PDT request is already under review", 400);
    }

    await prisma.adminConfig.upsert({
      where: { key: `pdt_status_${user.id}` },
      create: { key: `pdt_status_${user.id}`, value: "requested" },
      update: { value: "requested" },
    });
    await prisma.adminConfig.upsert({
      where: { key: `pdt_requested_at_${user.id}` },
      create: { key: `pdt_requested_at_${user.id}`, value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    return NextResponse.json({ status: "requested" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to submit PDT request");
  }
}
