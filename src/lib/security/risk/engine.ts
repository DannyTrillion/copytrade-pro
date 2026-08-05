/**
 * Risk scoring engine.
 *
 * Loads rule configuration from the database, runs every enabled rule
 * concurrently, sums the weights of those that fire, and persists both the
 * total and the individual contributing signals.
 *
 * Design commitments:
 *
 *  - **Explainable.** The score is never stored without the signals that
 *    produced it. A number an admin cannot interrogate is a number they will
 *    either ignore or act on blindly, and both are worse than no number.
 *  - **Advisory, never automatic.** A high score flags an account for human
 *    review. Nothing here bans anyone. Automated enforcement on a heuristic
 *    score would generate false positives against real customers' money.
 *  - **Isolated failures.** One broken rule degrades the score, it does not
 *    fail the computation.
 *  - **Decaying.** Signals expire, so an account that stops behaving suspiciously
 *    recovers instead of being permanently marked.
 *  - **Off the hot path.** Scoring runs after authentication completes and never
 *    blocks the user's request.
 */

import type { RiskLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_RISK_RULES, RISK_THRESHOLDS } from "@/config/security";
import { logSecurityEventAsync } from "../events";
import { RISK_RULES, type RuleSignal } from "./rules";

export interface RiskComputation {
  userId: string;
  score: number;
  level: RiskLevel;
  flagged: boolean;
  signals: Array<RuleSignal & { weight: number }>;
  /** Rules that threw and were skipped. */
  errors: string[];
}

function toLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.CRITICAL) return "CRITICAL";
  if (score >= RISK_THRESHOLDS.HIGH) return "HIGH";
  if (score >= RISK_THRESHOLDS.MEDIUM) return "MEDIUM";
  return "LOW";
}

/**
 * Ensure `RiskRuleConfig` is populated, seeding defaults on first run.
 *
 * Seeds only rules that are absent, so operator tuning is never overwritten by
 * a later deploy — after the first seed, the database is authoritative.
 */
export async function ensureRiskRulesSeeded(): Promise<number> {
  const existing = await prisma.riskRuleConfig.findMany({ select: { rule: true } });
  const known = new Set(existing.map((r) => r.rule));

  const missing = DEFAULT_RISK_RULES.filter((rule) => !known.has(rule.rule));
  if (missing.length === 0) return 0;

  const created = await prisma.riskRuleConfig.createMany({
    data: missing.map((rule) => ({
      rule: rule.rule,
      enabled: true,
      weight: rule.weight,
      threshold: rule.threshold,
      windowSeconds: rule.windowSeconds,
      decaySeconds: rule.decaySeconds,
      description: rule.description,
    })),
    skipDuplicates: true,
  });

  return created.count;
}

/**
 * Compute and persist a user's risk score.
 *
 * Safe to call frequently — it is idempotent for a given state of the world.
 */
export async function computeRiskScore(userId: string): Promise<RiskComputation> {
  const now = new Date();

  await ensureRiskRulesSeeded();

  const configs = await prisma.riskRuleConfig.findMany({ where: { enabled: true } });

  const outcomes = await Promise.all(
    configs.map(async (config) => {
      const rule = RISK_RULES[config.rule];

      // A config row with no implementation is not an error — it is how a rule
      // is staged in the database ahead of the code that evaluates it.
      if (!rule) return { config, signal: null, error: null };

      try {
        const signal = await rule({
          userId,
          threshold: config.threshold ?? 1,
          windowSeconds: config.windowSeconds ?? 86_400,
          now,
        });
        return { config, signal, error: null };
      } catch (error) {
        console.error(`[risk] Rule ${config.rule} failed:`, error);
        return { config, signal: null, error: config.rule };
      }
    })
  );

  const fired = outcomes.filter((o) => o.signal !== null);
  const errors = outcomes.map((o) => o.error).filter((e): e is string => e !== null);

  const rawScore = fired.reduce((sum, o) => sum + o.config.weight, 0);
  // Clamped: without a ceiling, adding rules would inflate every score and
  // silently shift what "80" means.
  const score = Math.min(rawScore, RISK_THRESHOLDS.maxScore);
  const level = toLevel(score);
  const flagged = score >= RISK_THRESHOLDS.flagThreshold;

  const signals = fired.map((o) => ({
    rule: o.signal!.rule,
    detail: o.signal!.detail,
    weight: o.config.weight,
  }));

  const previous = await prisma.riskScore.findUnique({
    where: { userId },
    select: { id: true, score: true, flagged: true },
  });

  await prisma.$transaction(async (tx) => {
    const record = await tx.riskScore.upsert({
      where: { userId },
      create: { userId, score, level, flagged, computedAt: now },
      update: {
        score,
        level,
        flagged,
        computedAt: now,
        // Re-open for review when a reviewed account climbs back above the
        // threshold — otherwise a single review would silence it forever.
        ...(flagged && previous && !previous.flagged
          ? { reviewedAt: null, reviewedBy: null }
          : {}),
      },
      select: { id: true },
    });

    // Replace this cycle's signals wholesale. Expired ones from earlier cycles
    // are swept separately so recent history stays visible to reviewers.
    await tx.riskSignal.deleteMany({
      where: {
        riskScoreId: record.id,
        OR: [
          { expiresAt: { lte: now } },
          { rule: { in: signals.map((s) => s.rule) } },
        ],
      },
    });

    if (signals.length > 0) {
      await tx.riskSignal.createMany({
        data: signals.map((signal) => {
          const config = configs.find((c) => c.rule === signal.rule);
          return {
            riskScoreId: record.id,
            userId,
            rule: signal.rule,
            weight: signal.weight,
            detail: JSON.stringify(signal.detail),
            expiresAt: config?.decaySeconds
              ? new Date(now.getTime() + config.decaySeconds * 1000)
              : null,
          };
        }),
      });
    }
  });

  // Log only on transition into flagged state — logging every recomputation
  // would bury real events under routine noise.
  if (flagged && !previous?.flagged) {
    logSecurityEventAsync({
      type: "RISK_FLAGGED",
      severity: score >= RISK_THRESHOLDS.CRITICAL ? "CRITICAL" : "HIGH",
      userId,
      reason: `Risk score ${score} (${level}) — flagged for review`,
      metadata: { score, level, rules: signals.map((s) => s.rule) },
    });
  }

  return { userId, score, level, flagged, signals, errors };
}

/**
 * Fire-and-forget scoring for the authentication path.
 * Never awaited by the caller, so a slow or failing rule cannot delay a login.
 */
export function computeRiskScoreAsync(userId: string): void {
  void computeRiskScore(userId).catch((error) =>
    console.error("[risk] Background scoring failed:", error)
  );
}

/**
 * Recompute scores for a batch of accounts.
 *
 * Processed in small serial chunks rather than all at once: a hundred
 * concurrent scorings would each fan out into several queries and exhaust the
 * connection pool.
 */
export async function recomputeRiskScores(
  userIds: string[],
  chunkSize = 5
): Promise<{ processed: number; flagged: number; failed: number }> {
  let processed = 0;
  let flagged = 0;
  let failed = 0;

  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);

    const results = await Promise.allSettled(
      chunk.map((userId) => computeRiskScore(userId))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        processed++;
        if (result.value.flagged) flagged++;
      } else {
        failed++;
      }
    }
  }

  return { processed, flagged, failed };
}

/**
 * Accounts worth scoring: those with recent authentication or financial
 * activity. Scoring every account on every sweep would be mostly wasted work.
 */
export async function getActiveUserIdsForScoring(
  sinceHours = 24,
  limit = 500
): Promise<string[]> {
  const since = new Date(Date.now() - sinceHours * 3_600_000);

  const [logins, withdrawals] = await Promise.all([
    prisma.loginAttempt.findMany({
      where: { createdAt: { gte: since }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
      take: limit,
    }),
    prisma.withdrawalRequest.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true },
      distinct: ["userId"],
      take: limit,
    }),
  ]);

  const ids = new Set<string>();
  for (const row of logins) if (row.userId) ids.add(row.userId);
  for (const row of withdrawals) ids.add(row.userId);

  return [...ids].slice(0, limit);
}

/** Drop signals whose decay window has passed. Run periodically. */
export async function sweepExpiredSignals(): Promise<number> {
  const result = await prisma.riskSignal.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return result.count;
}
