"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  BarChart3,
  Signal,
  Loader2,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PnlChart } from "@/components/charts/pnl-chart";
import { formatCurrency } from "@/lib/utils";
import { StatGridSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/chart-skeleton";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { pageTransition } from "@/lib/animations";

/* ─── Types ─── */

interface TraderStats {
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  activeFollowers: number;
}

interface TraderTrade {
  id: string;
  tradeName: string;
  market: string;
  resultPercent: number;
  profitLoss: number;
  notes: string | null;
  screenshotUrl: string | null;
  tradeDate: string;
  createdAt: string;
  _count?: { copyResults: number };
}

interface CopyRequest {
  id: string;
  userId: string;
  traderId: string;
  traderName: string;
  riskPercent: number;
  status: string;
  message: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    wallet: { address: string; isConnected: boolean } | null;
  };
}

/* ─── Helpers ─── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* ─── Quick Action Card Data ─── */

interface QuickAction {
  label: string;
  href: string;
  icon: typeof Upload;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverBorderColor: string;
  description: string;
  showPendingBadge?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Upload Trade",
    href: "/dashboard/trader/upload",
    icon: Upload,
    color: "text-brand",
    bgColor: "bg-brand/10",
    borderColor: "border-brand/20",
    hoverBorderColor: "hover:border-brand/30",
    description: "Log a new completed trade",
  },
  {
    label: "My Trades",
    href: "/dashboard/trader/trades",
    icon: BarChart3,
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/20",
    hoverBorderColor: "hover:border-warning/30",
    description: "View full trade history",
  },
  {
    label: "Manage Followers",
    href: "/dashboard/trader/followers",
    icon: Users,
    color: "text-info",
    bgColor: "bg-info/10",
    borderColor: "border-info/20",
    hoverBorderColor: "hover:border-info/30",
    description: "Review and manage followers",
    showPendingBadge: true,
  },
  {
    label: "Edit Profile",
    href: "/dashboard/trader/profile",
    icon: Signal,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/20",
    hoverBorderColor: "hover:border-success/30",
    description: "Update your trader profile",
  },
];

/* ─── Stagger animation variants ─── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { ...pageTransition } },
};

/* ─── Component ─── */

export default function TraderDashboard() {
  const [stats, setStats] = useState<TraderStats | null>(null);
  const [trades, setTrades] = useState<TraderTrade[]>([]);
  const [copyRequests, setCopyRequests] = useState<CopyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "APPROVED" | "REJECTED"; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, tradesRes, requestsRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/trader-trades?limit=10"),
        fetch("/api/copy-requests"),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
      if (tradesRes.ok) {
        const data = await tradesRes.json();
        setTrades(data.trades || []);
      }
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setCopyRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Failed to fetch trader data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── Approve / Reject ─── */

  const handleCopyAction = async (requestId: string, action: "APPROVED" | "REJECTED") => {
    setProcessingRequest(requestId);
    try {
      const res = await fetch("/api/copy-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        setCopyRequests((prev) =>
          prev.map((r) =>
            r.id === requestId ? { ...r, status: action, reviewedAt: new Date().toISOString() } : r
          )
        );
        toast.success(action === "APPROVED" ? "Copy request approved" : "Copy request rejected");
        fetchData();
      } else {
        toast.error("Failed to process request");
      }
    } catch (err) {
      console.error("Failed to process request:", err);
      toast.error("Network error. Please try again.");
    } finally {
      setProcessingRequest(null);
    }
  };

  /* ─── Derived Data ─── */

  const pendingRequests = copyRequests.filter((r) => r.status === "PENDING");
  const recentTrades = trades.slice(0, 5);

  const pnlChartData =
    trades.length > 0
      ? trades
          .slice()
          .reverse()
          .reduce(
            (acc, t) => {
              const cumPnl = (acc.length > 0 ? acc[acc.length - 1].pnl : 0) + t.profitLoss;
              acc.push({
                date: new Date(t.tradeDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
                pnl: cumPnl,
              });
              return acc;
            },
            [] as { date: string; pnl: number }[]
          )
      : Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          pnl: 0,
        }));

  /* ─── Loading Skeleton ─── */

  if (loading) {
    return (
      <div className="dashboard-section">
        {/* Hero skeleton */}
        <Skeleton className="h-36 w-full rounded-2xl" />
        <StatGridSkeleton count={4} />
        <ChartSkeleton height={320} />
        {/* Quick actions skeleton */}
        <div>
          <Skeleton className="h-4 w-28 mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-panel p-4 space-y-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </div>
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  return (
    <>
    <motion.div
      className="dashboard-section"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ═══ Hero Card ═══ */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-5 md:p-7 text-white shadow-2xl ring-1 ring-white/[0.08]"
      >
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />
        {/* Bottom highlight */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-semibold">
                Master Trader Dashboard
              </h2>
              <p className="text-sm text-white/70 mt-1">
                Overview of your trading performance and follower activity
              </p>
            </div>
            {pendingRequests.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <Clock className="w-3 h-3 text-amber-300" />
                <span className="text-xs font-medium text-amber-300">
                  {pendingRequests.length} pending request{pendingRequests.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
          {/* Hero metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
            <div>
              <p className="text-2xs text-white/50 font-medium uppercase tracking-wider">Total P&L</p>
              <p className={`text-xl md:text-2xl font-bold tabular-nums mt-0.5 ${(stats?.totalPnl ?? 0) >= 0 ? "text-emerald-200" : "text-red-300"}`}>
                {formatCurrency(stats?.totalPnl ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-2xs text-white/50 font-medium uppercase tracking-wider">Win Rate</p>
              <p className="text-xl md:text-2xl font-bold tabular-nums mt-0.5">
                {stats?.winRate ?? 0}%
              </p>
            </div>
            <div>
              <p className="text-2xs text-white/50 font-medium uppercase tracking-wider">Active Followers</p>
              <p className="text-xl md:text-2xl font-bold tabular-nums mt-0.5">
                {stats?.activeFollowers ?? 0}
              </p>
            </div>
            <div>
              <p className="text-2xs text-white/50 font-medium uppercase tracking-wider">Total Trades</p>
              <p className="text-xl md:text-2xl font-bold tabular-nums mt-0.5">
                {stats?.totalTrades ?? 0}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ Stats Row ═══ */}
      <div className="stat-grid">
        <StatCard
          title="Total PnL"
          value={formatCurrency(stats?.totalPnl ?? 0)}
          changeType={(stats?.totalPnl ?? 0) >= 0 ? "positive" : "negative"}
          icon={TrendingUp}
          iconColor={(stats?.totalPnl ?? 0) >= 0 ? "text-success" : "text-danger"}
          delay={0}
        />
        <StatCard
          title="Active Followers"
          value={String(stats?.activeFollowers ?? 0)}
          icon={Users}
          iconColor="text-brand"
          delay={0.05}
        />
        <StatCard
          title="Total Trades"
          value={String(stats?.totalTrades ?? 0)}
          icon={BarChart3}
          iconColor="text-warning"
          delay={0.1}
        />
        <StatCard
          title="Win Rate"
          value={`${stats?.winRate ?? 0}%`}
          icon={Target}
          iconColor="text-info"
          delay={0.15}
        />
      </div>

      {/* ═══ PnL Chart ═══ */}
      <motion.div variants={itemVariants} className="glass-panel p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand/10">
              <TrendingUp className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Cumulative PnL</h3>
              <p className="text-2xs text-text-tertiary">
                {trades.length} trade{trades.length !== 1 ? "s" : ""} tracked
              </p>
            </div>
          </div>
          <p
            className={`text-2xl font-bold tabular-nums ${
              (stats?.totalPnl ?? 0) >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {formatCurrency(stats?.totalPnl ?? 0)}
          </p>
        </div>
        <PnlChart data={pnlChartData} height={280} showGrid />
      </motion.div>

      {/* ═══ Quick Actions ═══ */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <motion.div
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`glass-panel p-4 cursor-pointer border ${action.borderColor} ${action.hoverBorderColor} hover:shadow-md transition-all duration-200 group relative`}
                >
                  {action.showPendingBadge && pendingRequests.length > 0 && (
                    <span className="absolute top-3 right-3 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-warning text-[10px] font-bold text-surface-1">
                      {pendingRequests.length}
                    </span>
                  )}
                  <div
                    className={`p-2.5 rounded-xl ${action.bgColor} flex items-center justify-center mb-3 w-fit transition-transform duration-200 group-hover:scale-110`}
                  >
                    <Icon className={`w-4 h-4 ${action.color}`} />
                  </div>
                  <p className="text-sm font-medium text-text-primary">{action.label}</p>
                  <p className="text-2xs text-text-tertiary mt-0.5">{action.description}</p>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* ═══ Pending Copy Requests ═══ */}
      <motion.div variants={itemVariants} className="glass-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-warning/10">
              <Clock className="w-3.5 h-3.5 text-warning" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">Pending Copy Requests</h3>
          </div>
          <Link
            href="/dashboard/trader/followers"
            className="text-xs text-brand hover:text-brand-light transition-colors"
          >
            View All
          </Link>
        </div>

        {pendingRequests.length > 0 ? (
          <div className="divide-y divide-border">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 hover:bg-surface-1/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white text-sm font-semibold shrink-0 shadow-sm">
                      {req.user.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">{req.user.name}</p>
                      <p className="text-2xs text-text-tertiary">{req.user.email}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-2xs font-medium bg-warning/10 border-warning/20 text-warning">
                          <Clock className="w-2.5 h-2.5" />
                          Pending
                        </span>
                        <span className="text-2xs text-text-tertiary">
                          {req.riskPercent}% allocation
                        </span>
                        <span className="text-2xs text-text-tertiary">{timeAgo(req.createdAt)}</span>
                      </div>
                      {req.message && (
                        <p className="mt-1.5 text-xs text-text-secondary italic bg-surface-1 rounded px-2 py-1">
                          &ldquo;{req.message}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setConfirmAction({ id: req.id, action: "APPROVED", name: req.user.name })}
                      disabled={processingRequest === req.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 hover:bg-success/20 text-success text-xs font-medium transition-all duration-200 disabled:opacity-50"
                    >
                      {processingRequest === req.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => setConfirmAction({ id: req.id, action: "REJECTED", name: req.user.name })}
                      disabled={processingRequest === req.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/20 hover:bg-danger/20 text-danger text-xs font-medium transition-all duration-200 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success/10 to-success/5 flex items-center justify-center mx-auto mb-3 border border-success/10">
              <CheckCircle2 className="w-6 h-6 text-success/60" />
            </div>
            <p className="text-sm font-medium text-text-secondary">No pending requests</p>
            <p className="text-2xs text-text-tertiary mt-1">
              New copy requests from followers will appear here
            </p>
          </div>
        )}
      </motion.div>

      {/* ═══ Recent Trades ═══ */}
      <motion.div variants={itemVariants} className="glass-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-warning/10">
              <BarChart3 className="w-3.5 h-3.5 text-warning" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">Recent Trades</h3>
          </div>
          <Link
            href="/dashboard/trader/trades"
            className="text-xs text-brand hover:text-brand-light transition-colors"
          >
            View All
          </Link>
        </div>

        {recentTrades.length > 0 ? (
          <ScrollableTable>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-1/30 sticky top-0 z-10">
                  <th className="table-header px-4 py-2.5 text-left">Trade</th>
                  <th className="table-header px-4 py-2.5 text-left">Market</th>
                  <th className="table-header px-4 py-2.5 text-right">Result</th>
                  <th className="table-header px-4 py-2.5 text-right">P&amp;L</th>
                  <th className="table-header px-4 py-2.5 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade, i) => (
                  <tr key={trade.id} className={`table-row ${i % 2 === 1 ? "bg-surface-2/20" : ""}`}>
                    <td className="table-cell">
                      <p className="text-sm font-medium text-text-primary">{trade.tradeName}</p>
                    </td>
                    <td className="table-cell">
                      <span className="px-2 py-0.5 rounded-full bg-surface-3 text-xs text-text-secondary">
                        {trade.market}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <span
                        className={`flex items-center justify-end gap-1 text-sm font-medium tabular-nums ${
                          trade.resultPercent >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {trade.resultPercent >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {trade.resultPercent >= 0 ? "+" : ""}
                        {trade.resultPercent}%
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <span className={`tabular-nums font-medium ${trade.profitLoss >= 0 ? "text-success" : "text-danger"}`}>
                        {trade.profitLoss >= 0 ? "+" : ""}
                        {formatCurrency(trade.profitLoss)}
                      </span>
                    </td>
                    <td className="table-cell text-right text-text-tertiary text-xs tabular-nums">
                      {new Date(trade.tradeDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
        ) : (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-warning/10 to-warning/5 flex items-center justify-center mx-auto mb-3 border border-warning/10">
              <BarChart3 className="w-6 h-6 text-text-tertiary/40" />
            </div>
            <p className="text-sm font-medium text-text-secondary">No trades yet</p>
            <p className="text-2xs text-text-tertiary mt-1">
              <Link href="/dashboard/trader/upload" className="text-brand hover:text-brand-light transition-colors">
                Upload your first trade
              </Link>{" "}
              to get started
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>

    <ConfirmDialog
      isOpen={!!confirmAction}
      title={confirmAction?.action === "APPROVED" ? "Approve Copy Request" : "Reject Copy Request"}
      message={
        confirmAction?.action === "APPROVED"
          ? `Are you sure you want to approve ${confirmAction?.name}'s copy request? They will start copying your trades.`
          : `Are you sure you want to reject ${confirmAction?.name}'s copy request?`
      }
      confirmLabel={confirmAction?.action === "APPROVED" ? "Approve" : "Reject"}
      variant={confirmAction?.action === "APPROVED" ? "default" : "danger"}
      loading={!!processingRequest}
      onConfirm={() => {
        if (confirmAction) {
          handleCopyAction(confirmAction.id, confirmAction.action);
          setConfirmAction(null);
        }
      }}
      onCancel={() => setConfirmAction(null)}
    />
    </>
  );
}
