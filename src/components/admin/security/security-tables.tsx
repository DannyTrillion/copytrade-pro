"use client";

/**
 * Presentational table components for the Security Center.
 *
 * Split out from the page so each view stays readable and so the page owns
 * only data fetching and action dispatch. All of these are pure — they render
 * rows and raise callbacks; none of them fetch or mutate.
 */

import { motion } from "framer-motion";
import {
  Ban,
  Globe,
  Laptop,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Users,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type {
  AllowlistRow,
  BannedIdentifierRow,
  BannedIpRow,
  BannedUserRow,
  DeviceRow,
  LoginAttemptRow,
  RiskRow,
  SecurityEventRow,
} from "./types";

const SEVERITY_STYLES: Record<string, string> = {
  INFO: "text-text-tertiary bg-surface-2",
  LOW: "text-info bg-info/10",
  MEDIUM: "text-warning bg-warning/10",
  HIGH: "text-danger bg-danger/10",
  CRITICAL: "text-white bg-danger",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "text-danger bg-danger/10",
  LIFTED: "text-success bg-success/10",
  EXPIRED: "text-text-tertiary bg-surface-2",
};

const RISK_STYLES: Record<string, string> = {
  LOW: "text-success bg-success/10",
  MEDIUM: "text-warning bg-warning/10",
  HIGH: "text-danger bg-danger/10",
  CRITICAL: "text-white bg-danger",
};

export function Pill({
  label,
  styles,
}: {
  label: string;
  styles: Record<string, string>;
}) {
  return (
    <span
      className={`inline-flex items-center text-2xs px-2 py-0.5 rounded-full font-medium ${
        styles[label] ?? "text-text-tertiary bg-surface-2"
      }`}
    >
      {label}
    </span>
  );
}

export function TableShell({
  headers,
  children,
  empty,
  emptyLabel,
}: {
  headers: string[];
  children: React.ReactNode;
  empty: boolean;
  emptyLabel: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-1/30">
              {headers.map((header) => (
                <th key={header} className="table-header px-4 py-2.5 text-left">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empty ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-12 text-center text-sm text-text-tertiary"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export function BannedUsersTable({
  rows,
  onLift,
  onDelete,
}: {
  rows: BannedUserRow[];
  onLift: (row: BannedUserRow) => void;
  onDelete: (row: BannedUserRow) => void;
}) {
  return (
    <TableShell
      headers={["User", "Type", "Status", "Reason", "Expires", "Applied", "By", ""]}
      empty={rows.length === 0}
      emptyLabel="No moderation records match these filters."
    >
      {rows.map((row) => (
        <tr key={row.id} className="table-row">
          <td className="table-cell">
            <p className="text-sm text-text-primary">{row.user.name}</p>
            <p className="text-2xs text-text-tertiary">{row.user.email}</p>
          </td>
          <td className="table-cell">
            <span className="inline-flex items-center gap-1 text-2xs text-text-secondary">
              {row.type === "BAN" && <Ban className="w-3 h-3 text-danger" />}
              {row.type === "DELETION" && <Trash2 className="w-3 h-3 text-danger" />}
              {row.type === "SUSPENSION" && (
                <ShieldOff className="w-3 h-3 text-warning" />
              )}
              {row.type}
            </span>
          </td>
          <td className="table-cell">
            <Pill label={row.status} styles={STATUS_STYLES} />
          </td>
          <td className="table-cell max-w-[240px]">
            <p className="text-xs text-text-secondary truncate" title={row.reason}>
              {row.reason}
            </p>
            {row.liftReason && (
              <p
                className="text-2xs text-success truncate"
                title={`Lifted: ${row.liftReason}`}
              >
                Lifted: {row.liftReason}
              </p>
            )}
          </td>
          <td className="table-cell text-xs text-text-tertiary whitespace-nowrap">
            {row.expiresAt ? formatDate(row.expiresAt) : "Permanent"}
          </td>
          <td className="table-cell text-xs text-text-tertiary whitespace-nowrap">
            {formatDate(row.createdAt)}
          </td>
          <td className="table-cell text-2xs text-text-tertiary">
            {row.createdByAdmin?.name ?? "—"}
          </td>
          <td className="table-cell text-right whitespace-nowrap">
            {row.status === "ACTIVE" && row.type !== "DELETION" && (
              <div className="flex gap-1.5 justify-end">
                <button
                  onClick={() => onLift(row)}
                  className="btn-ghost btn-sm text-success"
                >
                  Lift
                </button>
                <button
                  onClick={() => onDelete(row)}
                  className="btn-ghost btn-sm text-danger"
                >
                  Delete
                </button>
              </div>
            )}
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

export function BannedIpsTable({
  rows,
  onLift,
}: {
  rows: BannedIpRow[];
  onLift: (row: BannedIpRow) => void;
}) {
  return (
    <TableShell
      headers={["Address", "Family", "Status", "Reason", "Hits", "Expires", "Added", ""]}
      empty={rows.length === 0}
      emptyLabel="No addresses are blacklisted."
    >
      {rows.map((row) => (
        <tr key={row.id} className="table-row">
          <td className="table-cell">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-text-primary">
              <Globe className="w-3 h-3 text-text-tertiary" />
              {row.ip}
            </span>
            {row.isRange && (
              <p className="text-2xs text-warning">Range · /{row.prefixLength}</p>
            )}
          </td>
          <td className="table-cell text-2xs text-text-tertiary">
            {row.isIpv6 ? "IPv6" : "IPv4"}
          </td>
          <td className="table-cell">
            <Pill label={row.status} styles={STATUS_STYLES} />
          </td>
          <td className="table-cell max-w-[240px]">
            <p className="text-xs text-text-secondary truncate" title={row.reason}>
              {row.reason}
            </p>
          </td>
          <td className="table-cell text-xs text-text-tertiary tabular-nums">
            {row.hitCount}
          </td>
          <td className="table-cell text-xs text-text-tertiary whitespace-nowrap">
            {row.expiresAt ? formatDate(row.expiresAt) : "Permanent"}
          </td>
          <td className="table-cell text-xs text-text-tertiary whitespace-nowrap">
            {formatDate(row.createdAt)}
          </td>
          <td className="table-cell text-right">
            {row.status === "ACTIVE" && (
              <button
                onClick={() => onLift(row)}
                className="btn-ghost btn-sm text-success"
              >
                Remove
              </button>
            )}
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

export function IdentifiersTable({
  rows,
  onLift,
}: {
  rows: BannedIdentifierRow[];
  onLift: (row: BannedIdentifierRow) => void;
}) {
  return (
    <TableShell
      headers={["Kind", "Identifier", "Status", "Reason", "Expires", "Added", ""]}
      empty={rows.length === 0}
      emptyLabel="No identifiers are blacklisted."
    >
      {rows.map((row) => (
        <tr key={row.id} className="table-row">
          <td className="table-cell text-2xs text-text-secondary">{row.kind}</td>
          <td className="table-cell">
            <p className="font-mono text-xs text-text-primary">
              {row.valueHint ?? "—"}
            </p>
            <p className="text-2xs text-text-tertiary">Stored as a salted hash</p>
          </td>
          <td className="table-cell">
            <Pill label={row.status} styles={STATUS_STYLES} />
          </td>
          <td className="table-cell max-w-[240px]">
            <p className="text-xs text-text-secondary truncate" title={row.reason}>
              {row.reason}
            </p>
          </td>
          <td className="table-cell text-xs text-text-tertiary whitespace-nowrap">
            {row.expiresAt ? formatDate(row.expiresAt) : "Permanent"}
          </td>
          <td className="table-cell text-xs text-text-tertiary whitespace-nowrap">
            {formatDate(row.createdAt)}
          </td>
          <td className="table-cell text-right">
            {row.status === "ACTIVE" && (
              <button
                onClick={() => onLift(row)}
                className="btn-ghost btn-sm text-success"
              >
                Remove
              </button>
            )}
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

export function AllowlistTable({
  rows,
  onRemove,
}: {
  rows: AllowlistRow[];
  onRemove: (row: AllowlistRow) => void;
}) {
  return (
    <TableShell
      headers={["Kind", "Value", "Reason", "Added", ""]}
      empty={rows.length === 0}
      emptyLabel="Nothing is allowlisted. Trusted staff devices and office addresses belong here."
    >
      {rows.map((row) => (
        <tr key={row.id} className="table-row">
          <td className="table-cell">
            <span className="inline-flex items-center gap-1.5 text-2xs text-text-secondary">
              <ShieldCheck className="w-3 h-3 text-success" />
              {row.kind}
            </span>
          </td>
          <td className="table-cell font-mono text-xs text-text-primary">
            {row.ip ?? row.valueHint ?? "—"}
          </td>
          <td className="table-cell max-w-[280px]">
            <p className="text-xs text-text-secondary truncate" title={row.reason}>
              {row.reason}
            </p>
          </td>
          <td className="table-cell text-xs text-text-tertiary whitespace-nowrap">
            {formatDate(row.createdAt)}
          </td>
          <td className="table-cell text-right">
            <button
              onClick={() => onRemove(row)}
              className="btn-ghost btn-sm text-danger"
            >
              Remove
            </button>
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

export function DevicesTable({
  rows,
  onAction,
}: {
  rows: DeviceRow[];
  onAction: (row: DeviceRow, action: "TRUST" | "UNTRUST" | "BLOCK" | "UNBLOCK") => void;
}) {
  return (
    <TableShell
      headers={["Owner", "Device", "Accounts", "Last seen", "Location", "Logins", ""]}
      empty={rows.length === 0}
      emptyLabel="No devices recorded yet. Devices appear after users sign in with fingerprinting enabled."
    >
      {rows.map((row) => (
        <tr key={row.id} className="table-row">
          <td className="table-cell">
            <p className="text-sm text-text-primary">{row.user.name}</p>
            <p className="text-2xs text-text-tertiary">{row.user.email}</p>
          </td>
          <td className="table-cell">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <Laptop className="w-3 h-3 text-text-tertiary" />
              {row.browser ?? "Unknown"} {row.browserVersion?.split(".")[0] ?? ""}
            </span>
            <p className="text-2xs text-text-tertiary">
              {row.os ?? "Unknown OS"} {row.osVersion ?? ""} · {row.deviceType ?? "—"}
            </p>
          </td>
          <td className="table-cell">
            {row.accountCount > 1 ? (
              <span className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full font-medium text-warning bg-warning/10">
                <Users className="w-3 h-3" />
                {row.accountCount} accounts
              </span>
            ) : (
              <span className="text-2xs text-text-tertiary">1</span>
            )}
          </td>
          <td className="table-cell text-xs text-text-tertiary whitespace-nowrap">
            {formatDate(row.lastSeenAt)}
          </td>
          <td className="table-cell">
            <p className="text-xs text-text-secondary">{row.lastCountry ?? "—"}</p>
            <p className="text-2xs text-text-tertiary font-mono">{row.lastIp ?? "—"}</p>
          </td>
          <td className="table-cell text-xs text-text-tertiary tabular-nums">
            {row.loginCount}
          </td>
          <td className="table-cell text-right whitespace-nowrap">
            <div className="flex gap-1.5 justify-end">
              <button
                onClick={() => onAction(row, row.trusted ? "UNTRUST" : "TRUST")}
                className={`btn-ghost btn-sm ${row.trusted ? "text-text-tertiary" : "text-success"}`}
              >
                {row.trusted ? "Untrust" : "Trust"}
              </button>
              <button
                onClick={() => onAction(row, row.blocked ? "UNBLOCK" : "BLOCK")}
                className={`btn-ghost btn-sm ${row.blocked ? "text-success" : "text-danger"}`}
              >
                {row.blocked ? "Unblock" : "Block"}
              </button>
            </div>
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

export function LoginHistoryTable({ rows }: { rows: LoginAttemptRow[] }) {
  return (
    <TableShell
      headers={["When", "Email", "Result", "Address", "Location", "Browser / OS", "Flags"]}
      empty={rows.length === 0}
      emptyLabel="No login attempts recorded yet."
    >
      {rows.map((row) => (
        <tr key={row.id} className="table-row">
          <td className="table-cell text-xs text-text-tertiary whitespace-nowrap">
            {formatDate(row.createdAt)}
          </td>
          <td className="table-cell text-xs text-text-primary">{row.email}</td>
          <td className="table-cell">
            <span
              className={`inline-flex items-center text-2xs px-2 py-0.5 rounded-full font-medium ${
                row.success ? "text-success bg-success/10" : "text-danger bg-danger/10"
              }`}
            >
              {row.success ? "Success" : (row.failureReason ?? "Failed")}
            </span>
          </td>
          <td className="table-cell">
            <p className="font-mono text-2xs text-text-secondary">{row.ip ?? "—"}</p>
            <p className="text-2xs text-text-tertiary">{row.isIpv6 ? "IPv6" : "IPv4"}</p>
          </td>
          <td className="table-cell text-xs text-text-secondary">
            {row.city ? `${row.city}, ` : ""}
            {row.country ?? "—"}
          </td>
          <td className="table-cell text-2xs text-text-tertiary">
            {row.browser ?? "—"} · {row.os ?? "—"}
          </td>
          <td className="table-cell">
            <div className="flex gap-1">
              {row.isVpn && (
                <span className="text-2xs px-1.5 py-0.5 rounded bg-warning/10 text-warning">
                  VPN
                </span>
              )}
              {row.isProxy && (
                <span className="text-2xs px-1.5 py-0.5 rounded bg-warning/10 text-warning">
                  Proxy
                </span>
              )}
              {row.isTor && (
                <span className="text-2xs px-1.5 py-0.5 rounded bg-danger/10 text-danger">
                  Tor
                </span>
              )}
              {!row.isVpn && !row.isProxy && !row.isTor && (
                <span className="text-2xs text-text-tertiary">—</span>
              )}
            </div>
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

export function EventsTable({ rows }: { rows: SecurityEventRow[] }) {
  return (
    <TableShell
      headers={["When", "Event", "Severity", "Subject", "Reason", "Address", "Location"]}
      empty={rows.length === 0}
      emptyLabel="No security events recorded yet."
    >
      {rows.map((row) => (
        <tr key={row.id} className="table-row">
          <td className="table-cell text-xs text-text-tertiary whitespace-nowrap">
            {formatDate(row.createdAt)}
          </td>
          <td className="table-cell text-2xs text-text-secondary font-medium">
            {row.type.replace(/_/g, " ")}
          </td>
          <td className="table-cell">
            <Pill label={row.severity} styles={SEVERITY_STYLES} />
          </td>
          <td className="table-cell text-xs text-text-secondary">
            {row.user?.email ?? row.email ?? "—"}
          </td>
          <td className="table-cell max-w-[260px]">
            <p className="text-xs text-text-secondary truncate" title={row.reason ?? ""}>
              {row.reason ?? "—"}
            </p>
          </td>
          <td className="table-cell font-mono text-2xs text-text-tertiary">
            {row.ip ?? "—"}
          </td>
          <td className="table-cell text-xs text-text-secondary">
            {row.city ? `${row.city}, ` : ""}
            {row.country ?? "—"}
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

export function RiskQueueTable({
  rows,
  onBan,
  onReview,
}: {
  rows: RiskRow[];
  onBan: (row: RiskRow) => void;
  onReview: (row: RiskRow, outcome: "CLEAR" | "ESCALATE") => void;
}) {
  return (
    <TableShell
      headers={["User", "Score", "Level", "Signals", "Computed", "Reviewed", ""]}
      empty={rows.length === 0}
      emptyLabel="No accounts are currently flagged. Scores populate once the risk engine is enabled."
    >
      {rows.map((row) => (
        <tr key={row.id} className="table-row">
          <td className="table-cell">
            <p className="text-sm text-text-primary">{row.user.name}</p>
            <p className="text-2xs text-text-tertiary">{row.user.email}</p>
          </td>
          <td className="table-cell">
            <span className="text-sm font-semibold tabular-nums text-text-primary">
              {row.score}
            </span>
            <span className="text-2xs text-text-tertiary">/100</span>
          </td>
          <td className="table-cell">
            <Pill label={row.level} styles={RISK_STYLES} />
          </td>
          <td className="table-cell max-w-[280px]">
            <div className="flex flex-wrap gap-1">
              {row.signals.slice(0, 3).map((signal) => (
                <span
                  key={signal.id}
                  className="text-2xs px-1.5 py-0.5 rounded bg-surface-2 text-text-tertiary"
                  title={signal.detail ?? undefined}
                >
                  {signal.rule.replace(/_/g, " ").toLowerCase()} +{signal.weight}
                </span>
              ))}
              {row.signals.length > 3 && (
                <span className="text-2xs text-text-tertiary">
                  +{row.signals.length - 3} more
                </span>
              )}
            </div>
          </td>
          <td className="table-cell text-xs text-text-tertiary whitespace-nowrap">
            {formatDate(row.computedAt)}
          </td>
          <td className="table-cell text-xs text-text-tertiary whitespace-nowrap">
            {row.reviewedAt ? formatDate(row.reviewedAt) : "Pending"}
          </td>
          <td className="table-cell text-right whitespace-nowrap">
            <div className="flex gap-1.5 justify-end">
              <button
                onClick={() => onReview(row, "CLEAR")}
                className="btn-ghost btn-sm text-success"
                title="Dismiss the flag and remove from the queue"
              >
                Clear
              </button>
              <button
                onClick={() => onReview(row, "ESCALATE")}
                className="btn-ghost btn-sm text-warning"
                title="Keep flagged for a second opinion"
              >
                Escalate
              </button>
              {!row.user.bannedAt && (
                <button
                  onClick={() => onBan(row)}
                  className="btn-ghost btn-sm text-danger"
                >
                  Ban
                </button>
              )}
            </div>
          </td>
        </tr>
      ))}
    </TableShell>
  );
}
