/**
 * Security Center write API.
 *
 * POST /api/admin/security/actions  { action: "...", ...payload }
 *
 * Thin dispatcher: authorise, validate with Zod, delegate to the moderation
 * service. No enforcement logic lives here — keeping it in the service layer
 * is what guarantees a ban applied from any surface behaves identically.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
  errorResponse,
} from "@/lib/auth";
import { getRequestContext } from "@/lib/security/events";
import {
  ModerationError,
  addToAllowlist,
  allowlistSchema,
  banIp,
  banIpSchema,
  banUser,
  banUserSchema,
  deleteUserAccount,
  deleteUserSchema,
  deviceActionSchema,
  liftEnforcement,
  liftEnforcementSchema,
  liftIdentifierBan,
  liftIdentifierSchema,
  liftIpBan,
  liftIpBanSchema,
  removeFromAllowlist,
  reasonSchema,
  reviewRiskSchema,
  reviewRiskScore,
  revokeSessions,
  revokeSessionsSchema,
  updateDeviceTrust,
} from "@/lib/security/moderation";
import { logAudit } from "@/lib/audit";
import {
  getActiveUserIdsForScoring,
  recomputeRiskScores,
} from "@/lib/security/risk/engine";

export const dynamic = "force-dynamic";

const removeAllowlistSchema = z.object({
  id: z.string().uuid(),
  reason: reasonSchema,
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole("ADMIN");
    const body = await req.json();
    const action = String(body?.action ?? "");

    const ctx = {
      adminId: admin.id,
      request: getRequestContext(req.headers),
    };

    switch (action) {
      case "banUser": {
        const input = banUserSchema.parse(body);
        // Self-ban would immediately revoke the acting admin's own session.
        if (input.userId === admin.id) {
          return errorResponse("You cannot ban your own account", 409);
        }
        return NextResponse.json({ ok: true, result: await banUser(input, ctx) });
      }

      case "liftEnforcement": {
        const input = liftEnforcementSchema.parse(body);
        return NextResponse.json({
          ok: true,
          result: await liftEnforcement(input, ctx),
        });
      }

      case "deleteUser": {
        const input = deleteUserSchema.parse(body);
        await deleteUserAccount(input, ctx);
        return NextResponse.json({ ok: true });
      }

      case "revokeSessions": {
        const input = revokeSessionsSchema.parse(body);
        await revokeSessions(input, ctx);
        return NextResponse.json({ ok: true });
      }

      case "banIp": {
        const input = banIpSchema.parse(body);
        return NextResponse.json({ ok: true, result: await banIp(input, ctx) });
      }

      case "liftIpBan": {
        const input = liftIpBanSchema.parse(body);
        await liftIpBan(input, ctx);
        return NextResponse.json({ ok: true });
      }

      case "liftIdentifier": {
        const input = liftIdentifierSchema.parse(body);
        await liftIdentifierBan(input, ctx);
        return NextResponse.json({ ok: true });
      }

      case "addAllowlist": {
        const input = allowlistSchema.parse(body);
        return NextResponse.json({
          ok: true,
          result: await addToAllowlist(input, ctx),
        });
      }

      case "removeAllowlist": {
        const input = removeAllowlistSchema.parse(body);
        await removeFromAllowlist(input.id, input.reason, ctx);
        return NextResponse.json({ ok: true });
      }

      case "deviceTrust": {
        const input = deviceActionSchema.parse(body);
        await updateDeviceTrust(input, ctx);
        return NextResponse.json({ ok: true });
      }

      case "reviewRisk": {
        const input = reviewRiskSchema.parse(body);
        await reviewRiskScore(input, ctx);
        return NextResponse.json({ ok: true });
      }

      case "recomputeRisk": {
        // Bounded sweep over recently-active accounts. Runs inline rather than
        // queued because it is admin-triggered and already chunked; a full
        // background job belongs here if the active set outgrows one request.
        const userIds = await getActiveUserIdsForScoring();
        const result = await recomputeRiskScores(userIds);

        await logAudit({
          adminId: admin.id,
          action: "REVIEW_RISK_SCORE",
          targetType: "SECURITY",
          details: { operation: "bulk-recompute", ...result },
        });

        return NextResponse.json({ ok: true, result });
      }

      default:
        return errorResponse("Unknown action", 400);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request", issues: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof ModerationError) {
      return errorResponse(error.message, error.status);
    }

    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse();
      if (error.message === "Forbidden") return forbiddenResponse();
    }

    console.error("[security] Action failed:", error);
    return errorResponse("Action failed", 500);
  }
}
