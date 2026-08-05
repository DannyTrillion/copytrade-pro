/**
 * SERVER ONLY — do not import from a client component.
 *
 * The pepper is a server-side secret mixed into every identifier hash. Without
 * it, a leaked database would let an attacker confirm whether a given email or
 * phone number is blacklisted simply by hashing candidates offline: the input
 * space is small and fully enumerable, so an unpeppered SHA-256 offers no real
 * protection there.
 *
 * It lives in its own module rather than in `config/security.ts` because that
 * config is imported by client components. Keeping the secret here means it can
 * never be pulled into a browser bundle by an innocent-looking import.
 *
 * Rotating this value invalidates every stored identifier hash — existing
 * blacklist entries stop matching. Treat it as permanent once set in
 * production.
 */

/**
 * Falls back to NEXTAUTH_SECRET so existing deployments keep working without a
 * new env var, but a dedicated SECURITY_HASH_PEPPER is strongly preferred:
 * reusing the auth secret means rotating one forces rotating the other.
 */
export const SECURITY_PEPPER =
  process.env.SECURITY_HASH_PEPPER || process.env.NEXTAUTH_SECRET || "";

/**
 * True when a pepper is configured. An empty pepper does not throw — it would
 * take down authentication on a misconfigured deploy — but it silently weakens
 * every stored hash, so callers should surface it loudly.
 */
export function isPepperConfigured(): boolean {
  return SECURITY_PEPPER.length > 0;
}

if (!SECURITY_PEPPER && process.env.NODE_ENV === "production") {
  console.error(
    "[security] No SECURITY_HASH_PEPPER or NEXTAUTH_SECRET configured — " +
      "identifier hashes are unpeppered and offline-enumerable."
  );
}
