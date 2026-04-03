import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";

/**
 * GET — Fetch user notifications
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "20");

    const where = {
      userId: user.id,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 50),
      }),
      prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch {
    return unauthorizedResponse();
  }
}

/**
 * PATCH — Mark notifications as read
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { action, notificationId } = body;

    if (action === "markAllRead") {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "markRead" && notificationId) {
      await prisma.notification.update({
        where: { id: notificationId, userId: user.id },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    return errorResponse("Invalid action", 400);
  } catch {
    return unauthorizedResponse();
  }
}
