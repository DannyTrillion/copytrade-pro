import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";

/**
 * GET — Return the current user's onboarding status
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { onboardingComplete: true },
    });

    if (!dbUser) {
      return errorResponse("User not found", 404);
    }

    return NextResponse.json({ onboardingComplete: dbUser.onboardingComplete });
  } catch {
    return unauthorizedResponse();
  }
}

/**
 * POST — Mark the current user's onboarding as complete
 */
export async function POST() {
  try {
    const user = await requireAuth();

    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingComplete: true },
    });

    return NextResponse.json({ success: true, onboardingComplete: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to update onboarding status");
  }
}
