"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  Filter,
  Shield,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate } from "@/lib/utils";

interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress: string;
  createdAt: string;
  admin: { name: string; email: string };
}

const ITEMS_PER_PAGE = 20;

const ACTION_COLORS: Record<string, string> = {
  SUSPEND: "text-danger bg-danger/10",
  DELETE: "text-danger bg-danger/10",
  REJECT: "text-danger bg-danger/10",
  REJECTED: "text-danger bg-danger/10",
  APPROVE: "text-success bg-success/10",
  APPROVED: "text-success bg-success/10",
  CREATE: "text-success bg-success/10",
  CONFIRMED: "text-success bg-success/10",
  UPDATE: "text-warning bg-warning/10",
  EDIT: "text-warning bg-warning/10",
};

const DEFAULT_ACTION_COLOR = "text-brand bg-brand/10";

function getActionColor(action: string): string {
  const upper = action.toUpperCase();
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (upper.includes(key)) return color;
  }
  return DEFAULT_ACTION_COLOR;
}

function parseDetails(details: string): Record<string, unknown> | null {
  try {
    return JSON.parse(details);
  } catch {
    return null;
  }
}

function renderDetails(details: string): string {
  const parsed = parseDetails(details);
  if (!parsed || typeof parsed !== "object") return details || "\u2014";
  return Object.entries(parsed)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" | ");
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin?view=audit-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive unique action types for filter pills
  const actionTypes = useMemo(() => {
    const types = new Set(logs.map((l) => l.action));
    return Array.from(types).sort();
  }, [logs]);

  // Derive unique admin count
  const uniqueAdminCount = useMemo(() => {
    return new Set(logs.map((l) => l.adminId)).size;
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (actionFilter !== "ALL") {
      result = result.filter((l) => l.action === actionFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.admin.name.toLowerCase().includes(q) ||
          l.admin.email.toLowerCase().includes(q) ||
          l.targetId.toLowerCase().includes(q)
      );
    }

    return result;
  }, [logs, actionFilter, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, searchQuery]);

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
    <div className="dashboard-section">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-lg font-semibold text-text-primary">Audit Log</h2>
        <p className="text-sm text-text-tertiary mt-0.5">
          Track all administrative actions and changes
        </p>
      </motion.div>

      {/* Stats */}
      <div className="stat-grid-3">
        <StatCard
          title="Total Log Entries"
          value={String(logs.length)}
          icon={FileText}
          iconColor="text-brand"
          delay={0}
        />
        <StatCard
          title="Unique Admins"
          value={String(uniqueAdminCount)}
          icon={Shield}
          iconColor="text-info"
          delay={0.05}
        />
        <StatCard
          title="Action Types"
          value={String(actionTypes.length)}
          icon={Filter}
          iconColor="text-warning"
          delay={0.1}
        />
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by admin name, email, or target ID..."
            className="input-field pl-9 w-full text-sm"
          />
        </div>

        {/* Action filter dropdown */}
        <div className="relative shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input-field pl-9 pr-8 text-sm appearance-none cursor-pointer min-w-[180px]"
          >
            <option value="ALL">All Actions</option>
            {actionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-panel overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-1/30">
                <th className="table-header px-4 py-2.5 text-left">Date</th>
                <th className="table-header px-4 py-2.5 text-left">Admin</th>
                <th className="table-header px-4 py-2.5 text-left">Action</th>
                <th className="table-header px-4 py-2.5 text-left">Target</th>
                <th className="table-header px-4 py-2.5 text-left">Details</th>
                <th className="table-header px-4 py-2.5 text-left">IP</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="table-row">
                  <td className="table-cell text-xs text-text-tertiary whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="table-cell">
                    <p className="text-sm text-text-primary">{log.admin.name}</p>
                    <p className="text-2xs text-text-tertiary">{log.admin.email}</p>
                  </td>
                  <td className="table-cell">
                    <span
                      className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${getActionColor(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="table-cell">
                    <p className="text-xs text-text-secondary">{log.targetType}</p>
                    <p className="text-2xs text-text-tertiary font-mono">
                      {log.targetId.length > 16
                        ? `${log.targetId.slice(0, 8)}...${log.targetId.slice(-6)}`
                        : log.targetId}
                    </p>
                  </td>
                  <td className="table-cell max-w-[280px]">
                    <p className="text-2xs text-text-tertiary truncate" title={renderDetails(log.details)}>
                      {renderDetails(log.details)}
                    </p>
                  </td>
                  <td className="table-cell">
                    <code className="text-2xs font-mono text-text-tertiary">{log.ipAddress}</code>
                  </td>
                </tr>
              ))}
              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-text-tertiary">
                    {searchQuery || actionFilter !== "ALL"
                      ? "No logs match the current filters"
                      : "No audit logs recorded"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredLogs.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-text-tertiary">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              {"\u2013"}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of{" "}
              {filteredLogs.length} entries
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md hover:bg-surface-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-text-secondary px-2 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md hover:bg-surface-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
