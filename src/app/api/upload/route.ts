import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

/**
 * POST — Upload proof of payment to Supabase Storage
 * Returns the public URL of the uploaded file
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse("Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse("File too large. Maximum size is 5MB", 400);
    }

    // Generate unique file path
    const ext = file.name.split(".").pop() || "bin";
    const filePath = `${user.id}/${randomUUID().slice(0, 8)}.${ext}`;

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return errorResponse(`Upload failed: ${uploadError.message}`, 500);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Upload failed");
  }
}
