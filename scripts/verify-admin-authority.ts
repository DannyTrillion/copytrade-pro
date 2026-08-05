/**
 * Verifies the two guarantees requested for administrator authority:
 *
 *   1. Administrators can never be locked out by automated security rules.
 *   2. Nothing is ever banned automatically — detection only ever flags.
 *
 *   npx tsx scripts/verify-admin-authority.ts
 */

import { PrismaClient } from "@prisma/client";
import { evaluateAccess, invalidateEnforcementCaches } from "../src/lib/security/enforcement";
import { computeRiskScore } from "../src/lib/security/risk/engine";
import { hashDeviceId, hashEmail, hashIp } from "../src/lib/security/hash";

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
const ADMIN_EMAIL = `admin-authority-${STAMP}@example.invalid`;
const USER_EMAIL = `user-authority-${STAMP}@example.invalid`;
const BAD_IP = "203.0.113.200";
const BAD_DEVICE = `blocked-device-${STAMP}`;

const userIds: string[] = [];
const ipIds: string[] = [];

async function main() {
  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: "Authority Admin",
      passwordHash: "x",
      role: "ADMIN",
    },
    select: { id: true },
  });
  userIds.push(admin.id);

  const normal = await prisma.user.create({
    data: {
      email: USER_EMAIL,
      name: "Authority User",
      passwordHash: "x",
      role: "FOLLOWER",
    },
    select: { id: true },
  });
  userIds.push(normal.id);

  console.log("\n═══ Blacklist the admin's own IP, device and email ═══");
  const banned = await prisma.bannedIp.create({
    data: {
      ip: BAD_IP,
      ipHash: hashIp(BAD_IP)!,
      reason: "authority verification",
      createdBy: admin.id,
    },
    select: { id: true },
  });
  ipIds.push(banned.id);

  await prisma.bannedIdentifier.createMany({
    data: [
      {
        kind: "DEVICE",
        valueHash: hashDeviceId(BAD_DEVICE),
        reason: "authority verification",
        createdBy: admin.id,
      },
      {
        kind: "EMAIL",
        valueHash: hashEmail(ADMIN_EMAIL),
        reason: "authority verification",
        createdBy: admin.id,
      },
    ],
    skipDuplicates: true,
  });

  await invalidateEnforcementCaches();

  const context = {
    ip: BAD_IP,
    ipHash: hashIp(BAD_IP),
    deviceId: BAD_DEVICE,
  };

  console.log("\n═══ 1. Administrator immunity ═══");
  const adminAccess = await evaluateAccess({
    surface: "LOGIN",
    email: ADMIN_EMAIL,
    context,
  });
  check("admin allowed despite banned IP", adminAccess.allowed, true);

  const adminSignup = await evaluateAccess({
    surface: "SIGNUP",
    email: ADMIN_EMAIL,
    context,
  });
  check("admin allowed despite banned device+email", adminSignup.allowed, true);

  // The exemption must be specific to admins, not a hole for everyone.
  const userAccess = await evaluateAccess({
    surface: "LOGIN",
    email: USER_EMAIL,
    context,
  });
  check("non-admin still blocked by same rules", userAccess.allowed, false);
  check("non-admin blocked at the IP layer", userAccess.rule, "IP_BLACKLISTED");

  console.log("\n═══ Immunity is revoked with the role ═══");
  await prisma.user.update({
    where: { id: admin.id },
    data: { role: "FOLLOWER" },
  });
  await invalidateEnforcementCaches();

  const demoted = await evaluateAccess({
    surface: "LOGIN",
    email: ADMIN_EMAIL,
    context,
  });
  check("demoted admin loses immunity", demoted.allowed, false);

  await prisma.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  await invalidateEnforcementCaches();

  // A banned admin must not be able to use the exemption to get back in.
  await prisma.user.update({
    where: { id: admin.id },
    data: { bannedAt: new Date(), suspended: true },
  });
  await invalidateEnforcementCaches();

  const bannedAdmin = await evaluateAccess({
    surface: "LOGIN",
    email: ADMIN_EMAIL,
    context,
  });
  check("banned admin loses immunity", bannedAdmin.allowed, false);

  await prisma.user.update({
    where: { id: admin.id },
    data: { bannedAt: null, suspended: false },
  });
  await invalidateEnforcementCaches();

  console.log("\n═══ 2. No automatic banning ═══");
  // Give the account behaviour that scores as high as possible.
  await prisma.loginAttempt.createMany({
    data: [
      ...Array.from({ length: 12 }, () => ({
        userId: normal.id,
        email: USER_EMAIL,
        success: false,
        failureReason: "BAD_PASSWORD",
        ip: BAD_IP,
        ipHash: hashIp(BAD_IP),
      })),
      {
        userId: normal.id,
        email: USER_EMAIL,
        success: true,
        ip: BAD_IP,
        ipHash: hashIp(BAD_IP),
        country: "KP",
        isVpn: true,
        isTor: true,
        latitude: 51.5074,
        longitude: -0.1278,
        createdAt: new Date(Date.now() - 3600_000),
      },
      {
        userId: normal.id,
        email: USER_EMAIL,
        success: true,
        ip: "198.51.100.90",
        ipHash: hashIp("198.51.100.90"),
        country: "US",
        latitude: 40.7128,
        longitude: -74.006,
      },
    ],
  });

  const score = await computeRiskScore(normal.id);
  console.log(`  (computed score: ${score.score}, level: ${score.level})`);

  check("account scores high enough to flag", score.flagged, true);

  const after = await prisma.user.findUnique({
    where: { id: normal.id },
    select: { bannedAt: true, suspended: true, deletedAt: true },
  });

  check("scoring did NOT ban the account", after!.bannedAt, null);
  check("scoring did NOT suspend the account", after!.suspended, false);
  check("scoring did NOT delete the account", after!.deletedAt, null);

  const enforcements = await prisma.bannedUser.count({ where: { userId: normal.id } });
  check("no enforcement record created", enforcements, 0);

  const newBlacklist = await prisma.bannedIdentifier.count({
    where: { sourceUserId: normal.id },
  });
  check("no identifier auto-blacklisted", newBlacklist, 0);

  // The account must still be able to authenticate — flagged is not blocked.
  await prisma.bannedIp.deleteMany({ where: { id: { in: ipIds } } });
  await invalidateEnforcementCaches();

  const stillAllowed = await evaluateAccess({
    surface: "LOGIN",
    email: USER_EMAIL,
    context: { ip: "192.0.2.123", ipHash: hashIp("192.0.2.123") },
  });
  check("flagged account can still log in", stillAllowed.allowed, true);

  console.log("\n═══ Alert is raised for the admin instead ═══");
  const alert = await prisma.securityEvent.findFirst({
    where: { userId: normal.id, type: "RISK_FLAGGED" },
    select: { severity: true, reason: true },
  });
  check("RISK_FLAGGED event written", alert !== null, true);
  check(
    "alert severity is actionable",
    ["HIGH", "CRITICAL"].includes(alert?.severity ?? ""),
    true
  );
}

async function cleanup() {
  console.log("\n═══ Cleanup ═══");
  try {
    await prisma.bannedIp.deleteMany({ where: { id: { in: ipIds } } });
    await prisma.bannedIdentifier.deleteMany({
      where: { createdBy: { in: userIds } },
    });
    await prisma.riskSignal.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.riskScore.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.loginAttempt.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.securityEvent.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.log("  removed verification data");
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
