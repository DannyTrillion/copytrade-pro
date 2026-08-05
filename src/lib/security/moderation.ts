/**
 * Moderation service layer.
 *
 * Every write that changes a user's enforcement state goes through here. Route
 * handlers validate and authorise; this module owns the actual state machine.
 * Centralising it is what makes the guarantees below hold uniformly:
 *
 *  - **Atomicity.** Enforcement, session revocation and identifier
 *    blacklisting commit in one transaction. A partial commit could leave a
 *    banned user holding a live session, so it must not be representable.
 *  - **Mandatory reasons.** No moderation action exists without one. Enforced
 *    by the Zod schemas below, not by UI convention.
 *  - **Append-only history.** Lifting a ban marks the row LIFTED; it never
 *    deletes. "Who was banned, by whom, why, and who reversed it" must remain
 *    answerable indefinitely.
 *  - **Cache coherence.** Every path invalidates the enforcement cache, so a
 *    ban is visible to the current instance immediately.
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { MAX_REASON_LENGTH, MIN_REASON_LENGTH } from "@/config/security";
import {
  hashDeviceId,
  hashEmail,
  hashIp,
  hashPhone,
  redactEmail,
  redactPhone,
} from "./hash";
import { normalizeIp, parseCidr, parseIp } from "./ip";
import { invalidateUserSecurityState, revokeUserSessions } from "./session";
import { invalidateEnforcementCaches } from "./enforcement";
import { logSecurityEvent, type RequestContext } from "./events";

/** Reused by every action — a moderation record without a reason is useless. */
export const reasonSchema = z
  .string()
  .trim()
  .min(MIN_REASON_LENGTH, `Reason must be at least ${MIN_REASON_LENGTH} characters`)
  .max(MAX_REASON_LENGTH, `Reason must be under ${MAX_REASON_LENGTH} characters`);

export const banUserSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["BAN", "SUSPENSION"]),
  reason: reasonSchema,
  internalNote: z.string().trim().max(MAX_REASON_LENGTH).optional(),
  /** ISO timestamp. Omit for a permanent ban. */
  expiresAt: z.string().datetime().optional(),
  /** Blacklist the account's email so it cannot be reused to re-register. */
  blacklistEmail: z.boolean().default(true),
  blacklistPhone: z.boolean().default(false),
  /** Blacklist every device fingerprint seen on the account. */
  blacklistDevices: z.boolean().default(false),
  /** Blacklist the last-known login address. Off by default — see below. */
  blacklistLastIp: z.boolean().default(false),
});

export type BanUserInput = z.infer<typeof banUserSchema>;

export interface ModerationContext {
  adminId: string;
  request?: Partial<RequestContext>;
}

export interface BanResult {
  enforcementId: string;
  sessionsRevoked: boolean;
  identifiersBlacklisted: number;
  ipsBlacklisted: number;
}

/**
 * Ban or suspend a user.
 *
 * A note on `blacklistLastIp`: it defaults to false deliberately. Residential
 * addresses are dynamic and shared behind CGNAT, so blacklisting one routinely
 * locks out uninvolved people who later receive that address. It is offered
 * because it is genuinely useful against a live attack, but it is opt-in and
 * should normally carry an expiry.
 */
export async function banUser(
  input: BanUserInput,
  ctx: ModerationContext
): Promise<BanResult> {
  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      deletedAt: true,
      devices: { select: { deviceId: true } },
      lastLoginIp: true,
    },
  });

  if (!target) throw new ModerationError("User not found", 404);
  if (target.deletedAt) throw new ModerationError("Account already deleted", 409);

  // Refuse to ban the last remaining admin — a platform with no reachable
  // administrator cannot be recovered through the UI.
  if (target.role === "ADMIN") {
    const remainingAdmins = await prisma.user.count({
      where: {
        role: "ADMIN",
        id: { not: target.id },
        bannedAt: null,
        deletedAt: null,
        suspended: false,
      },
    });
    if (remainingAdmins === 0) {
      throw new ModerationError(
        "Cannot ban the last active administrator",
        409
      );
    }
  }

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw new ModerationError("Expiry must be in the future", 400);
  }

  const isFullBan = input.type === "BAN";

  const result = await prisma.$transaction(async (tx) => {
    const enforcement = await tx.bannedUser.create({
      data: {
        userId: target.id,
        type: input.type,
        reason: input.reason,
        internalNote: input.internalNote ?? null,
        expiresAt,
        createdBy: ctx.adminId,
      },
      select: { id: true },
    });

    await tx.user.update({
      where: { id: target.id },
      data: {
        // `suspended` stays the single flag the rest of the app already checks,
        // so existing guards keep working without being rewritten.
        suspended: true,
        bannedAt: isFullBan ? new Date() : null,
        // Same transaction as the ban: a committed ban always implies
        // committed revocation.
        sessionVersion: { increment: 1 },
      },
    });

    const identifiers = buildIdentifierRows({
      input,
      target,
      adminId: ctx.adminId,
      expiresAt,
    });

    let identifiersBlacklisted = 0;
    if (identifiers.length > 0) {
      // Skip duplicates rather than failing: an identifier already blacklisted
      // from a previous ban is the expected case, not an error.
      const created = await tx.bannedIdentifier.createMany({
        data: identifiers,
        skipDuplicates: true,
      });
      identifiersBlacklisted = created.count;
    }

    let ipsBlacklisted = 0;
    if (input.blacklistLastIp && target.lastLoginIp) {
      const normalized = normalizeIp(target.lastLoginIp);
      const ipHash = hashIp(target.lastLoginIp);

      if (normalized && ipHash) {
        const created = await tx.bannedIp.createMany({
          data: [
            {
              ip: normalized,
              ipHash,
              isIpv6: normalized.includes(":"),
              reason: input.reason,
              expiresAt,
              createdBy: ctx.adminId,
            },
          ],
          skipDuplicates: true,
        });
        ipsBlacklisted = created.count;
      }
    }

    return { enforcement, identifiersBlacklisted, ipsBlacklisted };
  });

  await Promise.all([
    invalidateUserSecurityState(target.id),
    invalidateEnforcementCaches(),
  ]);

  await Promise.all([
    logAudit({
      adminId: ctx.adminId,
      action: "BAN_USER",
      targetType: "USER",
      targetId: target.id,
      details: {
        type: input.type,
        reason: input.reason,
        expiresAt: expiresAt?.toISOString() ?? "permanent",
        identifiersBlacklisted: result.identifiersBlacklisted,
        ipsBlacklisted: result.ipsBlacklisted,
      },
    }),
    logSecurityEvent({
      type: "BAN_APPLIED",
      severity: isFullBan ? "CRITICAL" : "HIGH",
      userId: target.id,
      actorId: ctx.adminId,
      email: target.email,
      reason: input.reason,
      metadata: { type: input.type, expiresAt: expiresAt?.toISOString() ?? null },
      context: ctx.request,
    }),
  ]);

  return {
    enforcementId: result.enforcement.id,
    sessionsRevoked: true,
    identifiersBlacklisted: result.identifiersBlacklisted,
    ipsBlacklisted: result.ipsBlacklisted,
  };
}

function buildIdentifierRows({
  input,
  target,
  adminId,
  expiresAt,
}: {
  input: BanUserInput;
  target: { id: string; email: string; phone: string | null; devices: { deviceId: string }[] };
  adminId: string;
  expiresAt: Date | null;
}): Prisma.BannedIdentifierCreateManyInput[] {
  const rows: Prisma.BannedIdentifierCreateManyInput[] = [];
  const base = {
    reason: input.reason,
    expiresAt,
    sourceUserId: target.id,
    createdBy: adminId,
  };

  if (input.blacklistEmail) {
    rows.push({
      ...base,
      kind: "EMAIL",
      valueHash: hashEmail(target.email),
      valueHint: redactEmail(target.email),
    });
  }

  if (input.blacklistPhone && target.phone) {
    rows.push({
      ...base,
      kind: "PHONE",
      valueHash: hashPhone(target.phone),
      valueHint: redactPhone(target.phone),
    });
  }

  if (input.blacklistDevices) {
    for (const device of target.devices) {
      rows.push({
        ...base,
        kind: "DEVICE",
        // Device ids are already stored hashed, so hash the stored value
        // directly rather than re-normalising a raw fingerprint.
        valueHash: device.deviceId,
        valueHint: `${device.deviceId.slice(0, 12)}…`,
      });
    }
  }

  return rows;
}

export const liftEnforcementSchema = z.object({
  enforcementId: z.string().uuid(),
  reason: reasonSchema,
  /** Also clear identifier blacklist entries created by this ban. */
  clearIdentifiers: z.boolean().default(true),
});

export type LiftEnforcementInput = z.infer<typeof liftEnforcementSchema>;

/**
 * Reverse a ban or suspension.
 *
 * The user is only reinstated if no *other* active enforcement remains —
 * otherwise lifting one of two concurrent bans would silently restore access.
 */
export async function liftEnforcement(
  input: LiftEnforcementInput,
  ctx: ModerationContext
): Promise<{ reinstated: boolean }> {
  const enforcement = await prisma.bannedUser.findUnique({
    where: { id: input.enforcementId },
    select: {
      id: true,
      userId: true,
      status: true,
      type: true,
      user: { select: { email: true } },
    },
  });

  if (!enforcement) throw new ModerationError("Enforcement record not found", 404);
  if (enforcement.status !== "ACTIVE") {
    throw new ModerationError("Enforcement is no longer active", 409);
  }

  const reinstated = await prisma.$transaction(async (tx) => {
    await tx.bannedUser.update({
      where: { id: enforcement.id },
      data: {
        status: "LIFTED",
        liftedAt: new Date(),
        liftedBy: ctx.adminId,
        liftReason: input.reason,
      },
    });

    const stillEnforced = await tx.bannedUser.count({
      where: { userId: enforcement.userId, status: "ACTIVE" },
    });

    if (stillEnforced > 0) return false;

    await tx.user.update({
      where: { id: enforcement.userId },
      data: { suspended: false, bannedAt: null },
    });

    if (input.clearIdentifiers) {
      await tx.bannedIdentifier.updateMany({
        where: { sourceUserId: enforcement.userId, status: "ACTIVE" },
        data: {
          status: "LIFTED",
          liftedAt: new Date(),
          liftedBy: ctx.adminId,
          liftReason: input.reason,
        },
      });
    }

    return true;
  });

  await Promise.all([
    invalidateUserSecurityState(enforcement.userId),
    invalidateEnforcementCaches(),
  ]);

  await Promise.all([
    logAudit({
      adminId: ctx.adminId,
      action: "UNBAN_USER",
      targetType: "USER",
      targetId: enforcement.userId,
      details: { enforcementId: enforcement.id, reason: input.reason, reinstated },
    }),
    logSecurityEvent({
      type: "BAN_LIFTED",
      severity: "HIGH",
      userId: enforcement.userId,
      actorId: ctx.adminId,
      email: enforcement.user.email,
      reason: input.reason,
      metadata: { enforcementId: enforcement.id, reinstated },
      context: ctx.request,
    }),
  ]);

  return { reinstated };
}

export const deleteUserSchema = z.object({
  userId: z.string().uuid(),
  reason: reasonSchema,
  /** Keep the identity blacklisted so the person cannot simply re-register. */
  blacklistIdentifiers: z.boolean().default(true),
});

export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

/**
 * Soft-delete and anonymise an account.
 *
 * Deliberately NOT a hard delete. The user row is referenced by balances,
 * trades, deposits, withdrawals, commissions and audit logs — records that are
 * financial evidence and in most jurisdictions must be retained. A hard delete
 * would either cascade those away or fail on foreign keys.
 *
 * What this does instead: strips PII from the row, revokes access permanently,
 * and keeps a hashed tombstone in `BannedIdentifier` so the identity stays
 * blocked at registration. The user-visible outcome is identical; the
 * accounting and audit trail survive.
 */
export async function deleteUserAccount(
  input: DeleteUserInput,
  ctx: ModerationContext
): Promise<void> {
  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      deletedAt: true,
      devices: { select: { deviceId: true } },
    },
  });

  if (!target) throw new ModerationError("User not found", 404);
  if (target.deletedAt) throw new ModerationError("Account already deleted", 409);
  if (target.id === ctx.adminId) {
    throw new ModerationError("You cannot delete your own account", 409);
  }

  if (target.role === "ADMIN") {
    const remainingAdmins = await prisma.user.count({
      where: { role: "ADMIN", id: { not: target.id }, deletedAt: null, bannedAt: null },
    });
    if (remainingAdmins === 0) {
      throw new ModerationError("Cannot delete the last administrator", 409);
    }
  }

  const now = new Date();
  const tombstones: Prisma.BannedIdentifierCreateManyInput[] = [];

  if (input.blacklistIdentifiers) {
    tombstones.push({
      kind: "EMAIL",
      valueHash: hashEmail(target.email),
      valueHint: redactEmail(target.email),
      reason: input.reason,
      sourceUserId: target.id,
      createdBy: ctx.adminId,
    });

    if (target.phone) {
      tombstones.push({
        kind: "PHONE",
        valueHash: hashPhone(target.phone),
        valueHint: redactPhone(target.phone),
        reason: input.reason,
        sourceUserId: target.id,
        createdBy: ctx.adminId,
      });
    }

    for (const device of target.devices) {
      tombstones.push({
        kind: "DEVICE",
        valueHash: device.deviceId,
        valueHint: `${device.deviceId.slice(0, 12)}…`,
        reason: input.reason,
        sourceUserId: target.id,
        createdBy: ctx.adminId,
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    // Write tombstones before anonymising — afterwards the plaintext
    // identifiers are gone and the hashes can no longer be derived.
    if (tombstones.length > 0) {
      await tx.bannedIdentifier.createMany({
        data: tombstones,
        skipDuplicates: true,
      });
    }

    await tx.bannedUser.create({
      data: {
        userId: target.id,
        type: "DELETION",
        reason: input.reason,
        createdBy: ctx.adminId,
      },
    });

    await tx.user.update({
      where: { id: target.id },
      data: {
        deletedAt: now,
        bannedAt: now,
        suspended: true,
        sessionVersion: { increment: 1 },
        // Anonymise PII. The email must stay unique, so it is replaced with a
        // non-routable placeholder derived from the id rather than nulled.
        email: `deleted-${target.id}@deleted.invalid`,
        name: "Deleted account",
        phone: null,
        avatar: null,
        passwordHash: "",
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorEnabled: false,
        emailVerificationToken: null,
        lastLoginIp: null,
      },
    });
  });

  await Promise.all([
    invalidateUserSecurityState(target.id),
    invalidateEnforcementCaches(),
  ]);

  await Promise.all([
    logAudit({
      adminId: ctx.adminId,
      action: "DELETE_USER_ACCOUNT",
      targetType: "USER",
      targetId: target.id,
      details: {
        reason: input.reason,
        tombstones: tombstones.length,
        note: "Soft delete — financial records retained",
      },
    }),
    logSecurityEvent({
      type: "BAN_APPLIED",
      severity: "CRITICAL",
      userId: target.id,
      actorId: ctx.adminId,
      reason: `Account deleted: ${input.reason}`,
      metadata: { tombstones: tombstones.length },
      context: ctx.request,
    }),
  ]);
}

export const revokeSessionsSchema = z.object({
  userId: z.string().uuid(),
  reason: reasonSchema,
});

/** Force-logout without changing the account's enforcement state. */
export async function revokeSessions(
  input: z.infer<typeof revokeSessionsSchema>,
  ctx: ModerationContext
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true },
  });

  if (!user) throw new ModerationError("User not found", 404);

  await revokeUserSessions(user.id);

  await Promise.all([
    logAudit({
      adminId: ctx.adminId,
      action: "REVOKE_SESSIONS",
      targetType: "USER",
      targetId: user.id,
      details: { reason: input.reason },
    }),
    logSecurityEvent({
      type: "SESSION_REVOKED",
      severity: "MEDIUM",
      userId: user.id,
      actorId: ctx.adminId,
      email: user.email,
      reason: input.reason,
      context: ctx.request,
    }),
  ]);
}

export const banIpSchema = z.object({
  /** Single address or CIDR block, IPv4 or IPv6. */
  ip: z.string().trim().min(1),
  reason: reasonSchema,
  expiresAt: z.string().datetime().optional(),
});

export async function banIp(
  input: z.infer<typeof banIpSchema>,
  ctx: ModerationContext
): Promise<{ id: string; normalized: string; isRange: boolean }> {
  const isRange = input.ip.includes("/");
  const parsed = isRange ? parseCidr(input.ip) : parseIp(input.ip);

  if (!parsed) {
    throw new ModerationError("Not a valid IPv4/IPv6 address or CIDR block", 400);
  }

  const normalized = parsed.normalized;
  const ipHash = hashIp(isRange ? normalized.split("/")[0] : normalized);

  if (!ipHash) throw new ModerationError("Could not hash address", 400);

  // Refuse to ban the acting admin's own address — an easy way to lock the
  // whole team out of the Security Center.
  if (ctx.request?.ip && !isRange && normalizeIp(ctx.request.ip) === normalized) {
    throw new ModerationError("Refusing to ban your own current address", 409);
  }

  const existing = await prisma.bannedIp.findUnique({ where: { ipHash } });
  if (existing && existing.status === "ACTIVE") {
    throw new ModerationError("Address is already blacklisted", 409);
  }

  const record = await prisma.bannedIp.upsert({
    where: { ipHash },
    create: {
      ip: normalized,
      ipHash,
      isRange,
      prefixLength: isRange ? (parsed as { prefixLength: number }).prefixLength : null,
      isIpv6: parsed.family === "ipv6",
      reason: input.reason,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      createdBy: ctx.adminId,
    },
    update: {
      status: "ACTIVE",
      reason: input.reason,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      createdBy: ctx.adminId,
      liftedAt: null,
      liftedBy: null,
      liftReason: null,
    },
    select: { id: true },
  });

  await invalidateEnforcementCaches();

  await Promise.all([
    logAudit({
      adminId: ctx.adminId,
      action: "BAN_IP",
      targetType: "IP",
      targetId: record.id,
      details: { ip: normalized, isRange, reason: input.reason },
    }),
    logSecurityEvent({
      type: "IP_BLOCKED",
      severity: "HIGH",
      actorId: ctx.adminId,
      reason: input.reason,
      metadata: { ip: normalized, isRange },
      context: ctx.request,
    }),
  ]);

  return { id: record.id, normalized, isRange };
}

export const liftIpBanSchema = z.object({
  id: z.string().uuid(),
  reason: reasonSchema,
});

export async function liftIpBan(
  input: z.infer<typeof liftIpBanSchema>,
  ctx: ModerationContext
): Promise<void> {
  const record = await prisma.bannedIp.findUnique({
    where: { id: input.id },
    select: { id: true, ip: true, status: true },
  });

  if (!record) throw new ModerationError("IP ban not found", 404);
  if (record.status !== "ACTIVE") {
    throw new ModerationError("IP ban is no longer active", 409);
  }

  await prisma.bannedIp.update({
    where: { id: record.id },
    data: {
      status: "LIFTED",
      liftedAt: new Date(),
      liftedBy: ctx.adminId,
      liftReason: input.reason,
    },
  });

  await invalidateEnforcementCaches();

  await logAudit({
    adminId: ctx.adminId,
    action: "UNBAN_IP",
    targetType: "IP",
    targetId: record.id,
    details: { ip: record.ip, reason: input.reason },
  });
}

export const liftIdentifierSchema = z.object({
  id: z.string().uuid(),
  reason: reasonSchema,
});

export async function liftIdentifierBan(
  input: z.infer<typeof liftIdentifierSchema>,
  ctx: ModerationContext
): Promise<void> {
  const record = await prisma.bannedIdentifier.findUnique({
    where: { id: input.id },
    select: { id: true, kind: true, valueHint: true, status: true },
  });

  if (!record) throw new ModerationError("Identifier ban not found", 404);
  if (record.status !== "ACTIVE") {
    throw new ModerationError("Identifier ban is no longer active", 409);
  }

  await prisma.bannedIdentifier.update({
    where: { id: record.id },
    data: {
      status: "LIFTED",
      liftedAt: new Date(),
      liftedBy: ctx.adminId,
      liftReason: input.reason,
    },
  });

  await invalidateEnforcementCaches();

  await logAudit({
    adminId: ctx.adminId,
    action: "UNBAN_IDENTIFIER",
    targetType: "IDENTIFIER",
    targetId: record.id,
    details: { kind: record.kind, hint: record.valueHint, reason: input.reason },
  });
}

export const allowlistSchema = z.object({
  kind: z.enum(["EMAIL", "PHONE", "DEVICE", "KYC"]),
  value: z.string().trim().min(1),
  reason: reasonSchema,
});

/**
 * Add a trusted identifier or address.
 *
 * The allowlist is evaluated *before* every blacklist, so this is the escape
 * hatch that stops ops staff and known-good infrastructure from being locked
 * out by an over-broad rule.
 */
export async function addToAllowlist(
  input: z.infer<typeof allowlistSchema>,
  ctx: ModerationContext
): Promise<{ id: string }> {
  let valueHash: string;
  let valueHint: string;
  let ipHash: string | null = null;
  let ip: string | null = null;

  switch (input.kind) {
    case "EMAIL":
      valueHash = hashEmail(input.value);
      valueHint = redactEmail(input.value);
      break;
    case "PHONE":
      valueHash = hashPhone(input.value);
      valueHint = redactPhone(input.value);
      break;
    case "DEVICE":
      valueHash = hashDeviceId(input.value);
      valueHint = `${input.value.slice(0, 12)}…`;
      break;
    default: {
      // KYC entries may carry an address instead of a document identifier.
      const parsed = parseIp(input.value);
      if (parsed) {
        ip = parsed.normalized;
        ipHash = hashIp(parsed.normalized);
        valueHash = ipHash!;
        valueHint = parsed.normalized;
      } else {
        valueHash = hashDeviceId(input.value);
        valueHint = input.value.slice(0, 24);
      }
    }
  }

  const record = await prisma.securityAllowlist.upsert({
    where: { kind_valueHash: { kind: input.kind, valueHash } },
    create: {
      kind: input.kind,
      valueHash,
      valueHint,
      ip,
      ipHash,
      reason: input.reason,
      createdBy: ctx.adminId,
    },
    update: { reason: input.reason, createdBy: ctx.adminId },
    select: { id: true },
  });

  await invalidateEnforcementCaches();

  await logAudit({
    adminId: ctx.adminId,
    action: "ALLOWLIST_ADD",
    targetType: "ALLOWLIST",
    targetId: record.id,
    details: { kind: input.kind, hint: valueHint, reason: input.reason },
  });

  return { id: record.id };
}

export async function removeFromAllowlist(
  id: string,
  reason: string,
  ctx: ModerationContext
): Promise<void> {
  const record = await prisma.securityAllowlist.findUnique({
    where: { id },
    select: { id: true, kind: true, valueHint: true },
  });

  if (!record) throw new ModerationError("Allowlist entry not found", 404);

  await prisma.securityAllowlist.delete({ where: { id } });

  await invalidateEnforcementCaches();

  await logAudit({
    adminId: ctx.adminId,
    action: "ALLOWLIST_REMOVE",
    targetType: "ALLOWLIST",
    targetId: id,
    details: { kind: record.kind, hint: record.valueHint, reason },
  });
}

export const deviceActionSchema = z.object({
  deviceRecordId: z.string().uuid(),
  // Named `operation`, not `action` — the API dispatcher routes on `action`,
  // so reusing that key here would make the payload ambiguous.
  operation: z.enum(["TRUST", "UNTRUST", "BLOCK", "UNBLOCK"]),
  reason: reasonSchema,
});

export async function updateDeviceTrust(
  input: z.infer<typeof deviceActionSchema>,
  ctx: ModerationContext
): Promise<void> {
  const device = await prisma.userDevice.findUnique({
    where: { id: input.deviceRecordId },
    select: { id: true, userId: true, deviceId: true },
  });

  if (!device) throw new ModerationError("Device not found", 404);

  const data =
    input.operation === "TRUST"
      ? { trusted: true, blocked: false }
      : input.operation === "UNTRUST"
        ? { trusted: false }
        : input.operation === "BLOCK"
          ? { blocked: true, trusted: false }
          : { blocked: false };

  await prisma.userDevice.update({ where: { id: device.id }, data });

  const isBlock = input.operation === "BLOCK";

  await Promise.all([
    logAudit({
      adminId: ctx.adminId,
      action: isBlock ? "BLOCK_DEVICE" : "TRUST_DEVICE",
      targetType: "DEVICE",
      targetId: device.id,
      details: {
        operation: input.operation,
        userId: device.userId,
        reason: input.reason,
      },
    }),
    logSecurityEvent({
      type: isBlock ? "DEVICE_BLOCKED" : "DEVICE_TRUSTED",
      severity: isBlock ? "HIGH" : "INFO",
      userId: device.userId,
      actorId: ctx.adminId,
      reason: input.reason,
      metadata: { operation: input.operation },
      context: ctx.request,
    }),
  ]);
}

export const reviewRiskSchema = z.object({
  userId: z.string().uuid(),
  /** CLEAR dismisses the flag; ESCALATE keeps it visible for a second opinion. */
  outcome: z.enum(["CLEAR", "ESCALATE"]),
  reason: reasonSchema,
});

/**
 * Record a human decision on a flagged account.
 *
 * Marking an account reviewed does not change its score — the score reflects
 * behaviour and is recomputed independently. It records that a person looked,
 * which is what removes it from the queue. Should the account later cross the
 * threshold again from a *below*-threshold state, the engine reopens it.
 */
export async function reviewRiskScore(
  input: z.infer<typeof reviewRiskSchema>,
  ctx: ModerationContext
): Promise<void> {
  const existing = await prisma.riskScore.findUnique({
    where: { userId: input.userId },
    select: { id: true, score: true, level: true },
  });

  if (!existing) throw new ModerationError("No risk score for this user", 404);

  await prisma.riskScore.update({
    where: { userId: input.userId },
    data: {
      reviewedAt: new Date(),
      reviewedBy: ctx.adminId,
      reviewNote: input.reason,
      // Clearing removes it from the queue; escalating keeps it flagged.
      flagged: input.outcome === "ESCALATE",
    },
  });

  await Promise.all([
    logAudit({
      adminId: ctx.adminId,
      action: "REVIEW_RISK_SCORE",
      targetType: "USER",
      targetId: input.userId,
      details: {
        outcome: input.outcome,
        score: existing.score,
        level: existing.level,
        reason: input.reason,
      },
    }),
    logSecurityEvent({
      type: "ADMIN_ACTION",
      severity: input.outcome === "ESCALATE" ? "HIGH" : "INFO",
      userId: input.userId,
      actorId: ctx.adminId,
      reason: `Risk review: ${input.outcome} — ${input.reason}`,
      metadata: { score: existing.score, outcome: input.outcome },
      context: ctx.request,
    }),
  ]);
}

/** Carries an HTTP status so route handlers can map failures without guessing. */
export class ModerationError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "ModerationError";
  }
}
