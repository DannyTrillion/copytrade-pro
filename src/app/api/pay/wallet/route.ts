import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";

/**
 * GET — Return the platform's EVM deposit wallet for card payment flows.
 * Falls back to the general deposit_wallet if no EVM-specific one is set.
 */
export async function GET() {
  try {
    await requireAuth();

    const configs = await prisma.adminConfig.findMany({
      where: {
        key: { in: ["DEPOSIT_WALLET_EVM", "deposit_wallet"] },
      },
    });

    const configMap: Record<string, string> = {};
    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });

    const wallet = configMap["DEPOSIT_WALLET_EVM"] || configMap["deposit_wallet"] || "";

    return NextResponse.json({ wallet });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to fetch wallet config");
  }
}
