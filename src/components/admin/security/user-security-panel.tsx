"use client";

/**
 * Per-account security panel.
 *
 * Opened from the shield button beside any account in the admin Users table.
 * Gives an administrator complete authority over a single account in one place:
 * ban, suspend, force-logout, delete, and the evidence behind those decisions
 * (risk signals, devices, login history).
 *
 * Every action routes through /api/admin/security/actions, so it inherits the
 * same server-side guarantees as the Security Center — ADMIN role, Zod
 * validation, mandatory reason, atomic session revocation, full audit trail.
 * Nothing here is a shortcut around the moderation service.
 */

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Fingerprint,
  History,
  Loader2,
  LogOut,
  ShieldCheck,
  ShieldOff,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ReasonDialog } from "./reason-dialog";
import { formatDate } from "@/lib/utils";

interface UserSecurityPanelProps {
  userId: string | null;
  onClose: () => void;
  /** Called after any successful action so the parent can refresh its list. */
  onChanged?: () => void;
}

interface ProfileResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    suspended: boolean;
    bannedAt: string | null;
    deletedAt: string | null;
    createdAt: string;
    lastLoginAt: string | null;
    lastLoginIp: string | null;
    lastLoginCountry: string | null;
    sessionVersion: number;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
  };
  activeEnforcement: {
    id: string;
    type: string;
    reason: string;
    createdAt: string;
    expiresAt: string | null;
  } | null;
  risk: {
    score: number;
    level: string;
    flagged: boolean;
    reviewedAt: string | null;
    signals: Array<{ id: string; rule: string; weight: number; detail: string | null }>;
  } | null;
  devices: Array<{
    id: string;
    browser: string | null;
    os: string | null;
    lastSeenAt: string;
    lastIp: string | null;
    lastCountry: string | null;
    accountCount: number;
    trusted: boolean;
    blocked: boolean;
  }>;
  logins: Array<{
    id: string;
    success: boolean;
    failureReason: string | null;
    ip: string | null;
    city: string | null;
    country: string | null;
    browser: string | null;
    createdAt: string;
  }>;
  error?: string;
}

type PendingAction =
  | { kind: "ban" }
  | { kind: "suspend" }
  | { kind: "lift"; enforcementId: string }
  | { kind: "revoke" }
  | { kind: "delete" };

export function UserSecurityPanel({
  userId,
  onClose,
  onChanged,
}: UserSecurityPanelProps) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/security?view=user-profile&userId=${encodeURIComponent(userId)}`
      );
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to load");
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) load();
    else setProfile(null);
  }, [userId, load]);

  const runAction = async (reason: string) => {
    if (!pending || !profile) return;

    const payloads: Record<PendingAction["kind"], Record<string, unknown>> = {
      ban: {
        action: "banUser",
        userId: profile.user.id,
        type: "BAN",
        reason,
        blacklistEmail: true,
        blacklistDevices: true,
      },
      suspend: {
        action: "banUser",
        userId: profile.user.id,
        type: "SUSPENSION",
        reason,
        blacklistEmail: false,
      },
      lift: {
        action: "liftEnforcement",
        enforcementId: pending.kind === "lift" ? pending.enforcementId : "",
        reason,
        clearIdentifiers: true,
      },
      revoke: { action: "revokeSessions", userId: profile.user.id, reason },
      delete: {
        action: "deleteUser",
        userId: profile.user.id,
        reason,
        blacklistIdentifiers: true,
      },
    };

    const res = await fetch("/api/admin/security/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloads[pending.kind]),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Action failed");

    await load();
    onChanged?.();
  };

  const dialogCopy = (): {
    title: string;
    description: string;
    confirmLabel: string;
    destructive: boolean;
  } | null => {
    if (!pending || !profile) return null;
    const who = profile.user.email;

    switch (pending.kind) {
      case "ban":
        return {
          title: "Ban account",
          description: `Permanently bans ${who}, revokes every active session immediately, and blacklists their email and known devices so the identity cannot re-register.`,
          confirmLabel: "Ban account",
          destructive: true,
        };
      case "suspend":
        return {
          title: "Suspend account",
          description: `Temporarily blocks ${who} and ends their active sessions. The account and its data are preserved, and the suspension can be lifted at any time.`,
          confirmLabel: "Suspend account",
          destructive: true,
        };
      case "lift":
        return {
          title: "Lift enforcement",
          description: `Restores full access for ${who} and clears the identifier blacklist entries created by this action. The original record stays in the audit trail.`,
          confirmLabel: "Restore access",
          destructive: false,
        };
      case "revoke":
        return {
          title: "Force logout",
          description: `Immediately invalidates every active session for ${who} on all devices. They can sign in again straight away — this does not restrict the account.`,
          confirmLabel: "Force logout",
          destructive: false,
        };
      case "delete":
        return {
          title: "Delete account",
          description: `Anonymises ${who} and permanently revokes access. Financial and audit records are retained as required; a hashed tombstone keeps the identity blocked from re-registering. This cannot be undone.`,
          confirmLabel: "Delete account",
          destructive: true,
        };
    }
  };

  const copy = dialogCopy();
  const user = profile?.user;
  const isAdmin = user?.role === "ADMIN";

  return (
    <>
      <Modal
        isOpen={userId !== null && pending === null}
        onClose={onClose}
        title="Account security"
        size="lg"
      >
        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
          </div>
        ) : error ? (
          <p className="text-sm text-danger py-8 text-center">{error}</p>
        ) : profile && user ? (
          <div className="space-y-4">
            {/* Identity + state */}
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-text-primary">{user.name}</p>
                <p className="text-xs text-text-tertiary">{user.email}</p>
                <p className="text-2xs text-text-tertiary mt-1">
                  {user.role} · joined {formatDate(user.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <StateBadge
                  ok={!user.bannedAt && !user.suspended && !user.deletedAt}
                  label={
                    user.deletedAt
                      ? "Deleted"
                      : user.bannedAt
                        ? "Banned"
                        : user.suspended
                          ? "Suspended"
                          : "Active"
                  }
                />
                <StateBadge ok={user.emailVerified} label="Email verified" />
                <StateBadge ok={user.twoFactorEnabled} label="2FA" />
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-2.5 p-3 rounded-lg bg-info/10 border border-info/20">
                <ShieldCheck className="w-4 h-4 text-info shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  This is an administrator account. Administrators are exempt from
                  automated IP, device and identifier blocking so a bad rule can
                  never lock the platform out. The last active admin cannot be
                  banned or deleted.
                </p>
              </div>
            )}

            {profile.activeEnforcement && (
              <div className="flex gap-2.5 p-3 rounded-lg bg-danger/10 border border-danger/20">
                <Ban className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-primary">
                    {profile.activeEnforcement.type} in effect since{" "}
                    {formatDate(profile.activeEnforcement.createdAt)}
                  </p>
                  <p className="text-2xs text-text-tertiary mt-0.5">
                    {profile.activeEnforcement.reason}
                  </p>
                </div>
              </div>
            )}

            {/* Risk — advisory only */}
            <section>
              <h4 className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1.5">
                <TriangleAlert className="w-3.5 h-3.5 text-warning" />
                Risk assessment
              </h4>

              {profile.risk ? (
                <div className="glass-panel p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold tabular-nums text-text-primary">
                      {profile.risk.score}
                      <span className="text-2xs text-text-tertiary">/100</span>
                    </span>
                    <span className="text-xs text-text-secondary">
                      {profile.risk.level}
                    </span>
                    {profile.risk.flagged && (
                      <span className="text-2xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                        Flagged for review
                      </span>
                    )}
                  </div>

                  {profile.risk.signals.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {profile.risk.signals.map((signal) => (
                        <span
                          key={signal.id}
                          title={signal.detail ?? undefined}
                          className="text-2xs px-1.5 py-0.5 rounded bg-surface-2 text-text-tertiary"
                        >
                          {signal.rule.replace(/_/g, " ").toLowerCase()} +{signal.weight}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-2xs text-text-tertiary pt-1 border-t border-border/50">
                    Advisory only — a score never restricts an account on its own.
                    Every restriction below requires your explicit action.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-text-tertiary">
                  No risk score yet. Scores are computed after the account signs in.
                </p>
              )}
            </section>

            {/* Devices */}
            <section>
              <h4 className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-text-tertiary" />
                Devices ({profile.devices.length})
              </h4>

              {profile.devices.length === 0 ? (
                <p className="text-xs text-text-tertiary">No devices recorded.</p>
              ) : (
                <div className="space-y-1">
                  {profile.devices.slice(0, 5).map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-border/40 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-text-secondary truncate">
                          {device.browser ?? "Unknown"} · {device.os ?? "Unknown OS"}
                        </p>
                        <p className="text-2xs text-text-tertiary">
                          {device.lastCountry ?? "—"} · {device.lastIp ?? "—"} ·{" "}
                          {formatDate(device.lastSeenAt)}
                        </p>
                      </div>
                      {device.accountCount > 1 && (
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-warning/10 text-warning whitespace-nowrap">
                          {device.accountCount} accounts
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Login history */}
            <section>
              <h4 className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-text-tertiary" />
                Recent logins
              </h4>

              {profile.logins.length === 0 ? (
                <p className="text-xs text-text-tertiary">No login history.</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {profile.logins.slice(0, 8).map((login) => (
                    <div
                      key={login.id}
                      className="flex items-center justify-between gap-3 text-2xs py-1"
                    >
                      <span
                        className={login.success ? "text-success" : "text-danger"}
                      >
                        {login.success ? "Success" : (login.failureReason ?? "Failed")}
                      </span>
                      <span className="text-text-tertiary truncate flex-1">
                        {login.ip ?? "—"} ·{" "}
                        {[login.city, login.country].filter(Boolean).join(", ") || "—"}
                      </span>
                      <span className="text-text-tertiary whitespace-nowrap">
                        {formatDate(login.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Actions */}
            <div className="pt-3 border-t border-border">
              <p className="text-2xs text-text-tertiary mb-2">
                Administrator actions — each requires a written reason and is
                recorded permanently in the audit trail.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPending({ kind: "revoke" })}
                  className="btn-secondary btn-sm inline-flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Force logout
                </button>

                {profile.activeEnforcement ? (
                  <button
                    onClick={() =>
                      setPending({
                        kind: "lift",
                        enforcementId: profile.activeEnforcement!.id,
                      })
                    }
                    className="btn-success btn-sm inline-flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Restore access
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setPending({ kind: "suspend" })}
                      className="btn-secondary btn-sm inline-flex items-center gap-1.5 text-warning"
                    >
                      <ShieldOff className="w-3.5 h-3.5" />
                      Suspend
                    </button>
                    <button
                      onClick={() => setPending({ kind: "ban" })}
                      className="btn-danger btn-sm inline-flex items-center gap-1.5"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Ban permanently
                    </button>
                  </>
                )}

                {!user.deletedAt && (
                  <button
                    onClick={() => setPending({ kind: "delete" })}
                    className="btn-ghost btn-sm inline-flex items-center gap-1.5 text-danger"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>

              {isAdmin && (
                <p className="text-2xs text-warning mt-2 inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  Restricting an administrator will be refused if they are the last
                  active one.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {copy && (
        <ReasonDialog
          isOpen={pending !== null}
          onClose={() => setPending(null)}
          onConfirm={runAction}
          title={copy.title}
          description={copy.description}
          confirmLabel={copy.confirmLabel}
          destructive={copy.destructive}
        />
      )}
    </>
  );
}

function StateBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`text-2xs px-2 py-0.5 rounded-full font-medium ${
        ok ? "text-success bg-success/10" : "text-danger bg-danger/10"
      }`}
    >
      {label}
    </span>
  );
}
