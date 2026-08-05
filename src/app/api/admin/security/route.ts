/**
 * Security Center read API.
 *
 * GET /api/admin/security?view=<view>
 *
 * One route with a `view` discriminator rather than a route per table, matching
 * the existing `/api/admin?view=` convention in this codebase. Every view is
 * cursor-free offset paginated against an index that exists in the schema —
 * see the `@@index` declarations on each model.
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
import {
  SECURITY_MAX_PAGE_SIZE,
  SECURITY_PAGE_SIZE,
  RISK_THRESHOLDS,
} from "@/config/security";

export const dynamic = "force-dynamic";

type SecurityView =
  | "user-profile"
  | "overview"
  | "banned-users"
  | "banned-ips"
  | "banned-identifiers"
  | "allowlist"
  | "devices"
  | "login-history"
  | "events"
  | "risk-queue";

function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const requested = Number(searchParams.get("pageSize")) || SECURITY_PAGE_SIZE;
  const pageSize = Math.min(Math.max(1, requested), SECURITY_MAX_PAGE_SIZE);

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const view = (searchParams.get("view") || "overview") as SecurityView;
    const q = (searchParams.get("q") || "").trim();
    const status = searchParams.get("status") || "";
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    switch (view) {
      case "overview":
        return NextResponse.json(await getOverview());

      case "banned-users":
        return NextResponse.json(
          await getBannedUsers({ q, status, skip, take, page, pageSize })
        );

      case "banned-ips":
        return NextResponse.json(
          await getBannedIps({ q, status, skip, take, page, pageSize })
        );

      case "banned-identifiers":
        return NextResponse.json(
          await getBannedIdentifiers({ q, status, skip, take, page, pageSize })
        );

      case "allowlist":
        return NextResponse.json(await getAllowlist({ q, skip, take, page, pageSize }));

      case "devices":
        return NextResponse.json(await getDevices({ q, skip, take, page, pageSize }));

      case "login-history":
        return NextResponse.json(
          await getLoginHistory({ q, status, skip, take, page, pageSize })
        );

      case "events":
        return NextResponse.json(
          await getEvents({ q, status, skip, take, page, pageSize })
        );

      case "risk-queue":
        return NextResponse.json(await getRiskQueue({ skip, take, page, pageSize }));

      case "user-profile": {
        const userId = searchParams.get("userId");
        if (!userId) return errorResponse("userId is required", 400);
        return NextResponse.json(await getUserSecurityProfile(userId));
      }

      default:
        return errorResponse("Unknown view", 400);
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse();
      if (error.message === "Forbidden") return forbiddenResponse();
    }
    console.error("[security] Read failed:", error);
    return errorResponse("Failed to load security data", 500);
  }
}

interface PageArgs {
  q?: string;
  status?: string;
  skip: number;
  take: number;
  page: number;
  pageSize: number;
}

function meta(total: number, page: number, pageSize: number) {
  return { total, page, pageSize, pages: Math.ceil(total / pageSize) || 1 };
}

/**
 * Everything an admin needs to make a moderation decision about one account,
 * in a single round trip: current enforcement state, risk score with its
 * contributing signals, known devices, and recent authentication history.
 */
async function getUserSecurityProfile(userId: string) {
  const [user, enforcements, risk, devices, logins, events] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        suspended: true,
        bannedAt: true,
        deletedAt: true,
        createdAt: true,
        lastLoginAt: true,
        lastLoginIp: true,
        lastLoginCountry: true,
        sessionVersion: true,
        emailVerified: true,
        twoFactorEnabled: true,
      },
    }),
    prisma.bannedUser.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.riskScore.findUnique({
      where: { userId },
      include: { signals: { orderBy: { createdAt: "desc" }, take: 12 } },
    }),
    prisma.userDevice.findMany({
      where: { userId },
      orderBy: { lastSeenAt: "desc" },
      take: 10,
    }),
    prisma.loginAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.securityEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  if (!user) return { error: "User not found" };

  // Multi-account correlation for this account's devices, so an admin can see
  // "this machine also runs 3 other accounts" without leaving the panel.
  const deviceIds = devices.map((d) => d.deviceId);
  const shared =
    deviceIds.length > 0
      ? await prisma.userDevice.groupBy({
          by: ["deviceId"],
          where: { deviceId: { in: deviceIds } },
          _count: { userId: true },
        })
      : [];

  const sharedMap = Object.fromEntries(
    shared.map((s) => [s.deviceId, s._count.userId])
  );

  return {
    user,
    activeEnforcement: enforcements.find((e) => e.status === "ACTIVE") ?? null,
    enforcements,
    risk,
    devices: devices.map((d) => ({ ...d, accountCount: sharedMap[d.deviceId] ?? 1 })),
    logins,
    events,
  };
}

async function getOverview() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Parallel aggregates — each hits a dedicated index rather than scanning.
  const [
    activeBans,
    activeSuspensions,
    bannedIps,
    blacklistedIdentifiers,
    flaggedAccounts,
    failedLogins24h,
    blockedLogins24h,
    totalDevices,
    sharedDevices,
    recentEvents,
  ] = await Promise.all([
    prisma.bannedUser.count({ where: { status: "ACTIVE", type: "BAN" } }),
    prisma.bannedUser.count({ where: { status: "ACTIVE", type: "SUSPENSION" } }),
    prisma.bannedIp.count({ where: { status: "ACTIVE" } }),
    prisma.bannedIdentifier.count({ where: { status: "ACTIVE" } }),
    prisma.riskScore.count({ where: { flagged: true, reviewedAt: null } }),
    prisma.loginAttempt.count({
      where: { success: false, createdAt: { gte: dayAgo } },
    }),
    prisma.securityEvent.count({
      where: {
        type: { in: ["LOGIN_BLOCKED", "SIGNUP_BLOCKED", "IP_BLOCKED"] },
        createdAt: { gte: dayAgo },
      },
    }),
    prisma.userDevice.count(),
    prisma.userDevice.groupBy({
      by: ["deviceId"],
      _count: { userId: true },
      having: { userId: { _count: { gt: 1 } } },
    }),
    prisma.securityEvent.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        severity: true,
        email: true,
        reason: true,
        ip: true,
        country: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  return {
    stats: {
      activeBans,
      activeSuspensions,
      bannedIps,
      blacklistedIdentifiers,
      flaggedAccounts,
      failedLogins24h,
      blockedLogins24h,
      totalDevices,
      sharedDevices: sharedDevices.length,
    },
    recentEvents,
  };
}

async function getBannedUsers({ q, status, skip, take, page, pageSize }: PageArgs) {
  const where: Prisma.BannedUserWhereInput = {
    ...(status && status !== "ALL" ? { status: status as never } : {}),
    ...(q
      ? {
          user: {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.bannedUser.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        reason: true,
        internalNote: true,
        expiresAt: true,
        createdAt: true,
        createdBy: true,
        liftedAt: true,
        liftedBy: true,
        liftReason: true,
        userId: true,
        user: {
          select: {
            email: true,
            name: true,
            role: true,
            createdAt: true,
            lastLoginIp: true,
            lastLoginCountry: true,
            deletedAt: true,
          },
        },
      },
    }),
    prisma.bannedUser.count({ where }),
  ]);

  const adminIds = [
    ...new Set(rows.flatMap((r) => [r.createdBy, r.liftedBy].filter(Boolean))),
  ] as string[];

  const admins = await prisma.user.findMany({
    where: { id: { in: adminIds } },
    select: { id: true, name: true, email: true },
  });

  const adminMap = Object.fromEntries(admins.map((a) => [a.id, a]));

  return {
    rows: rows.map((row) => ({
      ...row,
      createdByAdmin: adminMap[row.createdBy] ?? null,
      liftedByAdmin: row.liftedBy ? (adminMap[row.liftedBy] ?? null) : null,
    })),
    meta: meta(total, page, pageSize),
  };
}

async function getBannedIps({ q, status, skip, take, page, pageSize }: PageArgs) {
  const where: Prisma.BannedIpWhereInput = {
    ...(status && status !== "ALL" ? { status: status as never } : {}),
    ...(q ? { ip: { contains: q, mode: "insensitive" } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.bannedIp.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.bannedIp.count({ where }),
  ]);

  return { rows, meta: meta(total, page, pageSize) };
}

async function getBannedIdentifiers({
  q,
  status,
  skip,
  take,
  page,
  pageSize,
}: PageArgs) {
  const where: Prisma.BannedIdentifierWhereInput = {
    ...(status && status !== "ALL" ? { status: status as never } : {}),
    // Only the redacted hint is searchable — the plaintext is never stored.
    ...(q ? { valueHint: { contains: q, mode: "insensitive" } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.bannedIdentifier.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        kind: true,
        valueHint: true,
        status: true,
        reason: true,
        expiresAt: true,
        createdAt: true,
        createdBy: true,
        sourceUserId: true,
        liftedAt: true,
        liftReason: true,
      },
    }),
    prisma.bannedIdentifier.count({ where }),
  ]);

  return { rows, meta: meta(total, page, pageSize) };
}

async function getAllowlist({ q, skip, take, page, pageSize }: PageArgs) {
  const where: Prisma.SecurityAllowlistWhereInput = q
    ? { valueHint: { contains: q, mode: "insensitive" } }
    : {};

  const [rows, total] = await Promise.all([
    prisma.securityAllowlist.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.securityAllowlist.count({ where }),
  ]);

  return { rows, meta: meta(total, page, pageSize) };
}

async function getDevices({ q, skip, take, page, pageSize }: PageArgs) {
  const where: Prisma.UserDeviceWhereInput = q
    ? {
        OR: [
          { user: { email: { contains: q, mode: "insensitive" } } },
          { user: { name: { contains: q, mode: "insensitive" } } },
          { deviceId: { contains: q } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.userDevice.findMany({
      where,
      skip,
      take,
      orderBy: { lastSeenAt: "desc" },
      select: {
        id: true,
        deviceId: true,
        trusted: true,
        blocked: true,
        label: true,
        browser: true,
        browserVersion: true,
        os: true,
        osVersion: true,
        deviceType: true,
        firstSeenAt: true,
        lastSeenAt: true,
        lastIp: true,
        lastCountry: true,
        loginCount: true,
        userId: true,
        user: { select: { email: true, name: true, bannedAt: true, suspended: true } },
      },
    }),
    prisma.userDevice.count({ where }),
  ]);

  // Multi-account detection: how many distinct accounts share each fingerprint
  // on this page. Scoped to the page so the query stays bounded.
  const deviceIds = [...new Set(rows.map((r) => r.deviceId))];
  const shared = await prisma.userDevice.groupBy({
    by: ["deviceId"],
    where: { deviceId: { in: deviceIds } },
    _count: { userId: true },
  });

  const sharedMap = Object.fromEntries(
    shared.map((s) => [s.deviceId, s._count.userId])
  );

  return {
    rows: rows.map((row) => ({ ...row, accountCount: sharedMap[row.deviceId] ?? 1 })),
    meta: meta(total, page, pageSize),
  };
}

async function getLoginHistory({
  q,
  status,
  skip,
  take,
  page,
  pageSize,
}: PageArgs) {
  const where: Prisma.LoginAttemptWhereInput = {
    ...(status === "SUCCESS"
      ? { success: true }
      : status === "FAILED"
        ? { success: false }
        : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { ip: { contains: q, mode: "insensitive" } },
            { country: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.loginAttempt.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        success: true,
        failureReason: true,
        ip: true,
        isIpv6: true,
        deviceId: true,
        browser: true,
        os: true,
        country: true,
        city: true,
        isVpn: true,
        isProxy: true,
        isTor: true,
        riskScore: true,
        createdAt: true,
        userId: true,
      },
    }),
    prisma.loginAttempt.count({ where }),
  ]);

  return { rows, meta: meta(total, page, pageSize) };
}

async function getEvents({ q, status, skip, take, page, pageSize }: PageArgs) {
  const where: Prisma.SecurityEventWhereInput = {
    ...(status && status !== "ALL" ? { severity: status as never } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { reason: { contains: q, mode: "insensitive" } },
            { ip: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.securityEvent.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        severity: true,
        email: true,
        reason: true,
        metadata: true,
        ip: true,
        country: true,
        city: true,
        userAgent: true,
        createdAt: true,
        userId: true,
        actorId: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.securityEvent.count({ where }),
  ]);

  return { rows, meta: meta(total, page, pageSize) };
}

async function getRiskQueue({ skip, take, page, pageSize }: PageArgs) {
  const where: Prisma.RiskScoreWhereInput = {
    score: { gte: RISK_THRESHOLDS.MEDIUM },
  };

  const [rows, total] = await Promise.all([
    prisma.riskScore.findMany({
      where,
      skip,
      take,
      orderBy: [{ flagged: "desc" }, { score: "desc" }],
      select: {
        id: true,
        score: true,
        level: true,
        flagged: true,
        reviewedAt: true,
        reviewedBy: true,
        reviewNote: true,
        computedAt: true,
        userId: true,
        user: {
          select: {
            email: true,
            name: true,
            createdAt: true,
            bannedAt: true,
            suspended: true,
            lastLoginCountry: true,
          },
        },
        signals: {
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { id: true, rule: true, weight: true, detail: true, createdAt: true },
        },
      },
    }),
    prisma.riskScore.count({ where }),
  ]);

  return { rows, meta: meta(total, page, pageSize) };
}
