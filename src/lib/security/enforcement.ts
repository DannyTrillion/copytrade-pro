/**
 * The access gate.
 *
 * Single entry point every authentication surface calls before granting or
 * creating access: registration, login, password reset, and any privileged
 * action worth gating. Centralising it is what makes the layers consistent —
 * a rule added here applies everywhere at once, and no surface can drift.
 *
 * Layer order is deliberate:
 *
 *   1. **Allowlist** — always first. Staff and known-good infrastructure must
 *      be able to override every rule below, or an over-broad blacklist locks
 *      out the people who need to fix it.
 *   2. **Network** — IP exact match, then CIDR ranges.
 *   3. **Identity** — email, phone, KYC document hashes.
 *   4. **Device** — fingerprint blacklist, then fingerprints linked to an
 *      already-banned account.
 *
 * Every denial returns the same opaque result to the caller's user. The
 * specific rule that fired goes to the security log only — telling an attacker
 * which layer caught them tells them exactly what to change.
 */

import { prisma } from "@/lib/prisma";
import { CACHE_NAMESPACE, SECURITY_CACHE_TTL_MS } from "@/config/security";
import { cached, securityCache } from "./cache";
import { hashDeviceId, hashEmail, hashIp, hashPhone } from "./hash";
import { ipInCidr, parseCidr, parseIp } from "./ip";
import {
  logSecurityEventAsync,
  type RequestContext,
} from "./events";

/** Which surface is asking. Only affects logging and severity. */
export type AccessSurface = "SIGNUP" | "LOGIN" | "PASSWORD_RESET" | "ACTION";

/** Internal rule identifier. Never returned to the client. */
export type DenialRule =
  | "IP_BLACKLISTED"
  | "IP_RANGE_BLACKLISTED"
  | "EMAIL_BLACKLISTED"
  | "PHONE_BLACKLISTED"
  | "DEVICE_BLACKLISTED"
  | "DEVICE_LINKED_TO_BANNED_ACCOUNT"
  | "KYC_BLACKLISTED";

export interface AccessDecision {
  allowed: boolean;
  /** Internal only — log it, never send it. */
  rule?: DenialRule;
  /** Internal detail for the security log. */
  detail?: string;
}

export interface EvaluateAccessParams {
  surface: AccessSurface;
  email?: string | null;
  phone?: string | null;
  kycIdentifier?: string | null;
  context: Partial<RequestContext>;
  /** Skip device correlation — used by login, which checks it separately. */
  skipDeviceLinkage?: boolean;
}

/** Rows whose expiry has passed are not enforced, even if still marked ACTIVE. */
function activeAndUnexpired() {
  const now = new Date();
  return {
    status: "ACTIVE" as const,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

/**
 * Blacklisted CIDR ranges, cached.
 *
 * Ranges cannot be matched by hash equality, so they are evaluated in-process.
 * The set is admin-curated and small, which is what makes loading it wholesale
 * acceptable — if it ever grows past a few hundred entries this should move to
 * a Postgres `inet`/`cidr` column with a GiST index and an indexed containment
 * query instead.
 */
async function getBlacklistedRanges() {
  return cached(
    CACHE_NAMESPACE.IP_RANGES,
    "all",
    SECURITY_CACHE_TTL_MS * 12, // ranges change rarely; cache them longer
    async () => {
      const rows = await prisma.bannedIp.findMany({
        where: { ...activeAndUnexpired(), isRange: true },
        select: { id: true, ip: true },
      });

      return rows
        .map((row) => ({ id: row.id, cidr: parseCidr(row.ip) }))
        .filter((row): row is { id: string; cidr: NonNullable<ReturnType<typeof parseCidr>> } =>
          row.cidr !== null
        );
    }
  );
}

/** True when this value is explicitly trusted and must bypass all blacklists. */
async function isAllowlisted(
  kind: "EMAIL" | "PHONE" | "DEVICE" | "KYC",
  valueHash: string
): Promise<boolean> {
  return cached(
    CACHE_NAMESPACE.IDENTIFIER,
    `allow:${kind}:${valueHash}`,
    SECURITY_CACHE_TTL_MS * 12,
    async () => {
      const hit = await prisma.securityAllowlist.findUnique({
        where: { kind_valueHash: { kind, valueHash } },
        select: { id: true },
      });
      return hit !== null;
    }
  );
}

async function isIpAllowlisted(ipHash: string): Promise<boolean> {
  return cached(
    CACHE_NAMESPACE.IDENTIFIER,
    `allow:ip:${ipHash}`,
    SECURITY_CACHE_TTL_MS * 12,
    async () => {
      const hit = await prisma.securityAllowlist.findFirst({
        where: { ipHash },
        select: { id: true },
      });
      return hit !== null;
    }
  );
}

/**
 * Evaluate every security layer for a request.
 *
 * Fails **open** on infrastructure errors: if the database is unreachable this
 * returns `allowed: true` rather than locking every user out of the platform.
 * That is a deliberate availability trade-off — the alternative turns a brief
 * DB blip into a total outage. Account-state checks (banned/suspended) are
 * enforced separately in the auth path and are not subject to this.
 */
export async function evaluateAccess(
  params: EvaluateAccessParams
): Promise<AccessDecision> {
  try {
    return await runLayers(params);
  } catch (error) {
    console.error("[security] Access evaluation failed, failing open:", error);
    return { allowed: true };
  }
}

async function runLayers(params: EvaluateAccessParams): Promise<AccessDecision> {
  const { context } = params;

  /**
   * ─── Layer 0: administrator override ───
   *
   * Administrators are never subject to the automated layers below. An admin
   * locked out by their own IP range or a shared-office device rule cannot log
   * in to remove that rule, which turns a tuning mistake into an unrecoverable
   * platform lockout.
   *
   * This grants no authority by itself — the account still has to pass
   * password and 2FA verification in `authorize`, and a banned or suspended
   * admin is still rejected there. It only exempts them from network, identity
   * and device blacklists.
   */
  if (params.email && (await isAdministrator(params.email))) {
    return { allowed: true };
  }

  // ─── Layer 1: network ───
  const ipHash = context.ipHash ?? hashIp(context.ip);

  if (ipHash) {
    if (await isIpAllowlisted(ipHash)) {
      return { allowed: true };
    }

    const exact = await prisma.bannedIp.findFirst({
      where: { ...activeAndUnexpired(), ipHash },
      select: { id: true, ip: true },
    });

    if (exact) {
      recordIpHit(exact.id);
      return {
        allowed: false,
        rule: "IP_BLACKLISTED",
        detail: `Address ${exact.ip} is blacklisted`,
      };
    }

    const parsed = parseIp(context.ip);
    if (parsed) {
      const ranges = await getBlacklistedRanges();
      for (const range of ranges) {
        if (ipInCidr(parsed, range.cidr)) {
          recordIpHit(range.id);
          return {
            allowed: false,
            rule: "IP_RANGE_BLACKLISTED",
            detail: `Address falls inside blacklisted range ${range.cidr.normalized}`,
          };
        }
      }
    }
  }

  // ─── Layer 2: identity ───
  if (params.email) {
    const emailHash = hashEmail(params.email);

    if (!(await isAllowlisted("EMAIL", emailHash))) {
      if (await isIdentifierBlacklisted("EMAIL", emailHash)) {
        return {
          allowed: false,
          rule: "EMAIL_BLACKLISTED",
          detail: "Email address is blacklisted",
        };
      }
    } else {
      // An allowlisted email overrides everything below it.
      return { allowed: true };
    }
  }

  if (params.phone) {
    const phoneHash = hashPhone(params.phone);
    if (
      !(await isAllowlisted("PHONE", phoneHash)) &&
      (await isIdentifierBlacklisted("PHONE", phoneHash))
    ) {
      return {
        allowed: false,
        rule: "PHONE_BLACKLISTED",
        detail: "Phone number is blacklisted",
      };
    }
  }

  if (params.kycIdentifier) {
    const kycHash = hashDeviceId(params.kycIdentifier);
    if (await isIdentifierBlacklisted("KYC", kycHash)) {
      return {
        allowed: false,
        rule: "KYC_BLACKLISTED",
        detail: "KYC identifier is blacklisted",
      };
    }
  }

  // ─── Layer 3: device ───
  if (context.deviceId) {
    const deviceHash = hashDeviceId(context.deviceId);

    if (await isAllowlisted("DEVICE", deviceHash)) {
      return { allowed: true };
    }

    if (await isIdentifierBlacklisted("DEVICE", deviceHash)) {
      return {
        allowed: false,
        rule: "DEVICE_BLACKLISTED",
        detail: "Device fingerprint is blacklisted",
      };
    }

    const blocked = await prisma.userDevice.findFirst({
      where: { deviceId: deviceHash, blocked: true },
      select: { id: true },
    });

    if (blocked) {
      return {
        allowed: false,
        rule: "DEVICE_BLACKLISTED",
        detail: "Device is blocked",
      };
    }

    /**
     * Ban evasion: this fingerprint has been used by an account that is now
     * banned. Only applied to registration — on login it would lock out
     * legitimate users who share a household or public machine with someone
     * banned, which is a false positive we are not willing to pay for.
     */
    if (params.surface === "SIGNUP" && !params.skipDeviceLinkage) {
      const linked = await prisma.userDevice.findFirst({
        where: { deviceId: deviceHash, user: { bannedAt: { not: null } } },
        select: { id: true },
      });

      if (linked) {
        return {
          allowed: false,
          rule: "DEVICE_LINKED_TO_BANNED_ACCOUNT",
          detail: "Device previously used by a banned account",
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * True when this email belongs to a live administrator account.
 *
 * Deliberately excludes banned/deleted admins: a demoted or compromised admin
 * account must lose the exemption along with everything else.
 */
async function isAdministrator(email: string): Promise<boolean> {
  return cached(
    CACHE_NAMESPACE.IDENTIFIER,
    `admin:${email.trim().toLowerCase()}`,
    SECURITY_CACHE_TTL_MS,
    async () => {
      const admin = await prisma.user.findFirst({
        where: {
          email: email.trim().toLowerCase(),
          role: "ADMIN",
          bannedAt: null,
          deletedAt: null,
        },
        select: { id: true },
      });
      return admin !== null;
    }
  );
}

async function isIdentifierBlacklisted(
  kind: "EMAIL" | "PHONE" | "DEVICE" | "KYC",
  valueHash: string
): Promise<boolean> {
  return cached(
    CACHE_NAMESPACE.IDENTIFIER,
    `deny:${kind}:${valueHash}`,
    SECURITY_CACHE_TTL_MS,
    async () => {
      const hit = await prisma.bannedIdentifier.findFirst({
        where: { ...activeAndUnexpired(), kind, valueHash },
        select: { id: true },
      });
      return hit !== null;
    }
  );
}

/**
 * Bump the hit counter on a blacklist rule. Fire-and-forget — telemetry must
 * never delay or fail an enforcement decision that has already been made.
 */
function recordIpHit(id: string): void {
  void prisma.bannedIp
    .update({
      where: { id },
      data: { hitCount: { increment: 1 }, lastHitAt: new Date() },
    })
    .catch(() => {
      /* telemetry only */
    });
}

/**
 * Evaluate access and log the outcome in one call.
 * Returns a plain boolean, so a caller cannot accidentally leak the rule.
 */
export async function enforceAccess(
  params: EvaluateAccessParams
): Promise<boolean> {
  const decision = await evaluateAccess(params);

  if (!decision.allowed) {
    logSecurityEventAsync({
      type:
        params.surface === "SIGNUP"
          ? "SIGNUP_BLOCKED"
          : params.surface === "PASSWORD_RESET"
            ? "PASSWORD_RESET_BLOCKED"
            : "LOGIN_BLOCKED",
      severity: "HIGH",
      email: params.email ?? null,
      reason: decision.detail ?? decision.rule ?? "Access denied",
      metadata: { rule: decision.rule, surface: params.surface },
      context: params.context,
    });
  }

  return decision.allowed;
}

/**
 * Drop cached enforcement decisions. Called after any blacklist write so a new
 * rule takes effect on this instance immediately rather than after the TTL.
 */
export async function invalidateEnforcementCaches(): Promise<void> {
  await Promise.all([
    securityCache.clearNamespace(CACHE_NAMESPACE.IDENTIFIER),
    securityCache.clearNamespace(CACHE_NAMESPACE.IP_RANGES),
  ]);
}
