/**
 * Device tracking.
 *
 * A device id is a fingerprint hash computed on the client and sent via the
 * `x-device-id` header. Two honest limitations shape how it is used:
 *
 *  1. It is spoofable. A client controls what it sends, so a determined
 *     attacker changes it freely. It is a correlation signal, not proof of
 *     identity, and must never be the sole basis for a hard block.
 *  2. It collides. Users behind the same browser build on the same hardware
 *     can fingerprint identically, and shared/public machines legitimately
 *     serve many accounts. Treating a shared fingerprint as automatic fraud
 *     produces false positives on libraries, offices and family computers.
 *
 * Accordingly this module records and correlates; it does not decide.
 * Decisions belong to the risk engine, where the signal is weighted.
 */

import { prisma } from "@/lib/prisma";
import type { RequestContext } from "./events";
import type { ParsedUserAgent } from "./user-agent";
import { hashDeviceId } from "./hash";

export interface RecordDeviceSightingParams {
  userId: string;
  context: Pick<RequestContext, "deviceId" | "userAgent" | "ip" | "country">;
  ua: ParsedUserAgent;
}

/**
 * Upsert the device record for a successful authentication.
 * No-op when the client sent no fingerprint.
 */
export async function recordDeviceSighting({
  userId,
  context,
  ua,
}: RecordDeviceSightingParams): Promise<void> {
  if (!context.deviceId) return;

  const deviceId = hashDeviceId(context.deviceId);
  const now = new Date();

  await prisma.userDevice.upsert({
    where: { userId_deviceId: { userId, deviceId } },
    create: {
      userId,
      deviceId,
      browser: ua.browser,
      browserVersion: ua.browserVersion,
      os: ua.os,
      osVersion: ua.osVersion,
      deviceType: ua.deviceType,
      userAgent: context.userAgent?.slice(0, 512) ?? null,
      lastIp: context.ip,
      lastCountry: context.country,
      loginCount: 1,
    },
    update: {
      lastSeenAt: now,
      lastIp: context.ip,
      lastCountry: context.country,
      // Refresh UA fields — browsers update and the record should not go stale.
      browser: ua.browser,
      browserVersion: ua.browserVersion,
      os: ua.os,
      osVersion: ua.osVersion,
      userAgent: context.userAgent?.slice(0, 512) ?? null,
      loginCount: { increment: 1 },
    },
  });
}

export interface SharedDeviceAccount {
  userId: string;
  email: string;
  name: string;
  bannedAt: Date | null;
  suspended: boolean;
  lastSeenAt: Date;
}

/**
 * Every account seen on a given device fingerprint.
 *
 * This is the multi-account signal: it answers "who else uses this machine?",
 * which is how a banned user attempting re-registration is most often caught.
 */
export async function getAccountsForDevice(
  deviceIdHash: string
): Promise<SharedDeviceAccount[]> {
  const devices = await prisma.userDevice.findMany({
    where: { deviceId: deviceIdHash },
    select: {
      userId: true,
      lastSeenAt: true,
      user: {
        select: { email: true, name: true, bannedAt: true, suspended: true },
      },
    },
    orderBy: { lastSeenAt: "desc" },
  });

  return devices.map((device) => ({
    userId: device.userId,
    email: device.user.email,
    name: device.user.name,
    bannedAt: device.user.bannedAt,
    suspended: device.user.suspended,
    lastSeenAt: device.lastSeenAt,
  }));
}

/**
 * True when this fingerprint has ever been used by a banned account.
 * Used during registration to catch ban evasion via a fresh email.
 */
export async function deviceLinkedToBannedAccount(
  deviceIdHash: string
): Promise<boolean> {
  const match = await prisma.userDevice.findFirst({
    where: {
      deviceId: deviceIdHash,
      user: { bannedAt: { not: null } },
    },
    select: { id: true },
  });

  return match !== null;
}
