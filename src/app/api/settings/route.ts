import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().email("Invalid email address"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

/**
 * GET — Fetch user profile
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        wallet: {
          select: { address: true, isConnected: true, verifiedAt: true },
        },
        balance: {
          select: { totalBalance: true, totalProfit: true },
        },
      },
    });

    return NextResponse.json({ profile });
  } catch {
    return unauthorizedResponse();
  }
}

/**
 * PATCH — Update profile or change password
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { action } = body;

    if (action === "updateProfile") {
      const { name, email } = profileSchema.parse(body);

      // Check email uniqueness
      if (email !== user.email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          return errorResponse("Email is already in use", 400);
        }
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { name, email },
        select: { id: true, name: true, email: true, role: true },
      });

      return NextResponse.json({ profile: updated });
    }

    if (action === "changePassword") {
      const { currentPassword, newPassword } = passwordSchema.parse(body);

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true },
      });

      if (!dbUser) return errorResponse("User not found", 404);

      const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
      if (!isValid) {
        return errorResponse("Current password is incorrect", 400);
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });

      return NextResponse.json({ success: true, message: "Password updated successfully" });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Settings update failed");
  }
}
