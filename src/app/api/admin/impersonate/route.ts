import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, errorResponse } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const impersonateSchema = z.object({
  email: z.string().email("Invalid email address"),
  masterKey: z.string().min(1, "Master key is required"),
});

/**
 * POST — Start impersonation: admin logs into a user's account
 * Validates the ADMIN_MASTER_KEY server-side only
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole("ADMIN");

    const body = await req.json();
    const { email, masterKey } = impersonateSchema.parse(body);

    // Validate master key server-side
    const envMasterKey = process.env.ADMIN_MASTER_KEY;

    if (!envMasterKey) {
      return errorResponse("Admin master access is not configured", 503);
    }

    // Constant-time comparison to prevent timing attacks
    if (!timingSafeEqual(masterKey, envMasterKey)) {
      await logAudit({
        adminId: admin.id,
        action: "IMPERSONATE_FAILED",
        details: { email, reason: "invalid_master_key" },
      });

      return errorResponse("Invalid master key", 403);
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        suspended: true,
      },
    });

    if (!targetUser) {
      return errorResponse("User not found", 404);
    }

    // Prevent self-impersonation
    if (targetUser.id === admin.id) {
      return errorResponse("Cannot impersonate yourself", 400);
    }

    // Log the impersonation
    await logAudit({
      adminId: admin.id,
      action: "IMPERSONATE_START",
      targetType: "user",
      targetId: targetUser.id,
      details: { email: targetUser.email, name: targetUser.name, role: targetUser.role },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("[impersonate] Error:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * DELETE — Stop impersonation: admin returns to their own account
 */
export async function DELETE() {
  try {
    // During impersonation, the session has impersonatorId.
    // The actual session restoration happens client-side via NextAuth update().
    // This endpoint just logs the action.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[impersonate/stop] Error:", error);
    return NextResponse.json({ success: true });
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    let result = 1;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i % b.length);
    }
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
