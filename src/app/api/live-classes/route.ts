import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse, errorResponse } from "@/lib/auth";
import { userMeetsTier, TIERS } from "@/lib/tier-guard";

interface LiveSession {
  id: string;
  title: string;
  host: string;
  scheduledFor: string; // ISO
  durationMinutes: number;
  description: string;
  streamUrl?: string | null;
  status: "scheduled" | "live" | "ended";
}

interface ClassModule {
  id: string;
  title: string;
  duration: string;
  description: string;
  topics: string[];
}

// Fallback curriculum shown when admin hasn't configured anything yet.
const DEFAULT_MODULES: ClassModule[] = [
  {
    id: "fundamentals",
    title: "Market Fundamentals",
    duration: "4 hours",
    description: "Core concepts every serious trader needs to internalize.",
    topics: ["Order types & execution", "Reading the tape", "Liquidity & slippage", "Risk per trade"],
  },
  {
    id: "technical",
    title: "Technical Analysis Deep Dive",
    duration: "6 hours",
    description: "Pattern recognition, multi-timeframe analysis, and confluence.",
    topics: ["Support / resistance frameworks", "Smart money concepts", "Multi-TF confirmation", "Trade entry models"],
  },
  {
    id: "psychology",
    title: "Trading Psychology",
    duration: "3 hours",
    description: "The mental game that separates pros from amateurs.",
    topics: ["Discipline frameworks", "Loss recovery", "Position sizing rules", "Journaling habits"],
  },
  {
    id: "portfolio",
    title: "Long-Term Portfolio Construction",
    duration: "5 hours",
    description: "Build resilient portfolios with proper allocation and rebalancing.",
    topics: ["Asset correlation", "Rebalancing cadence", "Drawdown management", "Tax efficiency"],
  },
];

export async function GET() {
  try {
    const user = await requireAuth();

    if (!(await userMeetsTier(user.id, TIERS.TIER_4))) {
      return errorResponse("Diamond tier required", 403);
    }

    // Sessions stored as JSON under AdminConfig key "live_classes_sessions"
    const sessionsConfig = await prisma.adminConfig.findUnique({
      where: { key: "live_classes_sessions" },
    });
    const modulesConfig = await prisma.adminConfig.findUnique({
      where: { key: "live_classes_modules" },
    });
    const liveStreamConfig = await prisma.adminConfig.findUnique({
      where: { key: "live_classes_stream_url" },
    });

    let sessions: LiveSession[] = [];
    if (sessionsConfig?.value) {
      try {
        sessions = JSON.parse(sessionsConfig.value);
      } catch {
        sessions = [];
      }
    }

    // Derive status from scheduledFor + duration
    const now = Date.now();
    sessions = sessions.map((s) => {
      const start = new Date(s.scheduledFor).getTime();
      const end = start + s.durationMinutes * 60_000;
      const status: LiveSession["status"] = now < start ? "scheduled" : now <= end ? "live" : "ended";
      return { ...s, status, streamUrl: status === "live" ? s.streamUrl || liveStreamConfig?.value || null : null };
    });

    let modules: ClassModule[] = DEFAULT_MODULES;
    if (modulesConfig?.value) {
      try {
        const parsed = JSON.parse(modulesConfig.value);
        if (Array.isArray(parsed) && parsed.length > 0) modules = parsed;
      } catch {
        /* keep defaults */
      }
    }

    const upcoming = sessions
      .filter((s) => s.status !== "ended")
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

    return NextResponse.json({
      live: upcoming.find((s) => s.status === "live") || null,
      upcoming: upcoming.filter((s) => s.status === "scheduled"),
      modules,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to load live classes");
  }
}
