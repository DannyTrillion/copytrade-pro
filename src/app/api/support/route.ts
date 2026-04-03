import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, errorResponse } from "@/lib/auth";
import { z } from "zod";

/**
 * GET /api/support
 * - Users: get their own threads
 * - Admins: get all threads (with ?all=true)
 * - ?threadId=xxx: get messages for a specific thread
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");
    const all = searchParams.get("all") === "true";

    // Get messages for a specific thread
    if (threadId) {
      const thread = await prisma.supportThread.findUnique({
        where: { id: threadId },
        include: {
          user: { select: { name: true, email: true } },
        },
      });

      if (!thread) return errorResponse("Thread not found", 404);

      // Users can only access their own threads
      if (user.role !== "ADMIN" && thread.userId !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      const messages = await prisma.supportMessage.findMany({
        where: { threadId },
        orderBy: { createdAt: "asc" },
      });

      // Mark messages as read (for the viewer)
      const senderRoleToMark = user.role === "ADMIN" ? "USER" : "ADMIN";
      await prisma.supportMessage.updateMany({
        where: { threadId, senderRole: senderRoleToMark, read: false },
        data: { read: true },
      });

      return NextResponse.json({ thread, messages });
    }

    // Admin: get all threads
    if (all && user.role === "ADMIN") {
      const threads = await prisma.supportThread.findMany({
        include: {
          user: { select: { name: true, email: true } },
          _count: {
            select: {
              messages: { where: { senderRole: "USER", read: false } },
            },
          },
        },
        orderBy: { lastMessageAt: "desc" },
      });

      return NextResponse.json({ threads });
    }

    // User: get their own threads
    const threads = await prisma.supportThread.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: {
            messages: { where: { senderRole: "ADMIN", read: false } },
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    return NextResponse.json({ threads });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Support GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/support
 * - action: "createThread" — user starts a new support thread
 * - action: "sendMessage" — send a message in a thread
 * - action: "resolveThread" — admin resolves a thread
 * - action: "reopenThread" — reopen a resolved thread
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    if (body.action === "createThread") {
      const { subject, message } = z.object({
        subject: z.string().min(1).max(200),
        message: z.string().min(1).max(5000),
      }).parse(body);

      const thread = await prisma.supportThread.create({
        data: {
          userId: user.id,
          subject,
          updatedAt: new Date(),
          messages: {
            create: {
              senderId: user.id,
              senderRole: user.role === "ADMIN" ? "ADMIN" : "USER",
              message,
            },
          },
        },
        include: {
          messages: true,
        },
      });

      return NextResponse.json({ thread });
    }

    if (body.action === "sendMessage") {
      const { threadId, message } = z.object({
        threadId: z.string(),
        message: z.string().min(1).max(5000),
      }).parse(body);

      const thread = await prisma.supportThread.findUnique({
        where: { id: threadId },
      });

      if (!thread) return errorResponse("Thread not found", 404);
      if (user.role !== "ADMIN" && thread.userId !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      const senderRole = user.role === "ADMIN" ? "ADMIN" : "USER";

      const msg = await prisma.supportMessage.create({
        data: {
          threadId,
          senderId: user.id,
          senderRole,
          message,
        },
      });

      // Update thread timestamp and reopen if resolved and user sends a message
      const updateData: { lastMessageAt: Date; updatedAt: Date; status?: string } = {
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      };
      if (thread.status === "RESOLVED" && senderRole === "USER") {
        updateData.status = "OPEN";
      }

      await prisma.supportThread.update({
        where: { id: threadId },
        data: updateData,
      });

      return NextResponse.json({ message: msg });
    }

    if (body.action === "resolveThread") {
      await requireRole("ADMIN");
      const { threadId } = z.object({ threadId: z.string() }).parse(body);

      await prisma.supportThread.update({
        where: { id: threadId },
        data: { status: "RESOLVED", updatedAt: new Date() },
      });

      return NextResponse.json({ success: true });
    }

    if (body.action === "reopenThread") {
      const { threadId } = z.object({ threadId: z.string() }).parse(body);

      const thread = await prisma.supportThread.findUnique({ where: { id: threadId } });
      if (!thread) return errorResponse("Thread not found", 404);
      if (user.role !== "ADMIN" && thread.userId !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      await prisma.supportThread.update({
        where: { id: threadId },
        data: { status: "OPEN", updatedAt: new Date() },
      });

      return NextResponse.json({ success: true });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    console.error("Support POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
