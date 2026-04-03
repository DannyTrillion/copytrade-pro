import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, unauthorizedResponse, forbiddenResponse, errorResponse } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

/**
 * POST — Create a new user (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole("ADMIN");
    const adminId = admin.id;
    const body = await req.json();

    if (body.action === "createUser") {
      const schema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        role: z.enum(["FOLLOWER", "MASTER_TRADER", "ADMIN"]),
      });

      const { name, email, password, role } = schema.parse(body);

      // Check email uniqueness
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return errorResponse("A user with this email already exists", 409);
      }

      // Hash password
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role,
        },
      });

      // Create balance record
      await prisma.balance.create({
        data: { userId: user.id },
      });

      // If MASTER_TRADER, create trader profile
      if (role === "MASTER_TRADER") {
        await prisma.trader.create({
          data: {
            userId: user.id,
            displayName: name,
          },
        });
      }

      await logAudit({
        adminId,
        action: "CREATE_USER",
        targetType: "USER",
        targetId: user.id,
        details: { name, email, role },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
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
    console.error("Admin Users POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH — Edit user details (admin only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRole("ADMIN");
    const adminId = admin.id;
    const body = await req.json();

    if (body.action === "editUser") {
      const schema = z.object({
        userId: z.string().min(1),
        name: z.string().min(1, "Name is required").optional(),
        email: z.string().email("Invalid email address").optional(),
      });

      const { userId, name, email } = schema.parse(body);

      // If email is being changed, check uniqueness
      if (email) {
        const existing = await prisma.user.findFirst({
          where: { email, id: { not: userId } },
        });
        if (existing) {
          return errorResponse("A user with this email already exists", 409);
        }
      }

      const updateData: Record<string, string> = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;

      if (Object.keys(updateData).length === 0) {
        return errorResponse("No fields to update", 400);
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      await logAudit({
        adminId,
        action: "EDIT_USER",
        targetType: "USER",
        targetId: userId,
        details: updateData,
      });

      return NextResponse.json({ success: true, user: updated });
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
    console.error("Admin Users PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
