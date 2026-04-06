import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await requireAuth();
    const userId = authUser.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        referralCode: true,
        onboardingComplete: true,
        wallet: { select: { address: true, createdAt: true } },
        balance: { select: { totalBalance: true, availableBalance: true, allocatedBalance: true, totalProfit: true } },
        transactions: {
          select: { type: true, amount: true, balanceBefore: true, balanceAfter: true, description: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        },
        depositRequests: {
          select: { amount: true, method: true, coin: true, network: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
        withdrawalRequests: {
          select: { amount: true, network: true, walletAddress: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
        following: {
          select: {
            allocationPercent: true,
            createdAt: true,
            trader: { select: { displayName: true } },
          },
        },
        copyResults: {
          select: {
            profitLoss: true,
            resultPercent: true,
            balanceBefore: true,
            balanceAfter: true,
            createdAt: true,
            traderTrade: { select: { tradeName: true, market: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        },
        notifications: {
          select: { type: true, title: true, message: true, read: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
        referralRewards: {
          select: { amount: true, status: true, createdAt: true },
        },
        nextOfKin: {
          select: { fullName: true, relationship: true, phone: true, status: true, createdAt: true },
        },
      },
    });

    if (!user) {
      return unauthorizedResponse();
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      platform: "CopyTrade Pro",
      userData: {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
          memberSince: user.createdAt,
          referralCode: user.referralCode,
        },
        wallet: user.wallet,
        balance: user.balance,
        transactions: user.transactions,
        deposits: user.depositRequests,
        withdrawals: user.withdrawalRequests,
        following: user.following.map((f) => ({
          trader: f.trader.displayName,
          allocation: f.allocationPercent,
          since: f.createdAt,
        })),
        copyResults: user.copyResults,
        notifications: user.notifications,
        referralRewards: user.referralRewards,
        nextOfKin: user.nextOfKin,
      },
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="copytrade-pro-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch {
    return unauthorizedResponse();
  }
}
