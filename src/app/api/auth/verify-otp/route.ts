import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code must be 6 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = schema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();

    // Use Supabase Auth to verify the OTP
    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: code,
      type: "email",
    });

    if (error) {
      console.error("[verify-otp] Supabase error:", error);

      if (error.message?.includes("Token has expired")) {
        return NextResponse.json(
          { error: "Verification code has expired. Please request a new one." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Invalid verification code. Please try again." },
        { status: 400 }
      );
    }

    // Record the verification in our DB so the signup route can confirm it
    // Clean up any previous records for this email first
    await prisma.emailOtp.deleteMany({
      where: { email: normalizedEmail },
    });

    await prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        code: "SUPABASE_VERIFIED",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min to complete signup
        verified: true,
      },
    });

    // Sign out the Supabase auth session since we use NextAuth for our app sessions
    await supabase.auth.signOut();

    return NextResponse.json({
      verified: true,
      email: normalizedEmail,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[verify-otp] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
