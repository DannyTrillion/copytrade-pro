"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Radio,
  Calendar,
  Clock,
  ExternalLink,
  Play,
  Loader2,
  BookOpen,
  Check,
  Users,
} from "lucide-react";
import { TierGate } from "@/components/ui/tier-gate";
import { TIERS } from "@/config/constants";
import { cn } from "@/lib/utils";

interface LiveSession {
  id: string;
  title: string;
  host: string;
  scheduledFor: string;
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

interface ApiResponse {
  live: LiveSession | null;
  upcoming: LiveSession[];
  modules: ClassModule[];
}

function formatSessionTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function countdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Starting now";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `In ${days}d ${hours}h`;
  if (hours > 0) return `In ${hours}h ${mins}m`;
  return `In ${mins}m`;
}

export default function LiveClassesPage() {
  return (
    <TierGate
      required={TIERS.TIER_4}
      featureName="Live Trading Classes"
      description="Diamond members get unlimited access to live trading sessions with master traders, structured curriculum, and 1-on-1 mentorship."
    >
      <LiveClassesContent />
    </TierGate>
  );
}

function LiveClassesContent() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/live-classes")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-section space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="w-5 h-5 text-violet-400" />
          <h1 className="text-lg font-semibold text-text-primary">Live Trading Classes</h1>
        </div>
        <p className="text-sm text-text-tertiary">
          Real-time sessions with master traders. Recordings available after each session.
        </p>
      </motion.div>

      {/* Live now banner */}
      {data?.live && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-danger via-danger to-rose-700 p-6 shadow-lg shadow-danger/30"
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-2xs font-bold backdrop-blur-sm mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE NOW
              </div>
              <h2 className="text-xl font-bold text-white">{data.live.title}</h2>
              <p className="text-sm text-white/80 mt-1">
                Hosted by {data.live.host} · {data.live.durationMinutes} min session
              </p>
            </div>
            {data.live.streamUrl && (
              <a
                href={data.live.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-danger font-semibold text-sm hover:bg-white/90 transition-colors active:scale-95"
              >
                <Radio className="w-4 h-4" />
                Join live session
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </motion.div>
      )}

      {/* Upcoming sessions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-text-secondary" />
          <h2 className="text-sm font-semibold text-text-primary">Upcoming sessions</h2>
        </div>

        {!data?.upcoming || data.upcoming.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center">
            <Calendar className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-tertiary">No upcoming sessions scheduled</p>
            <p className="text-xs text-text-tertiary mt-1">
              New sessions are announced weekly — check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.upcoming.slice(0, 6).map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                className="glass-panel p-4 rounded-2xl hover:ring-1 hover:ring-violet-400/30 transition-all"
              >
                <div className="flex items-start justify-between mb-2 gap-3">
                  <h3 className="text-sm font-semibold text-text-primary leading-snug">
                    {s.title}
                  </h3>
                  <span className="shrink-0 text-2xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400">
                    {countdown(s.scheduledFor)}
                  </span>
                </div>
                <p className="text-xs text-text-tertiary mb-3 line-clamp-2">{s.description}</p>
                <div className="flex items-center justify-between text-2xs text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatSessionTime(s.scheduledFor)} · {s.durationMinutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {s.host}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Curriculum modules */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-text-secondary" />
          <h2 className="text-sm font-semibold text-text-primary">Curriculum library</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(data?.modules ?? []).map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.04 }}
              className={cn(
                "glass-panel p-4 rounded-2xl",
                "hover:ring-1 hover:ring-violet-400/20 transition-all"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-text-primary">{m.title}</h3>
                <span className="text-2xs text-text-tertiary px-1.5 py-0.5 rounded bg-surface-3 shrink-0">
                  {m.duration}
                </span>
              </div>
              <p className="text-xs text-text-tertiary mb-3">{m.description}</p>
              <ul className="space-y-1.5">
                {m.topics.map((t) => (
                  <li key={t} className="flex items-start gap-2 text-xs text-text-secondary">
                    <Check className="w-3 h-3 mt-0.5 text-violet-400 shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled
                className="mt-4 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-500/10 text-violet-400 text-xs font-semibold opacity-60 cursor-not-allowed"
                title="Recordings coming soon"
              >
                <Play className="w-3 h-3" />
                Module recordings — coming soon
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Footer help note */}
      <p className="text-2xs text-text-tertiary text-center pt-2">
        Need a custom session topic? Message your account manager from the Support page.
      </p>
    </div>
  );
}
