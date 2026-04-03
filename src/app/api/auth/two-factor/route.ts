import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import {
  generateSecret,
  generateOTPAuthURL,
  verifyTOTP,
  generateBackupCodes,
  hashBackupCode,
} from "@/lib/totp";

// ─── Request Schemas ───

const setupSchema = z.object({
  action: z.literal("setup"),
});

const verifySetupSchema = z.object({
  action: z.literal("verify-setup"),
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d{6}$/, "Code must be numeric"),
});

const disableSchema = z.object({
  action: z.literal("disable"),
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d{6}$/, "Code must be numeric"),
});

const regenerateBackupCodesSchema = z.object({
  action: z.literal("regenerate-backup-codes"),
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d{6}$/, "Code must be numeric"),
});

const requestSchema = z.discriminatedUnion("action", [
  setupSchema,
  verifySetupSchema,
  disableSchema,
  regenerateBackupCodesSchema,
]);

// ─── GET — Check 2FA status ───

export async function GET() {
  try {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true },
    });

    if (!dbUser) {
      return errorResponse("User not found", 404);
    }

    return NextResponse.json({ enabled: dbUser.twoFactorEnabled });
  } catch {
    return unauthorizedResponse();
  }
}

// ─── POST — Setup, verify, or disable 2FA ───

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = requestSchema.parse(body);

    switch (parsed.action) {
      case "setup": {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { twoFactorEnabled: true, email: true },
        });

        if (!dbUser) {
          return errorResponse("User not found", 404);
        }

        if (dbUser.twoFactorEnabled) {
          return errorResponse("Two-factor authentication is already enabled", 400);
        }

        // Generate a new secret and store it (not yet enabled)
        const secret = generateSecret();
        const otpauthURL = generateOTPAuthURL(secret, dbUser.email);

        // Store the pending secret — twoFactorEnabled stays false until verified
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorSecret: secret },
        });

        return NextResponse.json({
          secret,
          otpauthURL,
        });
      }

      case "verify-setup": {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { twoFactorSecret: true, twoFactorEnabled: true },
        });

        if (!dbUser) {
          return errorResponse("User not found", 404);
        }

        if (dbUser.twoFactorEnabled) {
          return errorResponse("Two-factor authentication is already enabled", 400);
        }

        if (!dbUser.twoFactorSecret) {
          return errorResponse("No pending 2FA setup found. Please start setup first.", 400);
        }

        // Verify the code against the pending secret
        const isValid = verifyTOTP(dbUser.twoFactorSecret, parsed.code);
        if (!isValid) {
          return errorResponse("Invalid verification code. Please try again.", 400);
        }

        // Generate backup codes
        const plainBackupCodes = generateBackupCodes();
        const hashedBackupCodes = plainBackupCodes.map(hashBackupCode);

        // Enable 2FA and store hashed backup codes
        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorEnabled: true,
            twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
          },
        });

        return NextResponse.json({
          success: true,
          message: "Two-factor authentication enabled successfully",
          backupCodes: plainBackupCodes,
        });
      }

      case "disable": {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { twoFactorSecret: true, twoFactorEnabled: true },
        });

        if (!dbUser) {
          return errorResponse("User not found", 404);
        }

        if (!dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
          return errorResponse("Two-factor authentication is not enabled", 400);
        }

        // Verify the code before disabling
        const isValid = verifyTOTP(dbUser.twoFactorSecret, parsed.code);
        if (!isValid) {
          return errorResponse("Invalid verification code", 400);
        }

        // Disable and clear secret + backup codes
        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorBackupCodes: null,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Two-factor authentication disabled",
        });
      }

      case "regenerate-backup-codes": {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { twoFactorSecret: true, twoFactorEnabled: true },
        });

        if (!dbUser) {
          return errorResponse("User not found", 404);
        }

        if (!dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
          return errorResponse("Two-factor authentication is not enabled", 400);
        }

        // Verify TOTP code before regenerating
        const isValid = verifyTOTP(dbUser.twoFactorSecret, parsed.code);
        if (!isValid) {
          return errorResponse("Invalid verification code", 400);
        }

        // Generate new backup codes
        const plainBackupCodes = generateBackupCodes();
        const hashedBackupCodes = plainBackupCodes.map(hashBackupCode);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
          },
        });

        return NextResponse.json({
          success: true,
          backupCodes: plainBackupCodes,
        });
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("[2FA API Error]", error);
    return errorResponse("An unexpected error occurred", 500);
  }
}
