/**
 * PayMeGate webhook signature verification.
 *
 * Deliveries are signed with a merchant secret returned once by
 * `PUT /v1/webhook`. The signed message is the timestamp, a period, and the
 * **raw** request body — so the body must be verified before it is parsed;
 * re-serialising JSON changes the bytes and invalidates the signature.
 *
 * Headers (per the merchant dashboard's own spec):
 *   X-Paymegate-Signature  raw unpadded Base64URL HMAC-SHA256, no prefix
 *   X-Paymegate-Timestamp  unix seconds; reject deliveries older than 5 min
 *   X-Paymegate-Event      event name, e.g. "order.paid"
 *   X-Paymegate-Event-Id   delivery id; process each one only once
 *
 * This is one of two independent controls. Even a perfectly signed delivery is
 * only treated as a hint: `settleOrder` still re-reads the order from the
 * gateway before any balance moves. Signature verification rejects forgeries
 * cheaply; the re-read is what makes a forgery pointless.
 */

import { createHmac, timingSafeEqual } from "crypto";

export const SIGNATURE_HEADER = "x-paymegate-signature";
export const TIMESTAMP_HEADER = "x-paymegate-timestamp";
export const EVENT_HEADER = "x-paymegate-event";
export const EVENT_ID_HEADER = "x-paymegate-event-id";

/**
 * Deliveries older than this are rejected, so a captured request cannot be
 * replayed indefinitely. Generous enough to absorb clock skew and gateway
 * retry backoff.
 */
const MAX_AGE_SECONDS = 5 * 60;

export type SignatureResult =
  | { valid: true }
  | { valid: false; reason: string };

function secret(): string | null {
  return process.env.PAYMEGATE_WEBHOOK_SECRET || null;
}

export function isSignatureConfigured(): boolean {
  return Boolean(secret());
}

/**
 * Normalise a signature for comparison.
 *
 * The documented format is raw unpadded Base64URL with no prefix, but a
 * `scheme=` prefix and `=` padding are both cheap to tolerate and cost
 * nothing — the HMAC comparison below is what actually decides validity.
 */
function normalise(signature: string): string {
  const trimmed = signature.trim();
  const eq = trimmed.indexOf("=");

  // A prefix like "v1=..." only counts if there is content after it and the
  // separator is not simply Base64 padding at the end.
  const unprefixed =
    eq > 0 && eq < trimmed.length - 1 ? trimmed.slice(eq + 1) : trimmed;

  return unprefixed.replace(/=+$/, "");
}

/** Constant-time compare of two hex/base64 digests of equal length. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verify a delivery.
 *
 * `rawBody` must be the exact bytes received — read the request with
 * `req.text()` and parse only after this returns valid.
 */
export function verifySignature(
  rawBody: string,
  headers: Headers
): SignatureResult {
  const key = secret();
  if (!key) return { valid: false, reason: "no-secret-configured" };

  const provided = headers.get(SIGNATURE_HEADER);
  if (!provided) return { valid: false, reason: "missing-signature" };

  const timestamp = headers.get(TIMESTAMP_HEADER);
  if (!timestamp) return { valid: false, reason: "missing-timestamp" };

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return { valid: false, reason: "bad-timestamp" };

  // Timestamps may arrive in seconds or milliseconds; normalise before the
  // age check so a millisecond value is not read as the far future.
  const seconds = sentAt > 1e12 ? Math.floor(sentAt / 1000) : sentAt;
  const age = Math.abs(Date.now() / 1000 - seconds);
  if (age > MAX_AGE_SECONDS) return { valid: false, reason: "timestamp-out-of-range" };

  const message = `${timestamp}.${rawBody}`;

  // Hmac instances are single-use, so compute the digest once and render each
  // accepted encoding from the same bytes.
  const mac = createHmac("sha256", key).update(message, "utf8").digest();
  const candidate = normalise(provided);

  const accepted = [
    // Documented format: raw unpadded Base64URL ("-" and "_", no padding).
    mac.toString("base64url"),
    // Tolerated defensively so a format change does not silently reject
    // every genuine delivery.
    mac.toString("base64").replace(/=+$/, ""),
    mac.toString("hex"),
  ];

  for (const expected of accepted) {
    if (safeEqual(candidate, expected)) return { valid: true };
  }

  return { valid: false, reason: "signature-mismatch" };
}
