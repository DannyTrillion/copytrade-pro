import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { notifyDeposit, notifyWithdrawal } from "@/lib/notifications";
import { rateLimitRequest } from "@/lib/api-rate-limit";
import { z } from "zod";

const depositSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(1000000),
  txHash: z.string().optional(),
  signature: z.string().optional(),
  message: z.string().optional(),
  walletAddress: z.string().optional(),
});

const withdrawSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
});

const allocateSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  action: z.enum(["allocate", "deallocate"]),
});

/**
 * GET — Fetch user balance
 */
export async function GET() {
  try {
    const user = await requireAuth();

    let balance = await prisma.balance.findUnique({
      where: { userId: user.id },
    });

    // Auto-create balance record if missing
    if (!balance) {
      balance = await prisma.balance.create({
        data: { userId: user.id },
      });
    }

    // Fetch recent transactions
    const transactions = await prisma.balanceTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ balance, transactions });
  } catch {
    return unauthorizedResponse();
  }
}

/**
 * POST — Deposit, Withdraw, or Allocate funds
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimitRequest(req, { maxAttempts: 20, windowMs: 60000 });
    if (limited) return limited;

    const user = await requireAuth();
    const body = await req.json();
    const { operation } = body;

    // Ensure balance exists
    let balance = await prisma.balance.findUnique({
      where: { userId: user.id },
    });
    if (!balance) {
      balance = await prisma.balance.create({
        data: { userId: user.id },
      });
    }

    if (operation === "deposit") {
      const { amount, txHash, signature, message, walletAddress } = depositSchema.parse(body);

      // Verify wallet signature if provided
      if (signature && message && walletAddress) {
        const { recoverMessageAddress } = await import("viem");
        const recoveredAddress = await recoverMessageAddress({
          message,
          signature: signature as `0x${string}`,
        });
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          return errorResponse("Deposit signature verification failed", 400);
        }
      }

      const updated = await prisma.balance.update({
        where: { userId: user.id },
        data: {
          totalBalance: { increment: amount },
          availableBalance: { increment: amount },
        },
      });

      await prisma.balanceTransaction.create({
        data: {
          userId: user.id,
          type: "DEPOSIT",
          amount,
          balanceBefore: balance.totalBalance,
          balanceAfter: updated.totalBalance,
          description: signature ? "Funds deposited (wallet-signed)" : "Funds deposited",
          txHash: txHash || null,
        },
      });

      // Fire notification (non-blocking)
      notifyDeposit(user.id, amount).catch(() => {});

      return NextResponse.json({ balance: updated }, { status: 201 });
    }

    if (operation === "withdraw") {
      const { amount } = withdrawSchema.parse(body);

      // Atomic transaction to prevent race conditions
      const result = await prisma.$transaction(async (tx) => {
        const currentBalance = await tx.balance.findUnique({
          where: { userId: user.id },
        });
        if (!currentBalance || amount > currentBalance.availableBalance) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const updated = await tx.balance.update({
          where: { userId: user.id },
          data: {
            totalBalance: { decrement: amount },
            availableBalance: { decrement: amount },
          },
        });

        await tx.balanceTransaction.create({
          data: {
            userId: user.id,
            type: "WITHDRAWAL",
            amount: -amount,
            balanceBefore: currentBalance.totalBalance,
            balanceAfter: updated.totalBalance,
            description: "Funds withdrawn",
          },
        });

        return updated;
      });

      if (!result) {
        return errorResponse("Insufficient available balance", 400);
      }

      notifyWithdrawal(user.id, amount).catch(() => {});
      return NextResponse.json({ balance: result });
    }

    if (operation === "allocate") {
      const { amount, action } = allocateSchema.parse(body);

      if (action === "allocate") {
        const result = await prisma.$transaction(async (tx) => {
          const current = await tx.balance.findUnique({ where: { userId: user.id } });
          if (!current || amount > current.availableBalance) {
            throw new Error("INSUFFICIENT_BALANCE");
          }

          const updated = await tx.balance.update({
            where: { userId: user.id },
            data: {
              availableBalance: { decrement: amount },
              allocatedBalance: { increment: amount },
            },
          });

          await tx.balanceTransaction.create({
            data: {
              userId: user.id,
              type: "ALLOCATION",
              amount,
              balanceBefore: current.availableBalance,
              balanceAfter: updated.availableBalance,
              description: "Funds allocated to copy trading",
            },
          });

          return updated;
        });

        return NextResponse.json({ balance: result });
      }

      if (action === "deallocate") {
        const result = await prisma.$transaction(async (tx) => {
          const current = await tx.balance.findUnique({ where: { userId: user.id } });
          if (!current || amount > current.allocatedBalance) {
            throw new Error("INSUFFICIENT_ALLOCATED");
          }

          const updated = await tx.balance.update({
            where: { userId: user.id },
            data: {
              availableBalance: { increment: amount },
              allocatedBalance: { decrement: amount },
            },
          });

          await tx.balanceTransaction.create({
            data: {
              userId: user.id,
              type: "DEALLOCATION",
              amount: -amount,
              balanceBefore: current.allocatedBalance,
              balanceAfter: updated.allocatedBalance,
              description: "Funds deallocated from copy trading",
            },
          });

          return updated;
        });

        return NextResponse.json({ balance: result });
      }
    }

    return errorResponse("Invalid operation. Use: deposit, withdraw, or allocate", 400);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse();
      if (error.message === "INSUFFICIENT_BALANCE") return errorResponse("Insufficient available balance", 400);
      if (error.message === "INSUFFICIENT_ALLOCATED") return errorResponse("Cannot deallocate more than allocated", 400);
    }
    return errorResponse("Operation failed");
  }
}
