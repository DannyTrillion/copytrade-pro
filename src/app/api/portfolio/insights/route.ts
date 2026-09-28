/**
 * Portfolio insights.
 *
 * GET /api/portfolio/insights?range=30d|90d|1y|all
 *
 * Everything the Copy Trading charts need in one round trip: the equity curve,
 * per-ticker P&L attribution, and market allocation. Three separate endpoints
 * would mean three waterfalls on a page that already makes five fetches.
 *
 * All figures are derived from `CopyResult` — the per-user record of what a
 * copied trade actually did to that user's balance. Nothing here is modelled,
 * projected or simulated; if a user has no copy results, the response is
 * honestly empty rather than padded with placeholder series.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import {
  buildEquityCurve,
  buildMarketAllocation,
  buildSummary,
  buildTickerAttribution,
  emptySummary,
} from "@/lib/portfolio/insights";

export const dynamic = "force-dynamic";

const RANGE_DAYS: Record<string, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
  all: null,
};

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(req.url);
    const rangeKey = searchParams.get("range") ?? "all";
    const days = rangeKey in RANGE_DAYS ? RANGE_DAYS[rangeKey] : null;

    const since = days ? new Date(Date.now() - days * 86_400_000) : null;

    const results = await prisma.copyResult.findMany({
      where: {
        userId: user.id,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        balanceBefore: true,
        balanceAfter: true,
        profitLoss: true,
        resultPercent: true,
        createdAt: true,
        traderTrade: {
          select: { tradeName: true, market: true, tradeDate: true },
        },
      },
    });

    if (results.length === 0) {
      return NextResponse.json({
        range: rangeKey,
        summary: emptySummary(),
        equityCurve: [],
        tickerAttribution: [],
        marketAllocation: [],
      });
    }

    return NextResponse.json({
      range: rangeKey,
      summary: buildSummary(results),
      equityCurve: buildEquityCurve(results),
      tickerAttribution: buildTickerAttribution(results),
      marketAllocation: buildMarketAllocation(results),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("[portfolio/insights] Failed:", error);
    return errorResponse("Failed to load portfolio insights", 500);
  }
}
