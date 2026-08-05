/**
 * Security log export.
 *
 * GET /api/admin/security/export?view=<view>&from=&to=
 *
 * Streams a CSV built server-side rather than exporting whatever the table
 * happens to have loaded, so an export covers the full filtered result set and
 * not just page one. Bounded by SECURITY_EXPORT_MAX_ROWS — an unbounded export
 * on a security table would be a trivial way to exhaust memory.
 *
 * The export itself is an audited event: knowing who pulled the security logs
 * matters as much as the logs.
 */

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
  errorResponse,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { SECURITY_EXPORT_MAX_ROWS } from "@/config/security";

export const dynamic = "force-dynamic";

type ExportView = "login-history" | "events" | "banned-users" | "banned-ips";

/** RFC 4180 escaping. */
function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const escape = (value: string | number | null): string => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [
    headers.join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\r\n");
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const view = (searchParams.get("view") || "events") as ExportView;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const createdAt: Prisma.DateTimeFilter = {};
    if (from) createdAt.gte = new Date(from);
    if (to) createdAt.lte = new Date(to);
    const dateWhere = from || to ? { createdAt } : {};

    let filename: string;
    let csv: string;
    let rowCount: number;

    switch (view) {
      case "login-history": {
        const rows = await prisma.loginAttempt.findMany({
          where: dateWhere,
          orderBy: { createdAt: "desc" },
          take: SECURITY_EXPORT_MAX_ROWS,
        });
        rowCount = rows.length;
        filename = "login-history";
        csv = toCsv(
          [
            "timestamp", "email", "success", "failure_reason", "ip", "ipv6",
            "device_id", "browser", "os", "country", "city", "vpn", "proxy",
            "tor", "risk_score", "user_id",
          ],
          rows.map((r) => [
            r.createdAt.toISOString(), r.email, r.success ? "yes" : "no",
            r.failureReason, r.ip, r.isIpv6 ? "yes" : "no", r.deviceId,
            r.browser, r.os, r.country, r.city, r.isVpn ? "yes" : "no",
            r.isProxy ? "yes" : "no", r.isTor ? "yes" : "no", r.riskScore,
            r.userId,
          ])
        );
        break;
      }

      case "events": {
        const rows = await prisma.securityEvent.findMany({
          where: dateWhere,
          orderBy: { createdAt: "desc" },
          take: SECURITY_EXPORT_MAX_ROWS,
          include: { user: { select: { email: true, name: true } } },
        });
        rowCount = rows.length;
        filename = "security-events";
        csv = toCsv(
          [
            "timestamp", "type", "severity", "user_email", "email", "reason",
            "ip", "country", "city", "actor_id", "metadata",
          ],
          rows.map((r) => [
            r.createdAt.toISOString(), r.type, r.severity, r.user?.email ?? null,
            r.email, r.reason, r.ip, r.country, r.city, r.actorId, r.metadata,
          ])
        );
        break;
      }

      case "banned-users": {
        const rows = await prisma.bannedUser.findMany({
          where: dateWhere,
          orderBy: { createdAt: "desc" },
          take: SECURITY_EXPORT_MAX_ROWS,
          include: { user: { select: { email: true, name: true, role: true } } },
        });
        rowCount = rows.length;
        filename = "banned-users";
        csv = toCsv(
          [
            "banned_at", "email", "name", "role", "type", "status", "reason",
            "expires_at", "created_by", "lifted_at", "lifted_by", "lift_reason",
          ],
          rows.map((r) => [
            r.createdAt.toISOString(), r.user.email, r.user.name, r.user.role,
            r.type, r.status, r.reason, r.expiresAt?.toISOString() ?? "permanent",
            r.createdBy, r.liftedAt?.toISOString() ?? null, r.liftedBy,
            r.liftReason,
          ])
        );
        break;
      }

      case "banned-ips": {
        const rows = await prisma.bannedIp.findMany({
          where: dateWhere,
          orderBy: { createdAt: "desc" },
          take: SECURITY_EXPORT_MAX_ROWS,
        });
        rowCount = rows.length;
        filename = "banned-ips";
        csv = toCsv(
          [
            "created_at", "ip", "is_range", "prefix_length", "ipv6", "status",
            "reason", "expires_at", "hit_count", "last_hit_at", "created_by",
          ],
          rows.map((r) => [
            r.createdAt.toISOString(), r.ip, r.isRange ? "yes" : "no",
            r.prefixLength, r.isIpv6 ? "yes" : "no", r.status, r.reason,
            r.expiresAt?.toISOString() ?? "permanent", r.hitCount,
            r.lastHitAt?.toISOString() ?? null, r.createdBy,
          ])
        );
        break;
      }

      default:
        return errorResponse("Unknown export view", 400);
    }

    await logAudit({
      adminId: admin.id,
      action: "EXPORT_SECURITY_LOGS",
      targetType: "SECURITY",
      details: { view, rowCount, from, to, truncated: rowCount >= SECURITY_EXPORT_MAX_ROWS },
    });

    const stamp = new Date().toISOString().split("T")[0];

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse();
      if (error.message === "Forbidden") return forbiddenResponse();
    }
    console.error("[security] Export failed:", error);
    return errorResponse("Export failed", 500);
  }
}
