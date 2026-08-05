/**
 * Security event trail.
 *
 * Distinct from `AuditLog`, which records *admin intent* ("this admin clicked
 * ban"). This records what the enforcement layer *actually did*, including
 * fully automated decisions no human triggered. Investigating an incident
 * needs both: the audit log says who ordered it, this says what happened.
 *
 * Writes here are deliberately non-blocking and failure-tolerant. A logging
 * outage must never take down authentication — a dropped log line is a far
 * better outcome than a login endpoint returning 500 for every user.
 */

import type {
  SecurityEventType,
  SecuritySeverity,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashIp } from "./hash";
import { getClientIp, getRequestGeo, normalizeIp } from "./ip";

export interface RequestContext {
  ip: string | null;
  ipHash: string | null;
  userAgent: string | null;
  deviceId: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Header carrying the client-computed device fingerprint. */
export const DEVICE_ID_HEADER = "x-device-id";

/**
 * Build the request context every security decision and log line needs.
 * Pure header parsing — no I/O — so it is cheap enough to call unconditionally.
 */
export function getRequestContext(headers: Headers): RequestContext {
  const ip = getClientIp(headers);
  const geo = getRequestGeo(headers);
  const deviceId = headers.get(DEVICE_ID_HEADER);

  return {
    ip,
    ipHash: hashIp(ip),
    userAgent: headers.get("user-agent"),
    deviceId: deviceId && deviceId.length <= 128 ? deviceId : null,
    country: geo.country,
    city: geo.city,
    region: geo.region,
    latitude: geo.latitude,
    longitude: geo.longitude,
  };
}

export interface LogSecurityEventParams {
  type: SecurityEventType;
  severity?: SecuritySeverity;
  userId?: string | null;
  /** Admin responsible, when the event was human-triggered. */
  actorId?: string | null;
  email?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  context?: Partial<RequestContext>;
}

/**
 * Record a security event.
 *
 * Returns a promise, but callers on latency-sensitive paths (login, signup)
 * should generally not await it — see `logSecurityEventAsync`.
 */
export async function logSecurityEvent(
  params: LogSecurityEventParams
): Promise<void> {
  const { context } = params;

  try {
    await prisma.securityEvent.create({
      data: {
        type: params.type,
        severity: params.severity ?? "INFO",
        userId: params.userId ?? null,
        actorId: params.actorId ?? null,
        email: params.email ? params.email.toLowerCase() : null,
        reason: params.reason ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ip: context?.ip ?? null,
        ipHash: context?.ipHash ?? null,
        deviceId: context?.deviceId ?? null,
        userAgent: context?.userAgent ?? null,
        country: context?.country ?? null,
        city: context?.city ?? null,
      },
    });
  } catch (error) {
    // Never propagate. An unwritable audit trail is a monitoring problem,
    // not a reason to fail the user's request.
    console.error("[security] Failed to write security event:", error);
  }
}

/**
 * Fire-and-forget variant for hot paths. The `.catch` is required: an
 * unhandled promise rejection in a serverless runtime can terminate the
 * invocation even though nothing is awaiting it.
 */
export function logSecurityEventAsync(params: LogSecurityEventParams): void {
  void logSecurityEvent(params).catch(() => {
    /* already logged inside logSecurityEvent */
  });
}

export interface RecordLoginAttemptParams {
  email: string;
  success: boolean;
  userId?: string | null;
  /** Internal-only detail. Never returned to the client. */
  failureReason?: string | null;
  riskScore?: number | null;
  context?: Partial<RequestContext>;
  browser?: string | null;
  os?: string | null;
  isVpn?: boolean;
  isProxy?: boolean;
  isTor?: boolean;
}

/**
 * Append to login history. This table is the primary input to the risk
 * engine, so it records both successes and failures, and records attempts
 * against non-existent accounts (userId null) since enumeration attempts are
 * themselves a signal.
 */
export async function recordLoginAttempt(
  params: RecordLoginAttemptParams
): Promise<void> {
  const { context } = params;
  const normalizedIp = normalizeIp(context?.ip);

  try {
    await prisma.loginAttempt.create({
      data: {
        email: params.email.toLowerCase(),
        success: params.success,
        userId: params.userId ?? null,
        failureReason: params.failureReason ?? null,
        riskScore: params.riskScore ?? null,
        ip: normalizedIp,
        ipHash: context?.ipHash ?? null,
        isIpv6: normalizedIp?.includes(":") ?? false,
        deviceId: context?.deviceId ?? null,
        userAgent: context?.userAgent ?? null,
        browser: params.browser ?? null,
        os: params.os ?? null,
        country: context?.country ?? null,
        city: context?.city ?? null,
        region: context?.region ?? null,
        latitude: context?.latitude ?? null,
        longitude: context?.longitude ?? null,
        isVpn: params.isVpn ?? false,
        isProxy: params.isProxy ?? false,
        isTor: params.isTor ?? false,
      },
    });
  } catch (error) {
    console.error("[security] Failed to record login attempt:", error);
  }
}

export function recordLoginAttemptAsync(params: RecordLoginAttemptParams): void {
  void recordLoginAttempt(params).catch(() => {
    /* already logged */
  });
}
