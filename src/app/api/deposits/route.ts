import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { rateLimitRequest } from "@/lib/api-rate-limit";
import { z } from "zod";
import { createHash } from "crypto";

const depositSchema = z.object({
  amount: z.number().positive("Amount must be positive").min(10, "Minimum deposit is $10"),
  method: z.enum(["CRYPTO", "CARD", "CHEQUE", "ONRAMP"]),
  coin: z.string().optional(),
  network: z.string().optional(),
  txHash: z.string().optional(),
  proofUrl: z.string().optional(),
  cardRef: z.string().optional(),
  bankName: z.string().optional(),
  chequeNumber: z.string().optional(),
});

/**
 * Generate a deterministic tracking wallet address for a user.
 * This is for display only — all real deposits go to admin wallet.
 */
function generateTrackingAddress(userId: string): string {
  const hash = createHash("sha256").update(`tracking-${userId}`).digest("hex");
  return "0x" + hash.slice(0, 40);
}

/**
 * GET — Fetch user's deposit requests + tracking wallet + admin wallet + summary stats
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const deposits = await prisma.depositRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Get admin deposit wallets (default + per-coin)
    const adminConfigs = await prisma.adminConfig.findMany({
      where: {
        key: { startsWith: "wallet_" },
      },
    });
    const defaultWalletConfig = await prisma.adminConfig.findUnique({
      where: { key: "deposit_wallet" },
    });

    // Build wallet map: { "BTC_Bitcoin": "0x...", "ETH_ERC20": "0x...", ... }
    const walletMap: Record<string, string> = {};
    for (const config of adminConfigs) {
      // key format: wallet_COIN_NETWORK e.g. wallet_BTC_Bitcoin
      const parts = config.key.replace("wallet_", "");
      walletMap[parts] = config.value;
    }

    const trackingAddress = generateTrackingAddress(user.id);

    // Summary stats
    const totalDeposited = deposits
      .filter((d) => d.status === "CONFIRMED")
      .reduce((sum, d) => sum + d.amount, 0);
    const pendingAmount = deposits
      .filter((d) => d.status === "PENDING")
      .reduce((sum, d) => sum + d.amount, 0);
    const pendingCount = deposits.filter((d) => d.status === "PENDING").length;
    const lastDeposit = deposits.find((d) => d.status === "CONFIRMED") || null;

    return NextResponse.json({
      deposits,
      trackingWallet: trackingAddress,
      adminWallet: defaultWalletConfig?.value || null,
      walletMap,
      summary: {
        totalDeposited,
        pendingAmount,
        pendingCount,
        lastDepositDate: lastDeposit?.createdAt || null,
        lastDepositAmount: lastDeposit?.amount || null,
      },
    });
  } catch {
    return unauthorizedResponse();
  }
}

/**
 * POST — Create a deposit request
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimitRequest(req, { maxAttempts: 10, windowMs: 60000 });
    if (limited) return limited;

    const user = await requireAuth();
    const body = await req.json();
    const data = depositSchema.parse(body);

    // Require coin for crypto deposits
    if (data.method === "CRYPTO" && !data.coin) {
      return errorResponse("Coin selection required for crypto deposits", 400);
    }

    // Require card reference for card deposits
    if (data.method === "CARD" && !data.cardRef) {
      return errorResponse("Payment reference required for card deposits", 400);
    }

    // Require bank name and cheque number for cheque deposits
    if (data.method === "CHEQUE") {
      if (!data.bankName) return errorResponse("Bank name required for cheque deposits", 400);
      if (!data.chequeNumber) return errorResponse("Cheque number required for cheque deposits", 400);
    }

    // Check for duplicate pending deposits (max 5 pending at a time)
    const pendingCount = await prisma.depositRequest.count({
      where: { userId: user.id, status: "PENDING" },
    });
    if (pendingCount >= 5) {
      return errorResponse("Maximum 5 pending deposit requests allowed. Please wait for existing ones to be reviewed.", 400);
    }

    // Get admin wallet — try per-coin first, then fallback to default
    let adminWalletAddress: string | null = null;
    if (data.coin && data.network) {
      const perCoinConfig = await prisma.adminConfig.findUnique({
        where: { key: `wallet_${data.coin}_${data.network}` },
      });
      adminWalletAddress = perCoinConfig?.value || null;
    }
    if (!adminWalletAddress) {
      const defaultConfig = await prisma.adminConfig.findUnique({
        where: { key: "deposit_wallet" },
      });
      adminWalletAddress = defaultConfig?.value || null;
    }

    const trackingAddress = generateTrackingAddress(user.id);

    const deposit = await prisma.depositRequest.create({
      data: {
        userId: user.id,
        amount: data.amount,
        method: data.method,
        coin: data.coin || null,
        network: data.network || null,
        txHash: data.txHash || null,
        proofUrl: data.proofUrl || null,
        cardRef: data.cardRef || null,
        bankName: data.bankName || null,
        chequeNumber: data.chequeNumber || null,
        userWallet: trackingAddress,
        adminWallet: adminWalletAddress,
        status: "PENDING",
      },
    });

    return NextResponse.json({ deposit }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to create deposit request");
  }
}
