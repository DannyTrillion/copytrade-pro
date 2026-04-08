import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { z } from "zod";

const preferencesSchema = z.object({
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  tradingGoal: z.enum(["PASSIVE", "GROWTH", "LEARNING"]).optional(),
  riskTolerance: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  capitalRange: z.enum(["UNDER_500", "500_5000", "OVER_5000"]).optional(),
}).optional();

/**
 * GET — Return onboarding status and preferences
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        onboardingComplete: true,
        experienceLevel: true,
        tradingGoal: true,
        riskTolerance: true,
        capitalRange: true,
      },
    });

    if (!dbUser) return errorResponse("User not found", 404);

    return NextResponse.json({
      onboardingComplete: dbUser.onboardingComplete,
      preferences: {
        experienceLevel: dbUser.experienceLevel,
        tradingGoal: dbUser.tradingGoal,
        riskTolerance: dbUser.riskTolerance,
        capitalRange: dbUser.capitalRange,
      },
    });
  } catch {
    return unauthorizedResponse();
  }
}

/**
 * POST — Save preferences and mark onboarding complete
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const preferences = preferencesSchema.parse(body);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingComplete: true,
        ...(preferences?.experienceLevel && { experienceLevel: preferences.experienceLevel }),
        ...(preferences?.tradingGoal && { tradingGoal: preferences.tradingGoal }),
        ...(preferences?.riskTolerance && { riskTolerance: preferences.riskTolerance }),
        ...(preferences?.capitalRange && { capitalRange: preferences.capitalRange }),
      },
    });

    return NextResponse.json({ success: true, onboardingComplete: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to update onboarding status");
  }
}
