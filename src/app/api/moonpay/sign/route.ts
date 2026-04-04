import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";

/**
 * GET — Sign a MoonPay widget URL with HMAC-SHA256
 * Required when pre-filling walletAddress to prevent tampering
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return errorResponse("Missing url parameter", 400);
    }

    const secretKey = process.env.MOONPAY_SECRET_KEY;
    if (!secretKey) {
      return errorResponse("MoonPay secret key not configured", 500);
    }

    const parsedUrl = new URL(url);
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(parsedUrl.search)
      .digest("base64");

    return NextResponse.json({ signature });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to sign URL");
  }
}
