import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Rate limit an API request by IP + route.
 * Returns a 429 response if limit exceeded, or null if allowed.
 */
export async function rateLimitRequest(
  req: NextRequest,
  opts: { maxAttempts?: number; windowMs?: number; keyPrefix?: string } = {}
): Promise<NextResponse | null> {
  const { maxAttempts = 30, windowMs = 60 * 1000, keyPrefix } = opts;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const route = keyPrefix || req.nextUrl.pathname;
  const key = `api:${route}:${ip}`;

  const { allowed, resetAt } = await checkRateLimit(key, maxAttempts, windowMs);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(maxAttempts),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": resetAt.toISOString(),
        },
      }
    );
  }

  return null;
}
