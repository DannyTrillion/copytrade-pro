import { prisma } from "@/lib/prisma";
import { getTotalDeposited } from "@/lib/tiers";

/**
 * Canonical allocation model:
 *   allocatedAmount = totalDeposits × (sum of followers.allocationPercent) / 100
 *
 * Allocation is a function of committed deposits and the user's chosen allocation %
 * per followed trader — NOT a function of current balance (which includes P&L).
 * Trades and displays both derive from this same formula.
 */

export interface AllocationSummary {
  totalDeposits: number;           // sum of confirmed deposits + card payments
  allocationPercent: number;       // sum of followers.allocationPercent (capped at 100)
  allocatedAmount: number;         // totalDeposits × allocationPercent / 100
  unallocatedDeposits: number;     // totalDeposits − allocatedAmount
  totalBalance: number;            // includes PnL
  availableBalance: number;        // stored available bucket
  totalProfit: number;
  activeTraderCount: number;
  traders: Array<{
    traderId: string;
    traderName: string;
    allocationPercent: number;
    allocatedAmount: number;
  }>;
}

/**
 * Compute a user's live allocation summary. Allocation is always derived from
 * total deposits, never from current balance.
 */
export async function getAllocationSummary(userId: string): Promise<AllocationSummary> {
  const [totalDeposits, balance, followers] = await Promise.all([
    getTotalDeposited(userId),
    prisma.balance.findUnique({ where: { userId } }),
    prisma.follower.findMany({
      where: { userId },
      include: {
        trader: {
          select: { id: true, displayName: true, user: { select: { name: true } } },
        },
      },
    }),
  ]);

  const rawPercent = followers.reduce((sum, f) => sum + (f.allocationPercent ?? 0), 0);
  const allocationPercent = Math.min(100, Math.max(0, rawPercent));
  const allocatedAmount = totalDeposits * (allocationPercent / 100);
  const unallocatedDeposits = Math.max(0, totalDeposits - allocatedAmount);

  const traders = followers.map((f) => ({
    traderId: f.traderId,
    traderName: f.trader?.displayName || f.trader?.user?.name || "Trader",
    allocationPercent: f.allocationPercent ?? 0,
    allocatedAmount: totalDeposits * ((f.allocationPercent ?? 0) / 100),
  }));

  return {
    totalDeposits,
    allocationPercent,
    allocatedAmount,
    unallocatedDeposits,
    totalBalance: balance?.totalBalance ?? 0,
    availableBalance: balance?.availableBalance ?? 0,
    totalProfit: balance?.totalProfit ?? 0,
    activeTraderCount: followers.length,
    traders,
  };
}

/**
 * Sync the stored Balance.allocatedBalance to match the canonical formula.
 * Keeps totalBalance intact (PnL and deposits are already reflected there) and
 * splits it between allocated and available according to the live allocation %.
 *
 * Call this after:
 *  - a deposit is confirmed (admin or webhook)
 *  - a follower is created / updated / deleted
 *  - allocationPercent changes
 */
export async function recomputeAllocatedBalance(userId: string): Promise<void> {
  const balance = await prisma.balance.findUnique({ where: { userId } });
  if (!balance) return;

  const [totalDeposits, followers] = await Promise.all([
    getTotalDeposited(userId),
    prisma.follower.findMany({
      where: { userId },
      select: { allocationPercent: true },
    }),
  ]);

  const rawPercent = followers.reduce((sum, f) => sum + (f.allocationPercent ?? 0), 0);
  const allocationPercent = Math.min(100, Math.max(0, rawPercent));
  const allocatedAmount = totalDeposits * (allocationPercent / 100);

  // Keep totalBalance invariant; redistribute the buckets so they sum correctly.
  const total = balance.totalBalance;
  const newAllocated = Math.min(total, allocatedAmount);
  const newAvailable = Math.max(0, total - newAllocated);

  await prisma.balance.update({
    where: { userId },
    data: {
      allocatedBalance: newAllocated,
      availableBalance: newAvailable,
    },
  });
}
