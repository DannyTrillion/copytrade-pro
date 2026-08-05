/**
 * Identifier normalisation and hashing.
 *
 * Blacklisted identifiers are stored as peppered SHA-256 digests, never as
 * plaintext. Two consequences drive the design here:
 *
 *  1. Normalisation must be exhaustive. A hash lookup is exact-match, so
 *     `John.Doe+spam@Gmail.com` and `johndoe@gmail.com` only collide if we
 *     canonicalise them first — otherwise a banned user re-registers with a
 *     plus-tag and walks straight through.
 *  2. The pepper must be server-side. Without it, a leaked table lets an
 *     attacker brute-force which emails are banned, since the input space
 *     is small and enumerable.
 */

import { createHash } from "crypto";
import { HASH_ALGORITHM } from "@/config/security";
import { SECURITY_PEPPER } from "./pepper";
import { normalizeIp } from "./ip";

/** Providers that ignore dots in the local part, so they must be stripped. */
const DOT_INSENSITIVE_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
]);

/** Canonical form for domains that are aliases of one another. */
const DOMAIN_ALIASES: Record<string, string> = {
  "googlemail.com": "gmail.com",
};

/**
 * Hash an already-normalised value. Callers should almost always use one of
 * the `hash*` helpers below rather than calling this directly, so that
 * normalisation is never accidentally skipped.
 */
export function hashValue(normalized: string): string {
  return createHash(HASH_ALGORITHM)
    .update(`${SECURITY_PEPPER}:${normalized}`)
    .digest("hex");
}

/**
 * Canonicalise an email address for blacklist comparison.
 *
 * Lowercases, strips sub-addressing (`+tag`), removes dots in the local part
 * for providers that ignore them, and resolves domain aliases. This is
 * deliberately aggressive: for moderation we want `a.b+x@gmail.com` and
 * `ab@gmail.com` to be the same identity, even though they are technically
 * distinct addresses under RFC 5321.
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return trimmed;

  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);

  domain = DOMAIN_ALIASES[domain] ?? domain;

  const plus = local.indexOf("+");
  if (plus !== -1) local = local.slice(0, plus);

  if (DOT_INSENSITIVE_DOMAINS.has(domain)) {
    local = local.replace(/\./g, "");
  }

  return `${local}@${domain}`;
}

/**
 * Reduce a phone number to digits, dropping formatting and any international
 * call prefix. Numbers are compared in this form because the same line may be
 * entered as "+1 (555) 010-1234", "001 555 010 1234" or "5550101234".
 */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");

  // "00" is the ITU international access prefix; "+" is its canonical form.
  if (digits.startsWith("00")) digits = digits.slice(2);

  return digits;
}

export function hashEmail(email: string): string {
  return hashValue(normalizeEmail(email));
}

export function hashPhone(phone: string): string {
  return hashValue(normalizePhone(phone));
}

/**
 * Hash an IP address. Returns null when the input is not a parseable address,
 * so callers never silently blacklist a hash of garbage.
 */
export function hashIp(ip: string | null | undefined): string | null {
  const normalized = normalizeIp(ip);
  return normalized ? hashValue(normalized) : null;
}

/**
 * Device fingerprints arrive from the client already hashed, but are re-hashed
 * with the server pepper so a stolen fingerprint cannot be replayed against
 * the blacklist by an attacker who has only client-side knowledge.
 */
export function hashDeviceId(deviceId: string): string {
  return hashValue(deviceId.trim().toLowerCase());
}

/** Hash a KYC document identifier (passport number, national ID, etc.). */
export function hashKycIdentifier(identifier: string): string {
  return hashValue(identifier.trim().toUpperCase().replace(/[\s-]/g, ""));
}

/**
 * Redacted display form shown in the admin UI so moderators can recognise an
 * entry without the plaintext being recoverable from the database.
 */
export function redactEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return "***";

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));

  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export function redactPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length < 4) return "***";
  return `${"*".repeat(Math.max(3, digits.length - 4))}${digits.slice(-4)}`;
}

export function redactDeviceId(deviceId: string): string {
  return deviceId.length <= 12 ? deviceId : `${deviceId.slice(0, 12)}…`;
}

export { isPepperConfigured } from "./pepper";
