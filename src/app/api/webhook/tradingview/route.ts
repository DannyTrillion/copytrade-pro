import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tradingViewSignalSchema } from "@/lib/validators/webhook";
import { processSignal } from "@/lib/engine/copy-trade";
import { WEBHOOK_SECRET_HEADER } from "@/config/constants";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // Validate webhook secret
    const secret = req.headers.get(WEBHOOK_SECRET_HEADER);
    if (secret !== process.env.WEBHOOK_SECRET) {
      const body = await req.json();
      if (body.secret !== process.env.WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = tradingViewSignalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid signal format", details: parsed.error.issues }, { status: 400 });
    }

    const signal = parsed.data;

    // Verify trader exists and is active
    const trader = await prisma.trader.findUnique({
      where: { id: signal.trader_id },
    });

    if (!trader || !trader.isActive) {
      return NextResponse.json({ error: "Trader not found or inactive" }, { status: 404 });
    }

    // Check for duplicate signal (same trader, symbol, action within 5 seconds)
    const recentSignal = await prisma.signal.findFirst({
      where: {
        traderId: signal.trader_id,
        symbol: signal.symbol,
        action: signal.action,
        createdAt: { gte: new Date(Date.now() - 5000) },
      },
    });

    if (recentSignal) {
      return NextResponse.json({ error: "Duplicate signal detected" }, { status: 409 });
    }

    // Save signal
    const savedSignal = await prisma.signal.create({
      data: {
        traderId: signal.trader_id,
        action: signal.action,
        symbol: signal.symbol,
        price: signal.price,
        riskPercent: signal.risk_percent,
        status: "PROCESSING",
      },
    });

    // Process signal asynchronously
    processSignal(savedSignal.id).catch(console.error);

    return NextResponse.json({
      success: true,
      signalId: savedSignal.id,
      message: "Signal received and processing",
    }, { status: 201 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
