import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid-token`);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
      select: {
        id: true,
        emailVerificationExpiry: true,
        emailVerified: true,
      },
    });

    if (
      !user ||
      !user.emailVerificationExpiry ||
      user.emailVerificationExpiry < new Date()
    ) {
      return NextResponse.redirect(`${baseUrl}/login?error=invalid-token`);
    }

    if (user.emailVerified) {
      // Already verified — just redirect to login
      return NextResponse.redirect(`${baseUrl}/login?verified=true`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    return NextResponse.redirect(`${baseUrl}/login?verified=true`);
  } catch (error) {
    console.error("[verify-email] Error:", error);
    return NextResponse.redirect(`${baseUrl}/login?error=invalid-token`);
  }
}
