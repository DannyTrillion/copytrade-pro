import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
  errorResponse,
} from "@/lib/auth";
import { Prisma } from "@prisma/client";

const VALID_DAYS = new Set([7, 30, 90, 365]);

type RawRow = { date: string | Date; [k: string]: string | Date | number | bigint | null };

/**
 * GET /api/analytics — Platform analytics for the admin dashboard.
 *
 * Query params:
 *   days — 7 | 30 | 90 | 365 (default 30)
 *
 * Returns KPIs (all-time), volume metrics (within period),
 * and daily time-series chart data for user growth, trade volume,
 * trade P&L, and commission revenue.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const daysParam = parseInt(searchParams.get("days") || "30", 10);
    const days = VALID_DAYS.has(daysParam) ? daysParam : 30;

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    periodStart.setHours(0, 0, 0, 0);

    // ── KPIs (all-time) ──────────────────────────────────────────────────
    const [totalUsers, activeTraders, totalTrades, commissionAgg] =
      await Promise.all([
        prisma.user.count(),
        prisma.trader.count({ where: { isActive: true } }),
        prisma.traderTrade.count(),
        prisma.commission.aggregate({ _sum: { amount: true } }),
      ]);

    const commissionRevenue = commissionAgg._sum.amount ?? 0;

    // ── Volume metrics (within selected period) ──────────────────────────
    const [depositAgg, withdrawalAgg, copyFollowers] = await Promise.all([
      prisma.depositRequest.aggregate({
        _sum: { amount: true },
        where: {
          status: "CONFIRMED",
          createdAt: { gte: periodStart },
        },
      }),
      prisma.withdrawalRequest.aggregate({
        _sum: { amount: true },
        where: {
          status: "APPROVED",
          createdAt: { gte: periodStart },
        },
      }),
      prisma.follower.count({ where: { approved: true } }),
    ]);

    const depositVolume = depositAgg._sum.amount ?? 0;
    const withdrawalVolume = withdrawalAgg._sum.amount ?? 0;

    // ── Time-series charts (raw SQL for date grouping) ───────────────────
    const periodStartISO = periodStart.toISOString();

    const [userGrowthRaw, tradeVolumeRaw, tradePnlRaw, revenueRaw] =
      await Promise.all([
        // Users created per day
        prisma.$queryRawUnsafe<RawRow[]>(
          `SELECT DATE("createdAt") as date, COUNT(*) as count
           FROM "User"
           WHERE "createdAt" >= ?
           GROUP BY DATE("createdAt")
           ORDER BY date ASC`,
          periodStartISO,
        ),

        // Trades per day
        prisma.$queryRawUnsafe<RawRow[]>(
          `SELECT DATE("tradeDate") as date, COUNT(*) as count
           FROM "TraderTrade"
           WHERE "tradeDate" >= ?
           GROUP BY DATE("tradeDate")
           ORDER BY date ASC`,
          periodStartISO,
        ),

        // Aggregate P&L per day
        prisma.$queryRawUnsafe<RawRow[]>(
          `SELECT DATE("tradeDate") as date, COALESCE(SUM("profitLoss"), 0) as pnl
           FROM "TraderTrade"
           WHERE "tradeDate" >= ?
           GROUP BY DATE("tradeDate")
           ORDER BY date ASC`,
          periodStartISO,
        ),

        // Commission revenue per day
        prisma.$queryRawUnsafe<RawRow[]>(
          `SELECT DATE("createdAt") as date, COALESCE(SUM("amount"), 0) as amount
           FROM "Commission"
           WHERE "createdAt" >= ?
           GROUP BY DATE("createdAt")
           ORDER BY date ASC`,
          periodStartISO,
        ),
      ]);

    // ── Fill missing dates with zero values ──────────────────────────────
    const fillDates = (
      raw: RawRow[],
      valueKey: string,
      outputKey: string,
    ): { date: string; [key: string]: string | number }[] => {
      const map = new Map<string, number>();

      for (const row of raw) {
        const d = row.date;
        const dateStr =
          d instanceof Date
            ? d.toISOString().split("T")[0]
            : String(d);
        const value = row[valueKey];
        map.set(
          dateStr,
          typeof value === "bigint" ? Number(value) : Number(value ?? 0),
        );
      }

      const result: { date: string; [key: string]: string | number }[] = [];
      const cursor = new Date(periodStart);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      while (cursor <= today) {
        const key = cursor.toISOString().split("T")[0];
        result.push({ date: key, [outputKey]: map.get(key) ?? 0 });
        cursor.setDate(cursor.getDate() + 1);
      }

      return result;
    };

    const charts = {
      userGrowth: fillDates(userGrowthRaw, "count", "count"),
      tradeVolume: fillDates(tradeVolumeRaw, "count", "count"),
      tradePnl: fillDates(tradePnlRaw, "pnl", "pnl"),
      revenue: fillDates(revenueRaw, "amount", "amount"),
    };

    return NextResponse.json({
      kpis: {
        totalUsers,
        activeTraders,
        totalTrades,
        commissionRevenue,
      },
      volumes: {
        depositVolume,
        withdrawalVolume,
        copyFollowers,
      },
      charts,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse();
      if (error.message === "Forbidden") return forbiddenResponse();
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Analytics DB error:", error.code, error.message);
      return errorResponse("Database query failed", 500);
    }

    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
