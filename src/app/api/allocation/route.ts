import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";
import { getAllocationSummary } from "@/lib/allocation";

export async function GET() {
  try {
    const user = await requireAuth();
    const summary = await getAllocationSummary(user.id);
    return NextResponse.json(summary);
  } catch {
    return unauthorizedResponse();
  }
}
