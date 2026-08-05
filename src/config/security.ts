/**
 * Security & moderation configuration.
 *
 * Every tunable in the security subsystem lives here or in the `RiskRuleConfig`
 * table — never inline at the call site. Values that must change without a
 * deploy belong in the DB; values that define protocol (hash algorithm, cache
 * key namespaces) belong here.
 *
 * IMPORTANT: this module is imported by client components (the Security Center
 * UI reads page sizes and reason limits from it), so it must contain constants
 * only. No secrets, no `process.env` reads. The hash pepper lives in
 * `lib/security/pepper.ts`, which is server-only.
 */

export const HASH_ALGORITHM = "sha256" as const;

/** Generic message returned for every denied auth attempt. */
export const GENERIC_AUTH_ERROR = "Invalid credentials";

/**
 * Rate limits for authentication endpoints, in attempts per window.
 * Login is limited on two axes simultaneously: per-identity (stops targeted
 * password guessing) and per-IP (stops credential stuffing across accounts).
 */
export const AUTH_RATE_LIMITS = {
  LOGIN_PER_EMAIL: { attempts: 5, windowMs: 15 * 60 * 1000 },
  LOGIN_PER_IP: { attempts: 20, windowMs: 15 * 60 * 1000 },
  SIGNUP_PER_IP: { attempts: 5, windowMs: 60 * 60 * 1000 },
  PASSWORD_RESET_PER_EMAIL: { attempts: 3, windowMs: 60 * 60 * 1000 },
} as const;

/**
 * How long a cached security decision may be stale, in milliseconds.
 *
 * This is the upper bound on ban propagation across serverless instances: an
 * instance that cached "not banned" one millisecond before the ban lands will
 * keep serving that answer for at most this long. Kept deliberately short —
 * the enforcement path also invalidates in-process on write, so this only
 * matters for *other* concurrently-warm instances.
 */
export const SECURITY_CACHE_TTL_MS = 5_000;

/** Maximum entries held per in-memory cache namespace before LRU eviction. */
export const SECURITY_CACHE_MAX_ENTRIES = 5_000;

export const CACHE_NAMESPACE = {
  USER_SECURITY: "usec",
  IP_RANGES: "iprange",
  IDENTIFIER: "ident",
} as const;

/**
 * Default risk rule weights, seeded into `RiskRuleConfig` on first run.
 * After seeding, the DB is authoritative — editing these constants will not
 * retroactively change a deployed platform's tuning.
 */
export const DEFAULT_RISK_RULES = [
  {
    rule: "FAILED_LOGIN_BURST",
    weight: 15,
    threshold: 5,
    windowSeconds: 900,
    decaySeconds: 86_400,
    description: "Repeated failed logins for the same account in a short window",
  },
  {
    rule: "RAPID_IP_CHANGE",
    weight: 20,
    threshold: 3,
    windowSeconds: 3_600,
    decaySeconds: 86_400,
    description: "Account authenticated from several distinct IPs in one hour",
  },
  {
    rule: "SHARED_DEVICE_MULTI_ACCOUNT",
    weight: 30,
    threshold: 3,
    windowSeconds: 604_800,
    decaySeconds: 2_592_000,
    description: "One device fingerprint seen across multiple accounts",
  },
  {
    rule: "VPN_OR_PROXY",
    weight: 10,
    threshold: 1,
    windowSeconds: 0,
    decaySeconds: 604_800,
    description: "Login originated from a VPN, proxy or Tor exit node",
  },
  {
    rule: "HIGH_RISK_GEO",
    weight: 15,
    threshold: 1,
    windowSeconds: 0,
    decaySeconds: 2_592_000,
    description: "Login from a jurisdiction on the high-risk country list",
  },
  {
    rule: "IMPOSSIBLE_TRAVEL",
    weight: 35,
    threshold: 1,
    windowSeconds: 21_600,
    decaySeconds: 604_800,
    description: "Consecutive logins geographically impossible in the elapsed time",
  },
  {
    rule: "NEW_DEVICE",
    weight: 5,
    threshold: 1,
    windowSeconds: 0,
    decaySeconds: 604_800,
    description: "First authentication from a previously unseen device",
  },
  {
    rule: "ABNORMAL_TRADING_VOLUME",
    weight: 25,
    threshold: 1,
    windowSeconds: 86_400,
    decaySeconds: 604_800,
    description: "Trading volume materially outside the account's own baseline",
  },
  {
    rule: "RAPID_WITHDRAWAL_AFTER_DEPOSIT",
    weight: 30,
    threshold: 1,
    windowSeconds: 3_600,
    decaySeconds: 2_592_000,
    description: "Withdrawal requested immediately after deposit clearing",
  },
  {
    rule: "SHARED_IP_MULTI_ACCOUNT",
    weight: 15,
    threshold: 5,
    windowSeconds: 604_800,
    decaySeconds: 2_592_000,
    description: "Many distinct accounts authenticating from one address",
  },
] as const;

/**
 * Score boundaries for `RiskLevel`. A score at or above `flagThreshold`
 * automatically enters the admin review queue.
 */
export const RISK_THRESHOLDS = {
  MEDIUM: 30,
  HIGH: 55,
  CRITICAL: 80,
  flagThreshold: 55,
  maxScore: 100,
} as const;

/** Pagination defaults for Security Center tables. */
export const SECURITY_PAGE_SIZE = 25;
export const SECURITY_MAX_PAGE_SIZE = 100;
export const SECURITY_EXPORT_MAX_ROWS = 10_000;

/** Minimum length for the mandatory reason attached to every moderation action. */
export const MIN_REASON_LENGTH = 10;
export const MAX_REASON_LENGTH = 1_000;
