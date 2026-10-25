/**
 * Resolve the application's public base URL.
 *
 * Needed wherever a third party must reach us — gateway return URLs, webhook
 * registration, emailed links. Those consumers reject anything that is not a
 * publicly resolvable HTTPS origin, so `http://localhost:3000` (the usual
 * local `NEXTAUTH_URL`) is not a usable answer.
 *
 * Resolution order, first usable wins:
 *   1. APP_PUBLIC_URL      explicit override
 *   2. NEXTAUTH_URL        when it is public HTTPS
 *   3. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL  on Vercel
 *   4. PRODUCTION_FALLBACK so local development still works
 */

const PRODUCTION_FALLBACK = "https://copytradesultra.com";

function isPublicHttps(value: string | undefined): value is string {
  if (!value) return false;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;

    const host = url.hostname.toLowerCase();
    // Loopback and private ranges are reachable by us but not by a gateway.
    if (host === "localhost" || host.endsWith(".local")) return false;
    if (host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") return false;
    if (/^(10|127)\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    // A bare hostname with no dot cannot resolve publicly.
    if (!host.includes(".")) return false;

    return true;
  } catch {
    return false;
  }
}

/** Public origin, no trailing slash. Always returns a usable HTTPS URL. */
export function getPublicAppUrl(): string {
  const candidates = [
    process.env.APP_PUBLIC_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const candidate of candidates) {
    if (isPublicHttps(candidate)) return candidate.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[app-url] No public HTTPS origin configured (NEXTAUTH_URL=${process.env.NEXTAUTH_URL ?? "unset"}). ` +
        `Falling back to ${PRODUCTION_FALLBACK}. Payment return links will land on production, not this machine. ` +
        `Set APP_PUBLIC_URL to a tunnel URL to test the full round trip locally.`
    );
  }

  return PRODUCTION_FALLBACK;
}

/** True when returns will land somewhere other than this process. */
export function isUsingFallbackAppUrl(): boolean {
  return getPublicAppUrl() === PRODUCTION_FALLBACK && !isPublicHttps(process.env.NEXTAUTH_URL);
}
