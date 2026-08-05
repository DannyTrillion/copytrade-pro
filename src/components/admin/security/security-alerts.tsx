"use client";

/**
 * Security alert banner for the admin dashboard.
 *
 * The visible half of the "detect, then ask a human" design: the risk engine
 * never restricts anyone, so accounts it considers suspicious have to surface
 * somewhere an administrator will actually see them. This is that surface.
 *
 * Renders nothing when there is nothing to report — a permanently-present
 * "0 alerts" panel trains people to ignore the space it occupies.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldAlert, TriangleAlert } from "lucide-react";

interface AlertSummary {
  flaggedAccounts: number;
  blockedLogins24h: number;
  failedLogins24h: number;
  activeBans: number;
}

interface RecentEvent {
  id: string;
  type: string;
  severity: string;
  reason: string | null;
  email: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

const REFRESH_MS = 60_000;

export function SecurityAlerts() {
  const [stats, setStats] = useState<AlertSummary | null>(null);
  const [events, setEvents] = useState<RecentEvent[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/security?view=overview");
      if (!res.ok) return;

      const data = await res.json();
      setStats(data.stats ?? null);

      // Only genuinely actionable severities belong on the main dashboard.
      setEvents(
        (data.recentEvents ?? []).filter((event: RecentEvent) =>
          ["HIGH", "CRITICAL"].includes(event.severity)
        )
      );
    } catch {
      // Silent: the dashboard must render even if this panel cannot load.
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (!stats) return null;

  const needsAttention = stats.flaggedAccounts > 0 || events.length > 0;
  if (!needsAttention) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-4 border-warning/30"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold text-text-primary">
            Security alerts
          </h3>
        </div>

        <Link
          href="/dashboard/admin/security"
          className="text-2xs text-brand hover:underline inline-flex items-center gap-1"
        >
          Security Center
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {stats.flaggedAccounts > 0 && (
        <Link
          href="/dashboard/admin/security"
          className="flex items-center gap-2.5 p-2.5 rounded-lg bg-warning/10 border border-warning/20 mb-2 hover:bg-warning/15 transition-colors"
        >
          <TriangleAlert className="w-4 h-4 text-warning shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-primary">
              {stats.flaggedAccounts} account
              {stats.flaggedAccounts === 1 ? "" : "s"} flagged for review
            </p>
            <p className="text-2xs text-text-tertiary">
              Flagged by risk scoring — no restrictions have been applied. Review
              and decide.
            </p>
          </div>
        </Link>
      )}

      {events.length > 0 && (
        <div className="space-y-1">
          {events.slice(0, 4).map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-2.5 py-1.5 border-b border-border/40 last:border-0"
            >
              <span
                className={`text-2xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                  event.severity === "CRITICAL"
                    ? "bg-danger text-white"
                    : "bg-danger/10 text-danger"
                }`}
              >
                {event.severity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-text-secondary truncate">
                  {event.type.replace(/_/g, " ").toLowerCase()}
                  {event.reason ? ` — ${event.reason}` : ""}
                </p>
              </div>
              <span className="text-2xs text-text-tertiary truncate max-w-[140px]">
                {event.user?.email ?? event.email ?? "System"}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-2xs text-text-tertiary mt-2.5 pt-2 border-t border-border/50">
        Detection is advisory. No account is ever restricted automatically —
        every ban, suspension and deletion requires an administrator to act.
      </p>
    </motion.div>
  );
}
