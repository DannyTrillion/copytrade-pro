/**
 * Risk detection rules.
 *
 * Each rule is an independent async function that inspects one behaviour and
 * either returns a signal or returns null. They are deliberately isolated:
 *
 *  - A rule that throws must not take down scoring. The engine catches per-rule.
 *  - Rules never read each other's output, so they can run concurrently and be
 *    added or removed without touching anything else.
 *  - Every returned signal carries a `detail` payload, because an unexplainable
 *    score is unusable — an admin about to ban someone needs to see *why* the
 *    number is what it is.
 *
 * Weights and thresholds arrive from `RiskRuleConfig` (DB-driven), never
 * hardcoded here, so tuning does not require a deploy.
 */

import { prisma } from "@/lib/prisma";
import { detectImpossibleTravel, HIGH_RISK_COUNTRIES } from "./geo";

export interface RuleContext {
  userId: string;
  /** Resolved config for the rule currently being evaluated. */
  threshold: number;
  windowSeconds: number;
  now: Date;
}

export interface RuleSignal {
  rule: string;
  /** Human-readable explanation shown in the admin queue. */
  detail: Record<string, unknown>;
}

export type RuleFn = (ctx: RuleContext) => Promise<RuleSignal | null>;

function windowStart(ctx: RuleContext): Date {
  return new Date(ctx.now.getTime() - ctx.windowSeconds * 1000);
}

/** Repeated failed logins — credential guessing, or a compromised password in circulation. */
const failedLoginBurst: RuleFn = async (ctx) => {
  const count = await prisma.loginAttempt.count({
    where: {
      userId: ctx.userId,
      success: false,
      createdAt: { gte: windowStart(ctx) },
    },
  });

  if (count < ctx.threshold) return null;

  return {
    rule: "FAILED_LOGIN_BURST",
    detail: { failedAttempts: count, windowMinutes: ctx.windowSeconds / 60 },
  };
};

/**
 * Many distinct source addresses in a short window.
 *
 * Mobile networks rotate addresses legitimately, which is why the threshold is
 * configurable and the weight moderate — this is corroboration, not proof.
 */
const rapidIpChange: RuleFn = async (ctx) => {
  const attempts = await prisma.loginAttempt.findMany({
    where: {
      userId: ctx.userId,
      success: true,
      createdAt: { gte: windowStart(ctx) },
      ipHash: { not: null },
    },
    select: { ipHash: true, ip: true },
  });

  const distinct = new Set(attempts.map((a) => a.ipHash));
  if (distinct.size < ctx.threshold) return null;

  return {
    rule: "RAPID_IP_CHANGE",
    detail: {
      distinctAddresses: distinct.size,
      windowMinutes: ctx.windowSeconds / 60,
      sample: [...new Set(attempts.map((a) => a.ip).filter(Boolean))].slice(0, 5),
    },
  };
};

/**
 * One device fingerprint spanning several accounts.
 *
 * The strongest multi-account signal available, and also the one with the most
 * innocent explanations — shared households, office machines, internet cafés.
 * High weight, but never a standalone basis for action.
 */
const sharedDeviceMultiAccount: RuleFn = async (ctx) => {
  const devices = await prisma.userDevice.findMany({
    where: { userId: ctx.userId },
    select: { deviceId: true },
  });

  if (devices.length === 0) return null;

  const shared = await prisma.userDevice.groupBy({
    by: ["deviceId"],
    where: { deviceId: { in: devices.map((d) => d.deviceId) } },
    _count: { userId: true },
    having: { userId: { _count: { gte: ctx.threshold } } },
  });

  if (shared.length === 0) return null;

  const worst = shared.reduce((a, b) => (a._count.userId > b._count.userId ? a : b));

  // Surface whether any co-located account is already banned — that turns a
  // weak correlation into an actionable lead.
  const bannedSiblings = await prisma.userDevice.count({
    where: {
      deviceId: worst.deviceId,
      userId: { not: ctx.userId },
      user: { bannedAt: { not: null } },
    },
  });

  return {
    rule: "SHARED_DEVICE_MULTI_ACCOUNT",
    detail: {
      accountsOnDevice: worst._count.userId,
      bannedAccountsOnDevice: bannedSiblings,
      devicePrefix: worst.deviceId.slice(0, 12),
    },
  };
};

/** Recent authentication from a VPN, proxy or Tor exit node. */
const vpnOrProxy: RuleFn = async (ctx) => {
  const hit = await prisma.loginAttempt.findFirst({
    where: {
      userId: ctx.userId,
      success: true,
      OR: [{ isVpn: true }, { isProxy: true }, { isTor: true }],
    },
    orderBy: { createdAt: "desc" },
    select: { isVpn: true, isProxy: true, isTor: true, ip: true, createdAt: true },
  });

  if (!hit) return null;

  return {
    rule: "VPN_OR_PROXY",
    detail: {
      vpn: hit.isVpn,
      proxy: hit.isProxy,
      tor: hit.isTor,
      seenAt: hit.createdAt.toISOString(),
    },
  };
};

/** Authentication from a jurisdiction on the high-risk list. */
const highRiskGeo: RuleFn = async (ctx) => {
  const attempts = await prisma.loginAttempt.findMany({
    where: { userId: ctx.userId, success: true, country: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { country: true, city: true, createdAt: true },
  });

  const flagged = attempts.filter(
    (a) => a.country && HIGH_RISK_COUNTRIES.has(a.country.toUpperCase())
  );

  if (flagged.length === 0) return null;

  return {
    rule: "HIGH_RISK_GEO",
    detail: {
      countries: [...new Set(flagged.map((f) => f.country))],
      occurrences: flagged.length,
      mostRecent: flagged[0].createdAt.toISOString(),
    },
  };
};

/** Consecutive logins from locations no traveller could cover in the elapsed time. */
const impossibleTravel: RuleFn = async (ctx) => {
  const recent = await prisma.loginAttempt.findMany({
    where: {
      userId: ctx.userId,
      success: true,
      latitude: { not: null },
      longitude: { not: null },
      createdAt: { gte: windowStart(ctx) },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { latitude: true, longitude: true, createdAt: true, city: true, country: true },
  });

  if (recent.length < 2) return null;

  // Compare each consecutive pair rather than only the newest two — a rapid
  // A→B→A pattern is a strong signal that a single hop comparison would miss.
  for (let i = 0; i < recent.length - 1; i++) {
    const current = recent[i];
    const previous = recent[i + 1];

    const result = detectImpossibleTravel(
      {
        latitude: previous.latitude!,
        longitude: previous.longitude!,
        at: previous.createdAt,
      },
      {
        latitude: current.latitude!,
        longitude: current.longitude!,
        at: current.createdAt,
      }
    );

    if (result.impossible) {
      return {
        rule: "IMPOSSIBLE_TRAVEL",
        detail: {
          from: `${previous.city ?? "?"}, ${previous.country ?? "?"}`,
          to: `${current.city ?? "?"}, ${current.country ?? "?"}`,
          distanceKm: result.distanceKm,
          hours: result.hours,
          impliedSpeedKmh: result.impliedSpeedKmh,
        },
      };
    }
  }

  return null;
};

/** First authentication from a previously unseen device. Low weight — routine on its own. */
const newDevice: RuleFn = async (ctx) => {
  const recent = await prisma.userDevice.findFirst({
    where: { userId: ctx.userId, firstSeenAt: { gte: windowStart(ctx) } },
    orderBy: { firstSeenAt: "desc" },
    select: { browser: true, os: true, firstSeenAt: true, loginCount: true },
  });

  if (!recent || recent.loginCount > 1) return null;

  return {
    rule: "NEW_DEVICE",
    detail: {
      browser: recent.browser,
      os: recent.os,
      firstSeenAt: recent.firstSeenAt.toISOString(),
    },
  };
};

/**
 * Trading volume materially outside the account's own baseline.
 *
 * Compared against the user's own history rather than a platform-wide constant:
 * a $50k day is unremarkable for a whale and extraordinary for a $500 account,
 * and a global threshold cannot tell those apart.
 */
const abnormalTradingVolume: RuleFn = async (ctx) => {
  const recentWindow = windowStart(ctx);
  const baselineStart = new Date(ctx.now.getTime() - 30 * 24 * 3_600_000);

  const [recent, baseline] = await Promise.all([
    prisma.trade.aggregate({
      where: { userId: ctx.userId, createdAt: { gte: recentWindow } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.trade.aggregate({
      where: {
        userId: ctx.userId,
        createdAt: { gte: baselineStart, lt: recentWindow },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const recentVolume = recent._sum.amount ?? 0;
  const baselineVolume = baseline._sum.amount ?? 0;

  // Need history to compare against; a brand-new account has no baseline and
  // would otherwise trip this on its very first trade.
  if (baseline._count < 5 || baselineVolume <= 0) return null;

  const windowDays = Math.max(1, ctx.windowSeconds / 86_400);
  const baselineDailyAverage = baselineVolume / 30;
  const recentDailyAverage = recentVolume / windowDays;

  const ratio = recentDailyAverage / baselineDailyAverage;
  if (ratio < ctx.threshold) return null;

  return {
    rule: "ABNORMAL_TRADING_VOLUME",
    detail: {
      recentDailyAverage: Math.round(recentDailyAverage),
      baselineDailyAverage: Math.round(baselineDailyAverage),
      multiple: Number(ratio.toFixed(1)),
      tradesInWindow: recent._count,
    },
  };
};

/**
 * Withdrawal requested immediately after a deposit clears.
 *
 * A classic laundering and stolen-card pattern: move value in, pull it straight
 * back out through a different rail before the original payment can be
 * reversed.
 */
const rapidWithdrawalAfterDeposit: RuleFn = async (ctx) => {
  const withdrawals = await prisma.withdrawalRequest.findMany({
    where: { userId: ctx.userId, createdAt: { gte: windowStart(ctx) } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, amount: true, createdAt: true },
  });

  if (withdrawals.length === 0) return null;

  for (const withdrawal of withdrawals) {
    const priorDeposit = await prisma.depositRequest.findFirst({
      where: {
        userId: ctx.userId,
        status: "CONFIRMED",
        createdAt: {
          gte: new Date(withdrawal.createdAt.getTime() - ctx.windowSeconds * 1000),
          lte: withdrawal.createdAt,
        },
      },
      orderBy: { createdAt: "desc" },
      select: { amount: true, createdAt: true },
    });

    if (!priorDeposit) continue;

    const gapMinutes =
      (withdrawal.createdAt.getTime() - priorDeposit.createdAt.getTime()) / 60_000;

    return {
      rule: "RAPID_WITHDRAWAL_AFTER_DEPOSIT",
      detail: {
        depositAmount: priorDeposit.amount,
        withdrawalAmount: withdrawal.amount,
        gapMinutes: Math.round(gapMinutes),
      },
    };
  }

  return null;
};

/** Many distinct accounts authenticating from one address. */
const sharedIpMultiAccount: RuleFn = async (ctx) => {
  const own = await prisma.loginAttempt.findFirst({
    where: { userId: ctx.userId, success: true, ipHash: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { ipHash: true, ip: true },
  });

  if (!own?.ipHash) return null;

  const siblings = await prisma.loginAttempt.findMany({
    where: {
      ipHash: own.ipHash,
      success: true,
      userId: { not: null },
      createdAt: { gte: windowStart(ctx) },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  if (siblings.length < ctx.threshold) return null;

  return {
    rule: "SHARED_IP_MULTI_ACCOUNT",
    detail: {
      accountsOnAddress: siblings.length,
      address: own.ip,
      note: "Shared offices, universities and carrier NAT produce this legitimately",
    },
  };
};

/** Registry consumed by the engine. Key must match the `rule` column in RiskRuleConfig. */
export const RISK_RULES: Record<string, RuleFn> = {
  FAILED_LOGIN_BURST: failedLoginBurst,
  RAPID_IP_CHANGE: rapidIpChange,
  SHARED_DEVICE_MULTI_ACCOUNT: sharedDeviceMultiAccount,
  VPN_OR_PROXY: vpnOrProxy,
  HIGH_RISK_GEO: highRiskGeo,
  IMPOSSIBLE_TRAVEL: impossibleTravel,
  NEW_DEVICE: newDevice,
  ABNORMAL_TRADING_VOLUME: abnormalTradingVolume,
  RAPID_WITHDRAWAL_AFTER_DEPOSIT: rapidWithdrawalAfterDeposit,
  SHARED_IP_MULTI_ACCOUNT: sharedIpMultiAccount,
};
