import crypto from "crypto";

// ─── Base32 Encoding/Decoding (RFC 4648) ───

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/[=\s]/g, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${cleaned[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

// ─── TOTP Core ───

const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;

/**
 * Generate a cryptographically random 20-byte secret, returned as a base32 string.
 */
export function generateSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Generate a 6-digit TOTP code using HMAC-SHA1.
 * @param secret - Base32-encoded secret
 * @param time - Unix timestamp in seconds (defaults to current time)
 */
export function generateTOTP(secret: string, time?: number): string {
  const now = time ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / TOTP_PERIOD);

  // Convert counter to 8-byte big-endian buffer
  const counterBuffer = Buffer.alloc(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  // HMAC-SHA1
  const key = base32Decode(secret);
  const hmac = crypto.createHmac("sha1", key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  // Dynamic truncation (RFC 4226)
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, "0");
}

/**
 * Verify a TOTP code, allowing +/- 1 time step window for clock drift.
 * @param secret - Base32-encoded secret
 * @param code - 6-digit code from the user
 */
export function verifyTOTP(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);

  // Check current period, previous period, and next period
  for (let offset = -1; offset <= 1; offset++) {
    const time = now + offset * TOTP_PERIOD;
    const expected = generateTOTP(secret, time);
    if (timingSafeEqual(code, expected)) {
      return true;
    }
  }

  return false;
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

// ─── Backup Codes ───

/**
 * Generate a set of one-time backup codes (8-char hex, uppercase).
 */
export function generateBackupCodes(count: number = 10): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
}

/**
 * Hash a backup code for secure storage using SHA-256.
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code.toUpperCase()).digest("hex");
}

/**
 * Verify a backup code against stored hashes.
 * Returns validity and remaining unused codes (with the matched one removed).
 */
export function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): { valid: boolean; remaining: string[] } {
  const hashed = hashBackupCode(code);
  const index = hashedCodes.indexOf(hashed);
  if (index === -1) return { valid: false, remaining: hashedCodes };
  const remaining = [...hashedCodes];
  remaining.splice(index, 1);
  return { valid: true, remaining };
}

/**
 * Generate an otpauth:// URL for QR code scanning by authenticator apps.
 * @param secret - Base32-encoded secret
 * @param email - User's email address (used as the account label)
 */
export function generateOTPAuthURL(secret: string, email: string): string {
  const issuer = "CopyTrade Pro";
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);

  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}
