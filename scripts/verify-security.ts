/**
 * End-to-end verification of the security enforcement layer.
 *
 * Exercises the real code paths against the real database: creates a throwaway
 * account, bans it through the moderation service, and asserts that the
 * enforcement gate then denies re-registration through every layer. Cleans up
 * after itself in a finally block so a failure mid-run does not leave test rows
 * behind.
 *
 *   npx tsx scripts/verify-security.ts
 */

import { PrismaClient } from "@prisma/client";
import { evaluateAccess } from "../src/lib/security/enforcement";
import {
  hashDeviceId,
  hashEmail,
  hashIp,
  normalizeEmail,
  normalizePhone,
} from "../src/lib/security/hash";
import { getUserSecurityState, revokeUserSessions, validateSession } from "../src/lib/security/session";

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
const TEST_EMAIL = `sec-verify-${STAMP}@example.invalid`;
const TEST_IP = "203.0.113.77";
const TEST_RANGE = "198.51.100.0/24";
const TEST_DEVICE = `test-device-${STAMP}`;

let userId: string | null = null;
const createdIpIds: string[] = [];

async function main() {
  console.log("\n═══ Identifier normalisation (anti-evasion core) ═══");
  check("plus-tag stripped", normalizeEmail("john+spam@gmail.com"), "john@gmail.com");
  check("dots stripped for gmail", normalizeEmail("j.o.h.n@gmail.com"), "john@gmail.com");
  check("case folded", normalizeEmail("JOHN@Gmail.COM"), "john@gmail.com");
  check("googlemail aliased", normalizeEmail("john@googlemail.com"), "john@gmail.com");
  check("dots preserved for non-gmail", normalizeEmail("j.ohn@outlook.com"), "j.ohn@outlook.com");
  check(
    "all gmail variants hash identically",
    new Set([
      hashEmail("john@gmail.com"),
      hashEmail("J.o.h.n+newsletter@GMAIL.com"),
      hashEmail("john@googlemail.com"),
    ]).size,
    1
  );
  check("phone formatting normalised", normalizePhone("+1 (555) 010-1234"), "15550101234");
  check("phone 00 prefix normalised", normalizePhone("001 555 010 1234"), "15550101234");

  console.log("\n═══ Setup: create throwaway account ═══");
  const user = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      name: "Security Verification",
      passwordHash: "not-a-real-hash",
      role: "FOLLOWER",
      phone: "+15550109999",
      lastLoginIp: TEST_IP,
    },
    select: { id: true, sessionVersion: true },
  });
  userId = user.id;
  console.log(`  created ${TEST_EMAIL}`);

  // Must mirror recordDeviceSighting, which stores the *hashed* fingerprint.
  // Storing the raw value here would make the device blacklist silently miss.
  await prisma.userDevice.create({
    data: {
      userId: user.id,
      deviceId: hashDeviceId(TEST_DEVICE),
      browser: "Chrome",
      os: "macOS",
    },
  });

  console.log("\n═══ Baseline: clean identity is allowed ═══");
  const before = await evaluateAccess({
    surface: "SIGNUP",
    email: TEST_EMAIL,
    context: { ip: TEST_IP, ipHash: hashIp(TEST_IP), deviceId: TEST_DEVICE },
  });
  check("access allowed before ban", before.allowed, true);

  console.log("\n═══ Session revocation ═══");
  const stateBefore = await getUserSecurityState(user.id);
  const validBefore = await validateSession(user.id, stateBefore!.sessionVersion);
  check("current session version validates", validBefore.valid, true);

  const newVersion = await revokeUserSessions(user.id);
  const staleToken = await validateSession(user.id, stateBefore!.sessionVersion);
  check("version incremented", newVersion, stateBefore!.sessionVersion + 1);
  check("stale token now rejected", staleToken.valid, false);
  check("rejection reason is revocation", staleToken.reason, "SESSION_REVOKED");

  const freshToken = await validateSession(user.id, newVersion);
  check("freshly issued token accepted", freshToken.valid, true);

  console.log("\n═══ Ban the account (service layer) ═══");
  const { banUser } = await import("../src/lib/security/moderation");
  const result = await banUser(
    {
      userId: user.id,
      type: "BAN",
      reason: "Automated security verification run",
      blacklistEmail: true,
      blacklistPhone: true,
      blacklistDevices: true,
      blacklistLastIp: false,
    },
    { adminId: user.id }
  );
  check("email/phone/device blacklisted", result.identifiersBlacklisted >= 3, true);
  check("sessions revoked with the ban", result.sessionsRevoked, true);

  const banned = await prisma.user.findUnique({
    where: { id: user.id },
    select: { bannedAt: true, suspended: true, sessionVersion: true },
  });
  check("bannedAt stamped", banned!.bannedAt !== null, true);
  check("suspended flag set", banned!.suspended, true);
  check("ban bumped session version", banned!.sessionVersion, newVersion + 1);

  console.log("\n═══ Re-registration is now blocked ═══");
  const exact = await evaluateAccess({ surface: "SIGNUP", email: TEST_EMAIL, context: {} });
  check("exact email denied", exact.allowed, false);
  check("denial rule is email blacklist", exact.rule, "EMAIL_BLACKLISTED");

  // The evasion attempt this whole layer exists to stop.
  const [local, domain] = TEST_EMAIL.split("@");
  const tagged = `${local}+brandnew@${domain}`;
  const evasion = await evaluateAccess({ surface: "SIGNUP", email: tagged, context: {} });
  check("plus-tagged variant denied", evasion.allowed, false);

  const uppercased = await evaluateAccess({
    surface: "SIGNUP",
    email: TEST_EMAIL.toUpperCase(),
    context: {},
  });
  check("uppercased variant denied", uppercased.allowed, false);

  const byPhone = await evaluateAccess({
    surface: "SIGNUP",
    email: `different-${STAMP}@example.invalid`,
    phone: "+1 555 010 9999",
    context: {},
  });
  check("reformatted phone denied", byPhone.allowed, false);
  check("denial rule is phone blacklist", byPhone.rule, "PHONE_BLACKLISTED");

  const byDevice = await evaluateAccess({
    surface: "SIGNUP",
    email: `another-${STAMP}@example.invalid`,
    context: { deviceId: TEST_DEVICE },
  });
  check("blacklisted device denied", byDevice.allowed, false);

  const unrelated = await evaluateAccess({
    surface: "SIGNUP",
    email: `unrelated-${STAMP}@example.invalid`,
    context: { ip: "192.0.2.50" },
  });
  check("unrelated identity still allowed", unrelated.allowed, true);

  console.log("\n═══ IP and CIDR enforcement ═══");
  const singleIp = await prisma.bannedIp.create({
    data: {
      ip: TEST_IP,
      ipHash: hashIp(TEST_IP)!,
      reason: "verification",
      createdBy: user.id,
    },
    select: { id: true },
  });
  createdIpIds.push(singleIp.id);

  const rangeIp = await prisma.bannedIp.create({
    data: {
      ip: TEST_RANGE,
      ipHash: hashIp("198.51.100.0")!,
      isRange: true,
      prefixLength: 24,
      reason: "verification",
      createdBy: user.id,
    },
    select: { id: true },
  });
  createdIpIds.push(rangeIp.id);

  const { invalidateEnforcementCaches } = await import("../src/lib/security/enforcement");
  await invalidateEnforcementCaches();

  const ipBlocked = await evaluateAccess({
    surface: "LOGIN",
    email: `ip-test-${STAMP}@example.invalid`,
    context: { ip: TEST_IP, ipHash: hashIp(TEST_IP) },
  });
  check("blacklisted IP denied", ipBlocked.allowed, false);
  check("denial rule is IP blacklist", ipBlocked.rule, "IP_BLACKLISTED");

  const inRange = await evaluateAccess({
    surface: "LOGIN",
    email: `range-test-${STAMP}@example.invalid`,
    context: { ip: "198.51.100.42", ipHash: hashIp("198.51.100.42") },
  });
  check("address inside CIDR denied", inRange.allowed, false);
  check("denial rule is range blacklist", inRange.rule, "IP_RANGE_BLACKLISTED");

  const outOfRange = await evaluateAccess({
    surface: "LOGIN",
    email: `out-test-${STAMP}@example.invalid`,
    context: { ip: "198.51.101.42", ipHash: hashIp("198.51.101.42") },
  });
  check("address outside CIDR allowed", outOfRange.allowed, true);

  console.log("\n═══ Allowlist overrides blacklist ═══");
  await prisma.securityAllowlist.create({
    data: {
      kind: "EMAIL",
      valueHash: hashEmail(TEST_EMAIL),
      valueHint: "verification",
      reason: "verification run",
      createdBy: user.id,
    },
  });
  await invalidateEnforcementCaches();

  const allowlisted = await evaluateAccess({
    surface: "SIGNUP",
    email: TEST_EMAIL,
    context: {},
  });
  check("allowlist beats blacklist", allowlisted.allowed, true);
}

async function cleanup() {
  console.log("\n═══ Cleanup ═══");
  try {
    if (userId) {
      await prisma.securityAllowlist.deleteMany({ where: { createdBy: userId } });
      await prisma.bannedIdentifier.deleteMany({ where: { sourceUserId: userId } });
      await prisma.bannedIp.deleteMany({ where: { id: { in: createdIpIds } } });
      await prisma.securityEvent.deleteMany({ where: { userId } });
      await prisma.auditLog.deleteMany({ where: { adminId: userId } });
      await prisma.user.delete({ where: { id: userId } });
      console.log("  removed all verification rows");
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
