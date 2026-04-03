import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export type AuditAction =
  | "UPDATE_ROLE"
  | "TOGGLE_TRADER"
  | "EDIT_BALANCE"
  | "CREATE_TRADER"
  | "UPDATE_TRADER"
  | "ASSIGN_TRADER"
  | "REVIEW_DEPOSIT"
  | "REVIEW_WITHDRAWAL"
  | "SET_CONFIG"
  | "DELETE_CONFIG"
  | "SUSPEND_USER"
  | "UNSUSPEND_USER"
  | "PAYOUT_WITHDRAWAL"
  | "CREATE_USER"
  | "EDIT_USER"
  | "UPDATE_TRADER_AVATAR"
  | "DELETE_TRADER"
  | "REVIEW_NEXT_OF_KIN"
  | "CONFIRM_CARD_PAYMENT"
  | "REJECT_CARD_PAYMENT"
  | "IMPERSONATE_START"
  | "IMPERSONATE_STOP"
  | "IMPERSONATE_FAILED";

interface AuditLogParams {
  adminId: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}

export async function logAudit({
  adminId,
  action,
  targetType,
  targetId,
  details,
}: AuditLogParams) {
  try {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown";

    await prisma.auditLog.create({
      data: {
        adminId,
        action,
        targetType: targetType || null,
        targetId: targetId || null,
        details: details ? JSON.stringify(details) : null,
        ipAddress: ip,
      },
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}
