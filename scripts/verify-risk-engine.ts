/**
 * End-to-end verification of the risk scoring engine.
 *
 * Seeds a throwaway account with behaviour that should trip specific rules,
 * runs the real engine, and asserts the resulting score and signals. Cleans up
 * in a finally block.
 *
 *   npx tsx scripts/verify-risk-engine.ts
 */

import { PrismaClient } from "@prisma/client";
import {
  computeRiskScore,
  ensureRiskRulesSeeded,
  sweepExpiredSignals,
} from "../src/lib/security/risk/engine";
import { detectImpossibleTravel, haversineKm } from "../src/lib/security/risk/geo";
import { hashIp } from "../src/lib/security/hash";
import { RISK_THRESHOLDS } from "../src/config/security";

const prisma = new PrismaClient();

let pass = 0;
let fail = 0;

function check(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}\n      expected: ${expected}\n      actual:   ${actual}`);
  }
}

const STAMP = Date.now();
const userIds: string[] = [];

async function makeUser(suffix: string) {
  const user = await prisma.user.create({
    data: {
      email: `risk-${suffix}-${STAMP}@example.invalid`,
      name: `Risk Test ${suffix}`,
      passwordHash: "not-a-real-hash",
      role: "FOLLOWER",
    },
    select: { id: true, email: true },
  });
  userIds.push(user.id);
  return user;
}

async function main() {
  console.log("\n═══ Geo maths ═══");
  // London → New York is ~5,570 km.
  const londonToNy = haversineKm(51.5074, -0.1278, 40.7128, -74.006);
  check("London→NY distance plausible", Math.abs(londonToNy - 5570) < 60, true);
  check("zero distance for identical points", haversineKm(10, 10, 10, 10), 0);

  const impossible = detectImpossibleTravel(
    { latitude: 51.5074, longitude: -0.1278, at: new Date("2026-01-01T00:00:00Z") },
    { latitude: 40.7128, longitude: -74.006, at: new Date("2026-01-01T01:00:00Z") },
  );
  check("London→NY in 1h is impossible", impossible.impossible, true);

  const possible = detectImpossibleTravel(
    { latitude: 51.5074, longitude: -0.1278, at: new Date("2026-01-01T00:00:00Z") },
    { latitude: 40.7128, longitude: -74.006, at: new Date("2026-01-01T08:00:00Z") },
  );
  check("London→NY in 8h is plausible", possible.impossible, false);

  const shortHop = detectImpossibleTravel(
    { latitude: 51.5074, longitude: -0.1278, at: new Date("2026-01-01T00:00:00Z") },
    { latitude: 51.7520, longitude: -1.2577, at: new Date("2026-01-01T00:01:00Z") },
  );
  check("short hop below threshold ignored (geo noise)", shortHop.impossible, false);

  console.log("\n═══ Rule config seeding ═══");
  await ensureRiskRulesSeeded();
  const configs = await prisma.riskRuleConfig.findMany();
  check("all default rules seeded", configs.length >= 10, true);

  // Seeding must be idempotent — a redeploy must not duplicate or reset tuning.
  const seededAgain = await ensureRiskRulesSeeded();
  check("re-seeding is a no-op", seededAgain, 0);

  console.log("\n═══ Clean account scores low ═══");
  const clean = await makeUser("clean");
  const cleanScore = await computeRiskScore(clean.id);
  check("clean account scores 0", cleanScore.score, 0);
  check("clean account level LOW", cleanScore.level, "LOW");
  check("clean account not flagged", cleanScore.flagged, false);
  check("no rules errored", cleanScore.errors.length, 0);

  console.log("\n═══ Failed login burst ═══");
  const burst = await makeUser("burst");
  await prisma.loginAttempt.createMany({
    data: Array.from({ length: 6 }, () => ({
      userId: burst.id,
      email: burst.email,
      success: false,
      failureReason: "BAD_PASSWORD",
      ip: "203.0.113.10",
      ipHash: hashIp("203.0.113.10"),
    })),
  });

  const burstScore = await computeRiskScore(burst.id);
  const burstRules = burstScore.signals.map((s) => s.rule);
  check("FAILED_LOGIN_BURST fired", burstRules.includes("FAILED_LOGIN_BURST"), true);
  check("score above zero", burstScore.score > 0, true);

  console.log("\n═══ Impossible travel ═══");
  const traveller = await makeUser("travel");
  const now = Date.now();
  await prisma.loginAttempt.createMany({
    data: [
      {
        userId: traveller.id,
        email: traveller.email,
        success: true,
        ip: "203.0.113.20",
        ipHash: hashIp("203.0.113.20"),
        latitude: 51.5074,
        longitude: -0.1278,
        city: "London",
        country: "GB",
        createdAt: new Date(now - 60 * 60 * 1000),
      },
      {
        userId: traveller.id,
        email: traveller.email,
        success: true,
        ip: "198.51.100.20",
        ipHash: hashIp("198.51.100.20"),
        latitude: 40.7128,
        longitude: -74.006,
        city: "New York",
        country: "US",
        createdAt: new Date(now),
      },
    ],
  });

  const travelScore = await computeRiskScore(traveller.id);
  const travelRules = travelScore.signals.map((s) => s.rule);
  check("IMPOSSIBLE_TRAVEL fired", travelRules.includes("IMPOSSIBLE_TRAVEL"), true);

  const travelSignal = travelScore.signals.find((s) => s.rule === "IMPOSSIBLE_TRAVEL");
  check(
    "signal explains the journey",
    (travelSignal?.detail as { distanceKm: number }).distanceKm > 5000,
    true
  );

  console.log("\n═══ High-risk geography + VPN ═══");
  const flagged = await makeUser("flagged");
  await prisma.loginAttempt.createMany({
    data: [
      {
        userId: flagged.id,
        email: flagged.email,
        success: true,
        ip: "203.0.113.30",
        ipHash: hashIp("203.0.113.30"),
        country: "KP",
        city: "Pyongyang",
        isVpn: true,
      },
    ],
  });

  const flaggedScore = await computeRiskScore(flagged.id);
  const flaggedRules = flaggedScore.signals.map((s) => s.rule);
  check("HIGH_RISK_GEO fired", flaggedRules.includes("HIGH_RISK_GEO"), true);
  check("VPN_OR_PROXY fired", flaggedRules.includes("VPN_OR_PROXY"), true);

  console.log("\n═══ Shared device across accounts ═══");
  const sharedDeviceId = `shared-device-${STAMP}`;
  const a = await makeUser("shared-a");
  const b = await makeUser("shared-b");
  const c = await makeUser("shared-c");

  await prisma.userDevice.createMany({
    data: [a, b, c].map((u) => ({
      userId: u.id,
      deviceId: sharedDeviceId,
      browser: "Chrome",
      os: "Windows",
    })),
  });

  const sharedScore = await computeRiskScore(a.id);
  const sharedRules = sharedScore.signals.map((s) => s.rule);
  check(
    "SHARED_DEVICE_MULTI_ACCOUNT fired",
    sharedRules.includes("SHARED_DEVICE_MULTI_ACCOUNT"),
    true
  );

  const sharedSignal = sharedScore.signals.find(
    (s) => s.rule === "SHARED_DEVICE_MULTI_ACCOUNT"
  );
  check(
    "reports the account count",
    (sharedSignal?.detail as { accountsOnDevice: number }).accountsOnDevice,
    3
  );

  console.log("\n═══ Score aggregation and persistence ═══");
  const persisted = await prisma.riskScore.findUnique({
    where: { userId: flagged.id },
    include: { signals: true },
  });
  check("score row persisted", persisted !== null, true);
  check("signals persisted for explainability", persisted!.signals.length > 0, true);
  check(
    "persisted score matches computation",
    persisted!.score,
    flaggedScore.score
  );
  check(
    "every signal carries a detail payload",
    persisted!.signals.every((s) => s.detail !== null && s.detail.length > 2),
    true
  );

  console.log("\n═══ Idempotency ═══");
  const first = await computeRiskScore(flagged.id);
  const second = await computeRiskScore(flagged.id);
  check("repeat scoring is stable", second.score, first.score);

  const signalRows = await prisma.riskSignal.count({
    where: { userId: flagged.id, rule: "HIGH_RISK_GEO" },
  });
  check("signals are not duplicated on rescore", signalRows, 1);

  console.log("\n═══ Level boundaries ═══");
  check("MEDIUM below HIGH", RISK_THRESHOLDS.MEDIUM < RISK_THRESHOLDS.HIGH, true);
  check("HIGH below CRITICAL", RISK_THRESHOLDS.HIGH < RISK_THRESHOLDS.CRITICAL, true);
  check("score is clamped to max", first.score <= RISK_THRESHOLDS.maxScore, true);

  console.log("\n═══ Decay sweep ═══");
  const swept = await sweepExpiredSignals();
  check("sweep runs without error", typeof swept === "number", true);
}

async function cleanup() {
  console.log("\n═══ Cleanup ═══");
  try {
    if (userIds.length > 0) {
      await prisma.riskSignal.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.riskScore.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.loginAttempt.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.userDevice.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.securityEvent.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      console.log(`  removed ${userIds.length} test accounts and their data`);
    }
  } catch (error) {
    console.error("  cleanup failed:", error);
  }
}

main()
  .catch((error) => {
    fail++;
    console.error("\nFATAL:", error);
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
    console.log(`\n${"─".repeat(50)}`);
    console.log(`${pass} passed, ${fail} failed`);
    process.exit(fail > 0 ? 1 : 0);
  });
