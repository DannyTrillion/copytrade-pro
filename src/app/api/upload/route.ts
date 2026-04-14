import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = [
  // images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  // documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  // audio (voice notes)
  "audio/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/x-m4a",
];

/**
 * POST — Upload file to Supabase Storage
 * Query params: ?folder=chat | proof (default: proof)
 * Returns public URL + metadata
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder") === "chat" ? "chat" : "proof";

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse("Invalid file type", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse("File too large. Maximum size is 15MB", 400);
    }

    // Generate unique file path
    const ext = file.name.split(".").pop() || "bin";
    const filePath = `${folder}/${user.id}/${randomUUID().slice(0, 12)}.${ext}`;

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

    const kind = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("audio/")
      ? "audio"
      : "file";

    return NextResponse.json(
      {
        url: urlData.publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
        kind,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Upload failed");
  }
}
