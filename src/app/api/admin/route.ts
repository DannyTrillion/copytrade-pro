import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorizedResponse, forbiddenResponse, errorResponse } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

/**
 * GET — Admin dashboard stats + optional entity lists
 * ?view=stats | users | trades | balances
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "stats";

    if (view === "stats") {
      const [
        totalUsers,
        totalTraders,
        totalFollowers,
        totalTraderTrades,
        totalCopyResults,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.trader.count({ where: { isActive: true } }),
        prisma.follower.count({ where: { copyEnabled: true, approved: true } }),
        prisma.traderTrade.count(),
        prisma.copyResult.count(),
      ]);

      // Aggregate balance data across all users
      const balanceAgg = await prisma.balance.aggregate({
        _sum: {
          totalBalance: true,
          allocatedBalance: true,
          totalProfit: true,
        },
      });

      // Aggregate trader PnL
      const traderPnlAgg = await prisma.traderTrade.aggregate({
        _sum: { profitLoss: true },
      });

      // Aggregate deposit/withdrawal volume without fetching all rows
      const [depositAgg, withdrawalAgg] = await Promise.all([
        prisma.balanceTransaction.aggregate({
          where: { type: "DEPOSIT" },
          _sum: { amount: true },
        }),
        prisma.balanceTransaction.aggregate({
          where: { type: "WITHDRAWAL" },
          _sum: { amount: true },
        }),
      ]);

      const totalDeposits = depositAgg._sum.amount || 0;
      const totalWithdrawals = Math.abs(withdrawalAgg._sum.amount || 0);

      // Win rate via count queries instead of fetching all rows
      const [totalTradesForWinRate, winningTrades] = await Promise.all([
        prisma.traderTrade.count(),
        prisma.traderTrade.count({ where: { resultPercent: { gt: 0 } } }),
      ]);
      const platformWinRate = totalTradesForWinRate > 0 ? (winningTrades / totalTradesForWinRate) * 100 : 0;

      return NextResponse.json({
        stats: {
          totalUsers,
          totalTraders,
          totalFollowers,
          totalTraderTrades,
          totalCopyResults,
          totalPlatformBalance: balanceAgg._sum.totalBalance || 0,
          totalAllocated: balanceAgg._sum.allocatedBalance || 0,
          totalProfit: balanceAgg._sum.totalProfit || 0,
          totalTraderPnl: traderPnlAgg._sum.profitLoss || 0,
          totalDeposits,
          totalWithdrawals,
          platformWinRate: Math.round(platformWinRate * 10) / 10,
        },
      });
    }

    if (view === "users") {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const take = 100;
      const skip = (page - 1) * take;

      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            suspended: true,
            createdAt: true,
            wallet: { select: { address: true, isConnected: true } },
            balance: { select: { totalBalance: true, availableBalance: true, allocatedBalance: true, totalProfit: true } },
            trader: { select: { id: true, totalTrades: true, totalPnl: true, winRate: true, isActive: true } },
            _count: { select: { following: true, copyResults: true } },
          },
          orderBy: { createdAt: "desc" },
          take,
          skip,
        }),
        prisma.user.count(),
      ]);

      return NextResponse.json({ users, pagination: { page, pageSize: take, total: totalCount, totalPages: Math.ceil(totalCount / take) } });
    }

    if (view === "trades") {
      const trades = await prisma.traderTrade.findMany({
        include: {
          trader: {
            select: {
              displayName: true,
              user: { select: { name: true, email: true } },
            },
          },
          _count: { select: { copyResults: true } },
        },
        orderBy: { tradeDate: "desc" },
        take: 50,
      });

      return NextResponse.json({ trades });
    }

    if (view === "balances") {
      const balances = await prisma.balance.findMany({
        include: {
          user: { select: { name: true, email: true, role: true } },
        },
        orderBy: { totalBalance: "desc" },
        take: 100,
      });

      // Recent transactions platform-wide
      const transactions = await prisma.balanceTransaction.findMany({
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      return NextResponse.json({ balances, transactions });
    }

    if (view === "deposits") {
      const deposits = await prisma.depositRequest.findMany({
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ deposits });
    }

    if (view === "withdrawals") {
      const withdrawals = await prisma.withdrawalRequest.findMany({
        select: {
          id: true,
          amount: true,
          walletAddress: true,
          network: true,
          status: true,
          txHash: true,
          note: true,
          reviewedAt: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ withdrawals });
    }

    if (view === "traders") {
      const traders = await prisma.trader.findMany({
        include: {
          user: { select: { name: true, email: true, avatar: true } },
          _count: { select: { followers: true, traderTrades: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ traders });
    }

    if (view === "config") {
      const configs = await prisma.adminConfig.findMany();
      const configMap: Record<string, string> = {};
      configs.forEach((c) => { configMap[c.key] = c.value; });
      return NextResponse.json({ config: configMap });
    }

    if (view === "audit-logs") {
      const logs = await prisma.auditLog.findMany({
        include: {
          admin: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return NextResponse.json({ logs });
    }

    return errorResponse("Invalid view parameter", 400);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse();
      if (error.message === "Forbidden") return forbiddenResponse();
    }
    console.error("Admin GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH — Admin actions (update user role, toggle trader active, delete user)
 */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRole("ADMIN");
    const adminId = admin.id;
    const body = await req.json();

    // Update user role
    if (body.action === "updateRole") {
      const schema = z.object({
        userId: z.string(),
        role: z.enum(["ADMIN", "MASTER_TRADER", "FOLLOWER"]),
      });
      const { userId, role } = schema.parse(body);

      const prev = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      await prisma.user.update({
        where: { id: userId },
        data: { role },
      });

      // Auto-create trader profile when promoting to MASTER_TRADER
      if (role === "MASTER_TRADER") {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        await prisma.trader.upsert({
          where: { userId },
          create: { userId, displayName: user?.name || "Trader" },
          update: {},
        });
      }

      await logAudit({ adminId, action: "UPDATE_ROLE", targetType: "USER", targetId: userId, details: { from: prev?.role, to: role } });
      return NextResponse.json({ success: true });
    }

    // Toggle trader active status
    if (body.action === "toggleTrader") {
      const { traderId, isActive } = z.object({
        traderId: z.string(),
        isActive: z.boolean(),
      }).parse(body);

      await prisma.trader.update({
        where: { id: traderId },
        data: { isActive },
      });

      await logAudit({ adminId, action: "TOGGLE_TRADER", targetType: "TRADER", targetId: traderId, details: { isActive } });
      return NextResponse.json({ success: true });
    }

    // ─── Suspend / Unsuspend user ───
    if (body.action === "suspendUser") {
      const { userId, suspended } = z.object({
        userId: z.string(),
        suspended: z.boolean(),
      }).parse(body);

      await prisma.user.update({
        where: { id: userId },
        data: { suspended },
      });

      await logAudit({ adminId, action: suspended ? "SUSPEND_USER" : "UNSUSPEND_USER", targetType: "USER", targetId: userId });
      return NextResponse.json({ success: true });
    }

    // Legacy: direct role update (backward compatibility)
    if (body.userId && body.role) {
      await prisma.user.update({
        where: { id: body.userId },
        data: { role: body.role },
      });

      if (body.role === "MASTER_TRADER") {
        const user = await prisma.user.findUnique({ where: { id: body.userId } });
        await prisma.trader.upsert({
          where: { userId: body.userId },
          create: { userId: body.userId, displayName: user?.name || "Trader" },
          update: {},
        });
      }

      await logAudit({ adminId, action: "UPDATE_ROLE", targetType: "USER", targetId: body.userId, details: { to: body.role } });
      return NextResponse.json({ success: true });
    }

    // ─── Edit user balance ───
    if (body.action === "editBalance") {
      const schema = z.object({
        userId: z.string(),
        operation: z.enum(["add_deposit", "add_profit", "add_loss", "subtract"]),
        amount: z.number().positive(),
      });
      const { userId, operation, amount } = schema.parse(body);

      let balance = await prisma.balance.findUnique({ where: { userId } });
      if (!balance) {
        balance = await prisma.balance.create({ data: { userId } });
      }

      let updateData: Record<string, unknown> = {};
      let txType = "";
      let txAmount = amount;
      let description = "";

      switch (operation) {
        case "add_deposit":
          updateData = {
            totalBalance: { increment: amount },
            availableBalance: { increment: amount },
          };
          txType = "DEPOSIT";
          description = "Admin deposit";
          break;
        case "add_profit":
          updateData = {
            totalBalance: { increment: amount },
            availableBalance: { increment: amount },
            totalProfit: { increment: amount },
          };
          txType = "COPY_PROFIT";
          description = "Admin profit adjustment";
          break;
        case "add_loss":
          updateData = {
            totalBalance: { decrement: amount },
            availableBalance: { decrement: Math.min(amount, balance.availableBalance) },
            totalProfit: { decrement: amount },
          };
          txType = "COPY_LOSS";
          txAmount = -amount;
          description = "Admin loss adjustment";
          break;
        case "subtract":
          updateData = {
            totalBalance: { decrement: Math.min(amount, balance.totalBalance) },
            availableBalance: { decrement: Math.min(amount, balance.availableBalance) },
          };
          txType = "WITHDRAWAL";
          txAmount = -amount;
          description = "Admin balance subtraction";
          break;
      }

      const updated = await prisma.balance.update({
        where: { userId },
        data: updateData,
      });

      await prisma.balanceTransaction.create({
        data: {
          userId,
          type: txType,
          amount: txAmount,
          balanceBefore: balance.totalBalance,
          balanceAfter: updated.totalBalance,
          description,
        },
      });

      await logAudit({ adminId, action: "EDIT_BALANCE", targetType: "USER", targetId: userId, details: { operation, amount, before: balance.totalBalance, after: updated.totalBalance } });
      return NextResponse.json({ success: true, balance: updated });
    }

    // ─── Create trader ───
    if (body.action === "createTrader") {
      const schema = z.object({
        displayName: z.string().min(1),
        description: z.string().optional(),
        performancePct: z.number().optional(),
        bio: z.string().optional(),
        totalPnl: z.number().optional(),
        winRate: z.number().min(0).max(100).optional(),
        totalTrades: z.number().int().min(0).optional(),
        userId: z.string().optional(), // assign existing user, or create standalone
      });
      const data = schema.parse(body);

      let userId = data.userId;

      // If no userId, create a placeholder user for this trader
      if (!userId) {
        const bcrypt = await import("bcryptjs");
        const placeholderEmail = `trader_${Date.now()}@platform.internal`;
        const placeholderHash = await bcrypt.hash("trader-placeholder-" + Date.now(), 10);
        const newUser = await prisma.user.create({
          data: {
            email: placeholderEmail,
            name: data.displayName,
            passwordHash: placeholderHash,
            role: "MASTER_TRADER",
          },
        });
        userId = newUser.id;
      } else {
        // Promote user to MASTER_TRADER if not already
        await prisma.user.update({
          where: { id: userId },
          data: { role: "MASTER_TRADER" },
        });
      }

      const trader = await prisma.trader.upsert({
        where: { userId },
        create: {
          userId,
          displayName: data.displayName,
          description: data.description || null,
          bio: data.bio || null,
          performancePct: data.performancePct || 0,
          totalPnl: data.totalPnl || 0,
          winRate: data.winRate || 0,
          totalTrades: data.totalTrades || 0,
          isActive: true,
        },
        update: {
          displayName: data.displayName,
          description: data.description || undefined,
          bio: data.bio || undefined,
          performancePct: data.performancePct,
          totalPnl: data.totalPnl,
          winRate: data.winRate,
          totalTrades: data.totalTrades,
          isActive: true,
        },
      });

      await logAudit({ adminId, action: "CREATE_TRADER", targetType: "TRADER", targetId: trader.id, details: { displayName: data.displayName } });
      return NextResponse.json({ success: true, trader });
    }

    // ─── Update trader stats ───
    if (body.action === "updateTrader") {
      const schema = z.object({
        traderId: z.string(),
        displayName: z.string().optional(),
        description: z.string().optional(),
        bio: z.string().optional(),
        performancePct: z.number().optional(),
        totalPnl: z.number().optional(),
        winRate: z.number().min(0).max(100).optional(),
        totalTrades: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
      });
      const { traderId, ...updateFields } = schema.parse(body);

      // Remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(updateFields).filter(([, v]) => v !== undefined)
      );

      const trader = await prisma.trader.update({
        where: { id: traderId },
        data: cleanData,
      });

      await logAudit({ adminId, action: "UPDATE_TRADER", targetType: "TRADER", targetId: traderId, details: cleanData });
      return NextResponse.json({ success: true, trader });
    }

    // ─── Update trader avatar ───
    if (body.action === "updateTraderAvatar") {
      const schema = z.object({
        traderId: z.string(),
        avatar: z.string().url().nullable(),
      });
      const { traderId, avatar } = schema.parse(body);

      const trader = await prisma.trader.findUnique({
        where: { id: traderId },
        select: { userId: true },
      });
      if (!trader) return errorResponse("Trader not found", 404);

      await prisma.user.update({
        where: { id: trader.userId },
        data: { avatar },
      });

      await logAudit({ adminId, action: "UPDATE_TRADER_AVATAR", targetType: "TRADER", targetId: traderId, details: { avatar } });
      return NextResponse.json({ success: true });
    }

    // ─── Delete trader ───
    if (body.action === "deleteTrader") {
      const schema = z.object({
        traderId: z.string().min(1),
      });
      const { traderId } = schema.parse(body);

      const trader = await prisma.trader.findUnique({
        where: { id: traderId },
        select: { id: true, displayName: true },
      });
      if (!trader) return errorResponse("Trader not found", 404);

      // Delete all followers linked to this trader
      await prisma.follower.deleteMany({ where: { traderId } });

      // Delete the trader record
      await prisma.trader.delete({ where: { id: traderId } });

      await logAudit({
        adminId,
        action: "DELETE_CONFIG",
        targetType: "TRADER",
        targetId: traderId,
        details: { displayName: trader.displayName },
      });

      return NextResponse.json({ success: true });
    }

    // ─── Assign trader to user ───
    if (body.action === "assignTrader") {
      const schema = z.object({
        userId: z.string(),
        traderId: z.string(),
      });
      const { userId: targetUserId, traderId } = schema.parse(body);

      // Create approved follower link
      await prisma.follower.upsert({
        where: {
          userId_traderId: { userId: targetUserId, traderId },
        },
        create: {
          userId: targetUserId,
          traderId,
          copyEnabled: true,
          approved: true,
        },
        update: {
          copyEnabled: true,
          approved: true,
        },
      });

      // Also approve the copy request if one exists
      await prisma.copyRequest.updateMany({
        where: { userId: targetUserId, traderId },
        data: { status: "APPROVED", reviewedAt: new Date() },
      });

      await logAudit({ adminId, action: "ASSIGN_TRADER", targetType: "USER", targetId: targetUserId, details: { traderId } });
      return NextResponse.json({ success: true });
    }

    // ─── Manage deposit request ───
    if (body.action === "reviewDeposit") {
      const schema = z.object({
        depositId: z.string(),
        status: z.enum(["CONFIRMED", "REJECTED"]),
      });
      const { depositId, status } = schema.parse(body);

      const deposit = await prisma.depositRequest.findUnique({ where: { id: depositId } });
      if (!deposit) return errorResponse("Deposit not found", 404);

      await prisma.depositRequest.update({
        where: { id: depositId },
        data: { status, reviewedAt: new Date() },
      });

      // If confirmed, credit user balance
      if (status === "CONFIRMED") {
        let balance = await prisma.balance.findUnique({ where: { userId: deposit.userId } });
        if (!balance) {
          balance = await prisma.balance.create({ data: { userId: deposit.userId } });
        }

        const updated = await prisma.balance.update({
          where: { userId: deposit.userId },
          data: {
            totalBalance: { increment: deposit.amount },
            availableBalance: { increment: deposit.amount },
          },
        });

        await prisma.balanceTransaction.create({
          data: {
            userId: deposit.userId,
            type: "DEPOSIT",
            amount: deposit.amount,
            balanceBefore: balance.totalBalance,
            balanceAfter: updated.totalBalance,
            description: `${deposit.method} deposit confirmed`,
            txHash: deposit.txHash || null,
          },
        });
      }

      await logAudit({ adminId, action: "REVIEW_DEPOSIT", targetType: "DEPOSIT", targetId: depositId, details: { status, amount: deposit.amount, userId: deposit.userId } });
      return NextResponse.json({ success: true });
    }

    // ─── Manage withdrawal request ───
    if (body.action === "reviewWithdrawal") {
      const schema = z.object({
        withdrawalId: z.string(),
        status: z.enum(["APPROVED", "REJECTED"]),
      });
      const { withdrawalId, status } = schema.parse(body);

      const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id: withdrawalId } });
      if (!withdrawal) return errorResponse("Withdrawal not found", 404);

      await prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: { status, reviewedAt: new Date() },
      });

      // If approved, debit user balance
      if (status === "APPROVED") {
        const balance = await prisma.balance.findUnique({ where: { userId: withdrawal.userId } });
        if (!balance) return errorResponse("No balance found", 400);

        if (balance.availableBalance < withdrawal.amount) {
          return errorResponse("Insufficient balance", 400);
        }

        const updated = await prisma.balance.update({
          where: { userId: withdrawal.userId },
          data: {
            totalBalance: { decrement: withdrawal.amount },
            availableBalance: { decrement: withdrawal.amount },
          },
        });

        await prisma.balanceTransaction.create({
          data: {
            userId: withdrawal.userId,
            type: "WITHDRAWAL",
            amount: -withdrawal.amount,
            balanceBefore: balance.totalBalance,
            balanceAfter: updated.totalBalance,
            description: `Withdrawal approved — ${withdrawal.network}`,
          },
        });
      }

      await logAudit({ adminId, action: "REVIEW_WITHDRAWAL", targetType: "WITHDRAWAL", targetId: withdrawalId, details: { status, amount: withdrawal.amount, userId: withdrawal.userId } });
      return NextResponse.json({ success: true });
    }

    // ─── Payout withdrawal (record tx hash) ───
    if (body.action === "payoutWithdrawal") {
      const schema = z.object({
        withdrawalId: z.string(),
        txHash: z.string().min(1),
      });
      const { withdrawalId, txHash } = schema.parse(body);

      const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id: withdrawalId } });
      if (!withdrawal) return errorResponse("Withdrawal not found", 404);

      await prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: { txHash },
      });

      await logAudit({ adminId, action: "PAYOUT_WITHDRAWAL", targetType: "WITHDRAWAL", targetId: withdrawalId, details: { txHash, amount: withdrawal.amount } });
      return NextResponse.json({ success: true });
    }

    // ─── Set admin config (e.g. deposit wallet) ───
    if (body.action === "setConfig") {
      const schema = z.object({
        key: z.string().min(1),
        value: z.string().min(1),
      });
      const { key, value } = schema.parse(body);

      await prisma.adminConfig.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });

      await logAudit({ adminId, action: "SET_CONFIG", targetType: "CONFIG", targetId: key, details: { value } });
      return NextResponse.json({ success: true });
    }

    // ─── Delete admin config ───
    if (body.action === "deleteConfig") {
      const schema = z.object({ key: z.string().min(1) });
      const { key } = schema.parse(body);

      await prisma.adminConfig.deleteMany({ where: { key } });

      await logAudit({ adminId, action: "DELETE_CONFIG", targetType: "CONFIG", targetId: key });
      return NextResponse.json({ success: true });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return unauthorizedResponse();
      if (error.message === "Forbidden") return forbiddenResponse();
    }
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    console.error("Admin PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
