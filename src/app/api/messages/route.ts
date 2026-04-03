import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";

// ─── Validation Schemas ───

const sendMessageSchema = z.object({
  receiverId: z.string().uuid("Invalid receiver ID"),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(1000, "Message must be 1000 characters or fewer"),
});

const markReadSchema = z.object({
  conversationUserId: z.string().uuid("Invalid user ID"),
});

// ─── Helpers ───

const MESSAGE_PAGE_SIZE = 50;

/**
 * Check whether two users share a follower-trader connection.
 * Returns true if:
 *  - userA follows a trader owned by userB (approved), OR
 *  - userB follows a trader owned by userA (approved)
 */
async function areUsersConnected(
  userAId: string,
  userBId: string
): Promise<boolean> {
  // Check if userA is following a trader owned by userB
  const aFollowsB = await prisma.follower.findFirst({
    where: {
      userId: userAId,
      approved: true,
      trader: { userId: userBId },
    },
  });

  if (aFollowsB) return true;

  // Check if userB is following a trader owned by userA
  const bFollowsA = await prisma.follower.findFirst({
    where: {
      userId: userBId,
      approved: true,
      trader: { userId: userAId },
    },
  });

  return !!bFollowsA;
}

/**
 * GET — Fetch conversations or message history
 *
 * ?userId=xxx  → paginated message history with that user (latest 50)
 * (no userId)  → list of conversations with last message + unread count
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const cursor = url.searchParams.get("cursor"); // message ID for pagination

    // ── Specific conversation history ──
    if (userId) {
      const whereClause = {
        OR: [
          { senderId: user.id, receiverId: userId },
          { senderId: userId, receiverId: user.id },
        ],
      };

      const messages = await prisma.directMessage.findMany({
        where: {
          ...whereClause,
          ...(cursor ? { createdAt: { lt: (await prisma.directMessage.findUnique({ where: { id: cursor } }))?.createdAt } } : {}),
        },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
          receiver: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        take: MESSAGE_PAGE_SIZE,
      });

      const totalCount = await prisma.directMessage.count({ where: whereClause });

      return NextResponse.json({
        messages: messages.reverse(), // chronological order
        totalCount,
        hasMore: messages.length === MESSAGE_PAGE_SIZE,
        nextCursor: messages.length > 0 ? messages[0].id : null,
      });
    }

    // ── Conversation list ──
    // Fetch all messages involving the current user, grouped by the other party
    const allMessages = await prisma.directMessage.findMany({
      where: {
        OR: [{ senderId: user.id }, { receiverId: user.id }],
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by the other user
    const conversationMap = new Map<
      string,
      {
        user: { id: string; name: string; avatar: string | null };
        lastMessage: {
          id: string;
          message: string;
          senderId: string;
          createdAt: Date;
        };
        unreadCount: number;
      }
    >();

    for (const msg of allMessages) {
      const otherUser =
        msg.senderId === user.id
          ? msg.receiver
          : msg.sender;

      if (!conversationMap.has(otherUser.id)) {
        conversationMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: {
            id: msg.id,
            message: msg.message,
            senderId: msg.senderId,
            createdAt: msg.createdAt,
          },
          unreadCount: 0,
        });
      }

      // Count unread messages sent TO the current user
      if (msg.receiverId === user.id && !msg.read) {
        const conv = conversationMap.get(otherUser.id)!;
        conv.unreadCount += 1;
      }
    }

    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt).getTime() -
        new Date(a.lastMessage.createdAt).getTime()
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to fetch messages", 500);
  }
}

/**
 * POST — Send a direct message
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = sendMessageSchema.parse(body);

    // Cannot message yourself
    if (data.receiverId === user.id) {
      return errorResponse("Cannot send a message to yourself");
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: data.receiverId },
      select: { id: true },
    });

    if (!receiver) {
      return errorResponse("Recipient not found", 404);
    }

    // Verify users are connected (follower-trader relationship)
    const connected = await areUsersConnected(user.id, data.receiverId);

    if (!connected) {
      return errorResponse(
        "You can only message users you have a copy-trading relationship with",
        403
      );
    }

    const message = await prisma.directMessage.create({
      data: {
        senderId: user.id,
        receiverId: data.receiverId,
        message: data.message,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message);
    }
    return errorResponse("Failed to send message", 500);
  }
}

/**
 * PATCH — Mark all messages from a specific user as read
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = markReadSchema.parse(body);

    const result = await prisma.directMessage.updateMany({
      where: {
        senderId: data.conversationUserId,
        receiverId: user.id,
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json({
      success: true,
      markedRead: result.count,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message);
    }
    return errorResponse("Failed to mark messages as read", 500);
  }
}
