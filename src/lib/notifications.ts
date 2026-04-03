import { prisma } from "@/lib/prisma";

type NotificationType =
  | "COPY_REQUEST"
  | "COPY_APPROVED"
  | "COPY_REJECTED"
  | "TRADE_RESULT"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "SYSTEM";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl || null,
    },
  });
}

export async function notifyDeposit(userId: string, amount: number) {
  return createNotification({
    userId,
    type: "DEPOSIT",
    title: "Deposit Successful",
    message: `$${amount.toFixed(2)} has been deposited to your balance.`,
    actionUrl: "/dashboard/follower",
  });
}

export async function notifyWithdrawal(userId: string, amount: number) {
  return createNotification({
    userId,
    type: "WITHDRAWAL",
    title: "Withdrawal Complete",
    message: `$${amount.toFixed(2)} has been withdrawn from your balance.`,
    actionUrl: "/dashboard/follower",
  });
}

export async function notifyCopyRequest(traderId: string, traderUserId: string, followerName: string) {
  return createNotification({
    userId: traderUserId,
    type: "COPY_REQUEST",
    title: "New Copy Request",
    message: `${followerName} wants to copy your trades.`,
    actionUrl: "/dashboard/trader",
  });
}

export async function notifyCopyApproved(userId: string, traderName: string) {
  return createNotification({
    userId,
    type: "COPY_APPROVED",
    title: "Copy Request Approved",
    message: `${traderName} approved your copy trading request.`,
    actionUrl: "/dashboard/follower",
  });
}

export async function notifyCopyRejected(userId: string, traderName: string) {
  return createNotification({
    userId,
    type: "COPY_REJECTED",
    title: "Copy Request Rejected",
    message: `${traderName} declined your copy trading request.`,
    actionUrl: "/dashboard/follower",
  });
}

export async function notifyTradeResult(userId: string, tradeName: string, profitLoss: number) {
  const isProfit = profitLoss >= 0;
  return createNotification({
    userId,
    type: "TRADE_RESULT",
    title: isProfit ? "Copy Trade Profit" : "Copy Trade Loss",
    message: `${tradeName}: ${isProfit ? "+" : ""}$${profitLoss.toFixed(2)}`,
    actionUrl: "/dashboard/follower",
  });
}
