"use client";

/**
 * Security Center.
 *
 * Single admin surface for moderation, network/identity blacklists, device
 * trust, login history, the security event trail and the risk review queue.
 *
 * Every mutation routes through `/api/admin/security/actions`, which enforces
 * ADMIN role, Zod validation and a mandatory written reason server-side. The
 * dialogs here surface those requirements; they do not implement them.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Ban,
  Download,
  Fingerprint,
  Globe,
  History,
  Loader2,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserX,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Modal } from "@/components/ui/modal";
import { ReasonDialog } from "@/components/admin/security/reason-dialog";
import {
  AllowlistTable,
  BannedIpsTable,
  BannedUsersTable,
  DevicesTable,
  EventsTable,
  IdentifiersTable,
  LoginHistoryTable,
  Pill,
  RiskQueueTable,
} from "@/components/admin/security/security-tables";
import type {
  AllowlistRow,
  BannedIdentifierRow,
  BannedIpRow,
  BannedUserRow,
  DeviceRow,
  LoginAttemptRow,
  OverviewResponse,
  PageMeta,
  RiskRow,
  SecurityEventRow,
  SecurityTab,
} from "@/components/admin/security/types";
import { SECURITY_PAGE_SIZE } from "@/config/security";
import { formatDate } from "@/lib/utils";

const TABS: Array<{ id: SecurityTab; label: string; icon: typeof Shield }> = [
  { id: "overview", label: "Overview", icon: Shield },
  { id: "banned-users", label: "Moderation", icon: UserX },
  { id: "banned-ips", label: "IP Blacklist", icon: Globe },
  { id: "banned-identifiers", label: "Identifiers", icon: Fingerprint },
  { id: "allowlist", label: "Allowlist", icon: ShieldCheck },
  { id: "devices", label: "Devices", icon: Fingerprint },
  { id: "login-history", label: "Login History", icon: History },
  { id: "events", label: "Events", icon: Activity },
  { id: "risk-queue", label: "Risk Queue", icon: TriangleAlert },
];

/** Which tabs offer a server-side CSV export, and under which view key. */
const EXPORTABLE: Partial<Record<SecurityTab, string>> = {
  "banned-users": "banned-users",
  "banned-ips": "banned-ips",
  "login-history": "login-history",
  events: "events",
};

const STATUS_FILTERS: Partial<Record<SecurityTab, string[]>> = {
  "banned-users": ["ALL", "ACTIVE", "LIFTED", "EXPIRED"],
  "banned-ips": ["ALL", "ACTIVE", "LIFTED", "EXPIRED"],
  "banned-identifiers": ["ALL", "ACTIVE", "LIFTED", "EXPIRED"],
  "login-history": ["ALL", "SUCCESS", "FAILED"],
  events: ["ALL", "INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
};

type ActionKind =
  | { kind: "liftEnforcement"; row: BannedUserRow }
  | { kind: "deleteUser"; row: BannedUserRow }
  | { kind: "liftIpBan"; row: BannedIpRow }
  | { kind: "liftIdentifier"; row: BannedIdentifierRow }
  | { kind: "removeAllowlist"; row: AllowlistRow }
  | { kind: "deviceTrust"; row: DeviceRow; action: "TRUST" | "UNTRUST" | "BLOCK" | "UNBLOCK" }
  | { kind: "banUser"; userId: string; label: string }
  | { kind: "reviewRisk"; row: RiskRow; outcome: "CLEAR" | "ESCALATE" };

export default function SecurityCenterPage() {
  const [tab, setTab] = useState<SecurityTab>("overview");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [rows, setRows] = useState<unknown[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);

  const [action, setAction] = useState<ActionKind | null>(null);
  const [banIpOpen, setBanIpOpen] = useState(false);
  const [allowlistOpen, setAllowlistOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  // Debounce search so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        view: tab,
        page: String(page),
        pageSize: String(SECURITY_PAGE_SIZE),
      });
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (status && status !== "ALL") params.set("status", status);

      const res = await fetch(`/api/admin/security?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load security data");
      }

      const data = await res.json();

      if (tab === "overview") {
        setOverview(data as OverviewResponse);
        setRows([]);
        setMeta(null);
      } else {
        setRows(data.rows ?? []);
        setMeta(data.meta ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load security data");
    } finally {
      setLoading(false);
    }
  }, [tab, page, debouncedQuery, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const post = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/admin/security/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Action failed");

      await fetchData();
      return body;
    },
    [fetchData]
  );

  const handleTabChange = (next: SecurityTab) => {
    setTab(next);
    setPage(1);
    setStatus("ALL");
    setQuery("");
    setDebouncedQuery("");
  };

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const body = await post({ action: "recomputeRisk" });
      const result = body?.result ?? {};
      setToast(
        `Scored ${result.processed ?? 0} active accounts — ${result.flagged ?? 0} flagged`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recompute failed");
    } finally {
      setRecomputing(false);
    }
  };

  const handleExport = () => {
    const view = EXPORTABLE[tab];
    if (!view) return;
    // Full-server export — deliberately not limited to the loaded page.
    window.location.href = `/api/admin/security/export?view=${view}`;
  };

  const runAction = useCallback(
    async (reason: string) => {
      if (!action) return;

      switch (action.kind) {
        case "liftEnforcement":
          await post({
            action: "liftEnforcement",
            enforcementId: action.row.id,
            reason,
            clearIdentifiers: true,
          });
          setToast("Enforcement lifted");
          break;

        case "deleteUser":
          await post({
            action: "deleteUser",
            userId: action.row.userId,
            reason,
            blacklistIdentifiers: true,
          });
          setToast("Account deleted and anonymised");
          break;

        case "liftIpBan":
          await post({ action: "liftIpBan", id: action.row.id, reason });
          setToast("Address removed from blacklist");
          break;

        case "liftIdentifier":
          await post({ action: "liftIdentifier", id: action.row.id, reason });
          setToast("Identifier removed from blacklist");
          break;

        case "removeAllowlist":
          await post({ action: "removeAllowlist", id: action.row.id, reason });
          setToast("Allowlist entry removed");
          break;

        case "deviceTrust":
          await post({
            action: "deviceTrust",
            deviceRecordId: action.row.id,
            operation: action.action,
            reason,
          });
          setToast("Device updated");
          break;

        case "banUser":
          await post({
            action: "banUser",
            userId: action.userId,
            type: "BAN",
            reason,
            blacklistEmail: true,
          });
          setToast("User banned and sessions revoked");
          break;

        case "reviewRisk":
          await post({
            action: "reviewRisk",
            userId: action.row.userId,
            outcome: action.outcome,
            reason,
          });
          setToast(
            action.outcome === "CLEAR"
              ? "Account cleared and removed from the queue"
              : "Account escalated for a second opinion"
          );
          break;
      }
    },
    [action, post]
  );

  const dialogCopy = useMemo(() => {
    if (!action) return null;

    switch (action.kind) {
      case "liftEnforcement":
        return {
          title: "Lift enforcement",
          description: `Restores access for ${action.row.user.email}. Identifier blacklist entries created by this ban will also be cleared. The original record is retained in the audit trail.`,
          confirmLabel: "Lift enforcement",
          destructive: false,
        };
      case "deleteUser":
        return {
          title: "Delete account",
          description: `Permanently anonymises ${action.row.user.email} and revokes all access. Financial and audit records are retained by design; a hashed tombstone keeps the identity blocked from re-registering. This cannot be undone.`,
          confirmLabel: "Delete account",
          destructive: true,
        };
      case "liftIpBan":
        return {
          title: "Remove IP ban",
          description: `Traffic from ${action.row.ip} will be permitted again.`,
          confirmLabel: "Remove ban",
          destructive: false,
        };
      case "liftIdentifier":
        return {
          title: "Remove identifier ban",
          description: `${action.row.valueHint ?? "This identifier"} will be able to register again.`,
          confirmLabel: "Remove ban",
          destructive: false,
        };
      case "removeAllowlist":
        return {
          title: "Remove from allowlist",
          description: `${action.row.valueHint ?? action.row.ip ?? "This entry"} will no longer bypass blacklist checks.`,
          confirmLabel: "Remove entry",
          destructive: true,
        };
      case "deviceTrust":
        return {
          title: `${action.action.charAt(0)}${action.action.slice(1).toLowerCase()} device`,
          description: `Applies to ${action.row.user.email}'s ${action.row.browser ?? "device"} on ${action.row.os ?? "unknown OS"}.`,
          confirmLabel: action.action.charAt(0) + action.action.slice(1).toLowerCase(),
          destructive: action.action === "BLOCK",
        };
      case "reviewRisk":
        return {
          title:
            action.outcome === "CLEAR" ? "Clear risk flag" : "Escalate for review",
          description:
            action.outcome === "CLEAR"
              ? `Records that you reviewed ${action.row.user.email} (score ${action.row.score}) and found no action necessary. The score itself is behavioural and will keep recomputing; if it later crosses the threshold again the account returns to this queue.`
              : `Keeps ${action.row.user.email} flagged at score ${action.row.score} and records your note for whoever picks it up next.`,
          confirmLabel: action.outcome === "CLEAR" ? "Clear flag" : "Escalate",
          destructive: false,
        };
      case "banUser":
        return {
          title: "Ban user",
          description: `Permanently bans ${action.label}, revokes every active session immediately, and blacklists the account email against re-registration.`,
          confirmLabel: "Ban user",
          destructive: true,
        };
    }
  }, [action]);

  const statusOptions = STATUS_FILTERS[tab];
  const showSearch = tab !== "overview";

  return (
    <div className="dashboard-section">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-start justify-between gap-3"
      >
        <div>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brand" />
            Security Center
          </h2>
          <p className="text-sm text-text-tertiary mt-0.5">
            Moderation, access enforcement, and the platform security trail
          </p>
        </div>

        <div className="flex gap-2">
          {tab === "banned-ips" && (
            <button onClick={() => setBanIpOpen(true)} className="btn-danger btn-sm">
              Blacklist address
            </button>
          )}
          {tab === "risk-queue" && (
            <button
              onClick={handleRecompute}
              disabled={recomputing}
              className="btn-primary btn-sm inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {recomputing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Recompute scores
            </button>
          )}
          {tab === "allowlist" && (
            <button
              onClick={() => setAllowlistOpen(true)}
              className="btn-primary btn-sm"
            >
              Add trusted entry
            </button>
          )}
          {EXPORTABLE[tab] && (
            <button
              onClick={handleExport}
              className="btn-secondary btn-sm inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              tab === id
                ? "bg-brand text-white"
                : "text-text-tertiary hover:text-text-primary hover:bg-surface-2"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </motion.div>

      {/* Filters */}
      {showSearch && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email, name, address or reason..."
              className="input-field pl-9 w-full text-sm"
            />
          </div>

          {statusOptions && (
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="input-field text-sm appearance-none cursor-pointer min-w-[160px]"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "All statuses" : option}
                </option>
              ))}
            </select>
          )}
        </motion.div>
      )}

      {error && (
        <div className="glass-panel px-4 py-3 border-danger/30">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="glass-panel py-16 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
        </div>
      ) : tab === "overview" ? (
        <OverviewPanel data={overview} />
      ) : (
        <>
          {tab === "banned-users" && (
            <BannedUsersTable
              rows={rows as BannedUserRow[]}
              onLift={(row) => setAction({ kind: "liftEnforcement", row })}
              onDelete={(row) => setAction({ kind: "deleteUser", row })}
            />
          )}
          {tab === "banned-ips" && (
            <BannedIpsTable
              rows={rows as BannedIpRow[]}
              onLift={(row) => setAction({ kind: "liftIpBan", row })}
            />
          )}
          {tab === "banned-identifiers" && (
            <IdentifiersTable
              rows={rows as BannedIdentifierRow[]}
              onLift={(row) => setAction({ kind: "liftIdentifier", row })}
            />
          )}
          {tab === "risk-queue" && (
            <button
              onClick={handleRecompute}
              disabled={recomputing}
              className="btn-primary btn-sm inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {recomputing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Recompute scores
            </button>
          )}
          {tab === "allowlist" && (
            <AllowlistTable
              rows={rows as AllowlistRow[]}
              onRemove={(row) => setAction({ kind: "removeAllowlist", row })}
            />
          )}
          {tab === "devices" && (
            <DevicesTable
              rows={rows as DeviceRow[]}
              onAction={(row, deviceAction) =>
                setAction({ kind: "deviceTrust", row, action: deviceAction })
              }
            />
          )}
          {tab === "login-history" && (
            <LoginHistoryTable rows={rows as LoginAttemptRow[]} />
          )}
          {tab === "events" && <EventsTable rows={rows as SecurityEventRow[]} />}
          {tab === "risk-queue" && (
            <RiskQueueTable
              rows={rows as RiskRow[]}
              onBan={(row) =>
                setAction({
                  kind: "banUser",
                  userId: row.userId,
                  label: row.user.email,
                })
              }
              onReview={(row, outcome) =>
                setAction({ kind: "reviewRisk", row, outcome })
              }
            />
          )}

          {meta && meta.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-tertiary">
                {meta.total.toLocaleString()} records · page {meta.page} of {meta.pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={meta.page <= 1}
                  className="btn-secondary btn-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={meta.page >= meta.pages}
                  className="btn-secondary btn-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {dialogCopy && (
        <ReasonDialog
          isOpen={action !== null}
          onClose={() => setAction(null)}
          onConfirm={runAction}
          title={dialogCopy.title}
          description={dialogCopy.description}
          confirmLabel={dialogCopy.confirmLabel}
          destructive={dialogCopy.destructive}
        />
      )}

      <BanIpDialog
        isOpen={banIpOpen}
        onClose={() => setBanIpOpen(false)}
        onSubmit={async (ip, reason, expiresAt) => {
          await post({ action: "banIp", ip, reason, expiresAt });
          setToast("Address blacklisted");
        }}
      />

      <AllowlistDialog
        isOpen={allowlistOpen}
        onClose={() => setAllowlistOpen(false)}
        onSubmit={async (kind, value, reason) => {
          await post({ action: "addAllowlist", kind, value, reason });
          setToast("Allowlist entry added");
        }}
      />

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50 glass-panel-elevated px-4 py-3 flex items-center gap-2"
        >
          <ShieldCheck className="w-4 h-4 text-success" />
          <p className="text-sm text-text-primary">{toast}</p>
        </motion.div>
      )}
    </div>
  );
}

function OverviewPanel({ data }: { data: OverviewResponse | null }) {
  if (!data) return null;

  const { stats, recentEvents } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Active Bans"
          value={String(stats.activeBans)}
          numericValue={stats.activeBans}
          icon={Ban}
          iconColor="text-danger"
          delay={0}
        />
        <StatCard
          title="Suspensions"
          value={String(stats.activeSuspensions)}
          numericValue={stats.activeSuspensions}
          icon={UserX}
          iconColor="text-warning"
          delay={0.04}
        />
        <StatCard
          title="Blacklisted IPs"
          value={String(stats.bannedIps)}
          numericValue={stats.bannedIps}
          icon={Globe}
          iconColor="text-danger"
          delay={0.08}
        />
        <StatCard
          title="Flagged Accounts"
          value={String(stats.flaggedAccounts)}
          numericValue={stats.flaggedAccounts}
          icon={TriangleAlert}
          iconColor="text-warning"
          delay={0.12}
        />
        <StatCard
          title="Failed Logins (24h)"
          value={String(stats.failedLogins24h)}
          numericValue={stats.failedLogins24h}
          icon={History}
          iconColor="text-info"
          delay={0.16}
        />
        <StatCard
          title="Blocked Attempts (24h)"
          value={String(stats.blockedLogins24h)}
          numericValue={stats.blockedLogins24h}
          icon={Shield}
          iconColor="text-brand"
          delay={0.2}
        />
        <StatCard
          title="Tracked Devices"
          value={String(stats.totalDevices)}
          numericValue={stats.totalDevices}
          icon={Fingerprint}
          iconColor="text-accent"
          delay={0.24}
        />
        <StatCard
          title="Shared Devices"
          value={String(stats.sharedDevices)}
          numericValue={stats.sharedDevices}
          icon={Fingerprint}
          iconColor="text-warning"
          delay={0.28}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel p-4"
      >
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Recent security events
        </h3>

        {recentEvents.length === 0 ? (
          <p className="text-sm text-text-tertiary py-6 text-center">
            No security events recorded yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
              >
                <Pill
                  label={event.severity}
                  styles={{
                    INFO: "text-text-tertiary bg-surface-2",
                    LOW: "text-info bg-info/10",
                    MEDIUM: "text-warning bg-warning/10",
                    HIGH: "text-danger bg-danger/10",
                    CRITICAL: "text-white bg-danger",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-primary truncate">
                    {event.type.replace(/_/g, " ")}
                    {event.reason ? ` — ${event.reason}` : ""}
                  </p>
                  <p className="text-2xs text-text-tertiary truncate">
                    {event.user?.email ?? event.email ?? "System"}
                    {event.ip ? ` · ${event.ip}` : ""}
                    {event.country ? ` · ${event.country}` : ""}
                  </p>
                </div>
                <p className="text-2xs text-text-tertiary whitespace-nowrap">
                  {formatDate(event.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function BanIpDialog({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ip: string, reason: string, expiresAt?: string) => Promise<void>;
}) {
  const [ip, setIp] = useState("");
  const [expiry, setExpiry] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIp("");
      setExpiry("");
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(
        ip.trim(),
        reason.trim(),
        expiry ? new Date(expiry).toISOString() : undefined
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to blacklist address");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Blacklist an address" size="md">
      <div className="space-y-4">
        <div className="flex gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <TriangleAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-relaxed">
            Residential addresses are dynamic and often shared behind carrier NAT.
            Blacklisting one can lock out uninvolved people who later receive it —
            prefer setting an expiry unless you are blocking known infrastructure.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Address or CIDR range
          </label>
          <input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="203.0.113.42, 2001:db8::1, or 203.0.113.0/24"
            className="input-field w-full text-sm font-mono"
            autoFocus
          />
          <p className="text-2xs text-text-tertiary mt-1">
            IPv4 and IPv6 both supported, single addresses or CIDR blocks
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Expires (optional)
          </label>
          <input
            type="datetime-local"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="input-field w-full text-sm"
          />
          <p className="text-2xs text-text-tertiary mt-1">
            Leave empty for a permanent block
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Reason <span className="text-danger">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="input-field w-full text-sm resize-none"
            placeholder="Why is this address being blocked?"
          />
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !ip.trim() || reason.trim().length < 10}
            className="btn-danger btn-sm disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Blacklist address
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AllowlistDialog({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (kind: string, value: string, reason: string) => Promise<void>;
}) {
  const [kind, setKind] = useState("EMAIL");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKind("EMAIL");
      setValue("");
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(kind, value.trim(), reason.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add entry");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add trusted entry" size="md">
      <div className="space-y-4">
        <div className="flex gap-3 p-3 rounded-lg bg-info/10 border border-info/20">
          <ShieldCheck className="w-4 h-4 text-info shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-relaxed">
            Allowlist entries are evaluated before every blacklist check. Use this for
            staff accounts, office addresses and known-good infrastructure so an
            over-broad rule cannot lock your own team out.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Type
          </label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="input-field w-full text-sm cursor-pointer"
          >
            <option value="EMAIL">Email address</option>
            <option value="PHONE">Phone number</option>
            <option value="DEVICE">Device fingerprint</option>
            <option value="KYC">IP address or document ID</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Value
          </label>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input-field w-full text-sm font-mono"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Reason <span className="text-danger">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="input-field w-full text-sm resize-none"
            placeholder="Why is this entry trusted?"
          />
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !value.trim() || reason.trim().length < 10}
            className="btn-primary btn-sm disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Add entry
          </button>
        </div>
      </div>
    </Modal>
  );
}
