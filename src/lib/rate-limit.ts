import { prisma } from "@/lib/prisma";

let callCount = 0;
const CLEANUP_INTERVAL = 100;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  callCount++;

  // Periodically clean up expired entries
  if (callCount % CLEANUP_INTERVAL === 0) {
    prisma.rateLimit
      .deleteMany({
        where: {
          windowStart: { lt: new Date(Date.now() - windowMs) },
        },
      })
      .catch((err: unknown) => {
        console.error("[rate-limit] Cleanup failed:", err);
      });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  const existing = await prisma.rateLimit.findUnique({
    where: { key },
  });

  // No record or window expired — reset
  if (!existing || existing.windowStart < windowStart) {
    await prisma.rateLimit.upsert({
      where: { key },
      create: {
        key,
        attempts: 1,
        windowStart: now,
      },
      update: {
        attempts: 1,
        windowStart: now,
      },
    });

    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetAt: new Date(now.getTime() + windowMs),
    };
  }

  // Within window — check limit
  if (existing.attempts >= maxAttempts) {
    const resetAt = new Date(existing.windowStart.getTime() + windowMs);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Increment attempts
  const updated = await prisma.rateLimit.update({
    where: { key },
    data: { attempts: { increment: 1 } },
  });

  return {
    allowed: true,
    remaining: maxAttempts - updated.attempts,
    resetAt: new Date(existing.windowStart.getTime() + windowMs),
  };
}
