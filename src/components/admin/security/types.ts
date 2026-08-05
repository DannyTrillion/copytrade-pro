/**
 * Wire types for the Security Center.
 *
 * These describe what `/api/admin/security` actually returns. Dates arrive as
 * ISO strings over JSON, so they are typed as `string` rather than `Date` —
 * typing them as Date would compile but break at runtime on every format call.
 */

export interface AdminRef {
  id: string;
  name: string;
  email: string;
}

export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface BannedUserRow {
  id: string;
  type: "BAN" | "SUSPENSION" | "DELETION";
  status: "ACTIVE" | "LIFTED" | "EXPIRED";
  reason: string;
  internalNote: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
  liftedAt: string | null;
  liftedBy: string | null;
  liftReason: string | null;
  userId: string;
  user: {
    email: string;
    name: string;
    role: string;
    createdAt: string;
    lastLoginIp: string | null;
    lastLoginCountry: string | null;
    deletedAt: string | null;
  };
  createdByAdmin: AdminRef | null;
  liftedByAdmin: AdminRef | null;
}

export interface BannedIpRow {
  id: string;
  ip: string;
  isRange: boolean;
  prefixLength: number | null;
  isIpv6: boolean;
  status: "ACTIVE" | "LIFTED" | "EXPIRED";
  reason: string;
  expiresAt: string | null;
  hitCount: number;
  lastHitAt: string | null;
  createdAt: string;
  createdBy: string;
}

export interface BannedIdentifierRow {
  id: string;
  kind: "EMAIL" | "PHONE" | "DEVICE" | "KYC";
  valueHint: string | null;
  status: "ACTIVE" | "LIFTED" | "EXPIRED";
  reason: string;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
  sourceUserId: string | null;
  liftedAt: string | null;
  liftReason: string | null;
}

export interface AllowlistRow {
  id: string;
  kind: "EMAIL" | "PHONE" | "DEVICE" | "KYC";
  valueHint: string | null;
  ip: string | null;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export interface DeviceRow {
  id: string;
  deviceId: string;
  trusted: boolean;
  blocked: boolean;
  label: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  lastIp: string | null;
  lastCountry: string | null;
  loginCount: number;
  userId: string;
  user: {
    email: string;
    name: string;
    bannedAt: string | null;
    suspended: boolean;
  };
  accountCount: number;
}

export interface LoginAttemptRow {
  id: string;
  email: string;
  success: boolean;
  failureReason: string | null;
  ip: string | null;
  isIpv6: boolean;
  deviceId: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  riskScore: number | null;
  createdAt: string;
  userId: string | null;
}

export interface SecurityEventRow {
  id: string;
  type: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  email: string | null;
  reason: string | null;
  metadata: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  userAgent: string | null;
  createdAt: string;
  userId: string | null;
  actorId: string | null;
  user: { name: string; email: string } | null;
}

export interface RiskSignalRow {
  id: string;
  rule: string;
  weight: number;
  detail: string | null;
  createdAt: string;
}

export interface RiskRow {
  id: string;
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  flagged: boolean;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  computedAt: string;
  userId: string;
  user: {
    email: string;
    name: string;
    createdAt: string;
    bannedAt: string | null;
    suspended: boolean;
    lastLoginCountry: string | null;
  };
  signals: RiskSignalRow[];
}

export interface OverviewStats {
  activeBans: number;
  activeSuspensions: number;
  bannedIps: number;
  blacklistedIdentifiers: number;
  flaggedAccounts: number;
  failedLogins24h: number;
  blockedLogins24h: number;
  totalDevices: number;
  sharedDevices: number;
}

export interface OverviewResponse {
  stats: OverviewStats;
  recentEvents: SecurityEventRow[];
}

export type SecurityTab =
  | "overview"
  | "banned-users"
  | "banned-ips"
  | "banned-identifiers"
  | "allowlist"
  | "devices"
  | "login-history"
  | "events"
  | "risk-queue";
