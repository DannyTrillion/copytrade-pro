import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit: 5 OTP requests per 15 minutes per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateCheck = await checkRateLimit(`otp:${ip}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Check if email is already registered in our system
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in instead." },
        { status: 409 }
      );
    }

    // Use Supabase Auth to send OTP email
    // shouldCreateUser: false prevents Supabase from creating an auth user
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      console.error("[send-otp] Supabase OTP error:", error);
      // Supabase returns an error when shouldCreateUser is false and user doesn't exist
      // This is expected — the OTP is still sent in some configurations
      // If the error is about user not found, we handle it gracefully
      if (error.message?.includes("Signups not allowed")) {
        // OTP won't send if signups are disabled and user doesn't exist
        // Fallback: create a temporary Supabase auth user, then send OTP
        const { error: signupError } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            shouldCreateUser: true,
          },
        });

        if (signupError) {
          console.error("[send-otp] Supabase OTP fallback error:", signupError);
          return NextResponse.json(
            { error: "Failed to send verification code. Please try again." },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Failed to send verification code. Please try again." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: "Verification code sent to your email.",
      expiresIn: 600, // Supabase OTP expires in 10 minutes by default
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[send-otp] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
