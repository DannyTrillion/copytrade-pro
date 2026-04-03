"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  Shield,
  Search,
  UserCheck,
  Loader2,
  ChevronDown,
  Wallet,
  DollarSign,
  Link2,
  Ban,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserPlus,
  Save,
  Download,
  KeyRound,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { downloadCSV } from "@/lib/csv";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  suspended: boolean;
  createdAt: string;
  wallet: { address: string; isConnected: boolean } | null;
  balance: {
    totalBalance: number;
    availableBalance?: number;
    allocatedBalance?: number;
    totalProfit: number;
  } | null;
  trader: { id: string; totalTrades: number; totalPnl: number; winRate: number; isActive: boolean } | null;
  _count: { following: number; copyResults: number };
}

interface AdminStats {
  totalUsers: number;
  totalTraders: number;
  totalFollowers: number;
}

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-danger/10 text-danger border-danger/20",
  MASTER_TRADER: "bg-info/10 text-info border-info/20",
  FOLLOWER: "bg-surface-3 text-text-secondary border-border",
};

const USERS_PER_PAGE = 15;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUSPENDED">("ALL");
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Balance editor
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [balanceOp, setBalanceOp] = useState<"add_deposit" | "add_profit" | "add_loss" | "subtract">("add_deposit");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceSaving, setBalanceSaving] = useState(false);
  const [balanceMsg, setBalanceMsg] = useState("");

  // Assign trader
  const [assigningUser, setAssigningUser] = useState<UserRow | null>(null);
  const [traderId, setTraderId] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignMsg, setAssignMsg] = useState("");

  // Suspend confirmation
  const [suspendTarget, setSuspendTarget] = useState<UserRow | null>(null);
  const [suspendLoading, setSuspendLoading] = useState(false);

  // Role change confirmation
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ userId: string; newRole: string } | null>(null);

  // Create user modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "FOLLOWER" });
  const [createSaving, setCreateSaving] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // View/Edit user detail modal
  const [viewingUser, setViewingUser] = useState<UserRow | null>(null);
  const [detailEditName, setDetailEditName] = useState("");
  const [detailEditEmail, setDetailEditEmail] = useState("");
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailMsg, setDetailMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Impersonation
  const [impersonateTarget, setImpersonateTarget] = useState<UserRow | null>(null);
  const [masterKeyInput, setMasterKeyInput] = useState("");
  const [impersonateLoading, setImpersonateLoading] = useState(false);
  const [impersonateMsg, setImpersonateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { update: updateSession } = useSession();
  const router = useRouter();

  const handleImpersonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!impersonateTarget) return;
    setImpersonateLoading(true);
    setImpersonateMsg(null);

    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: impersonateTarget.email,
          masterKey: masterKeyInput,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setImpersonateMsg({ type: "success", text: `Accessing ${data.user.name}'s account...` });

        // Update the NextAuth session to impersonate
        await updateSession({
          impersonate: {
            userId: data.user.id,
            role: data.user.role,
          },
        });

        // Redirect to the user's dashboard based on their role
        const dashboardPath =
          data.user.role === "MASTER_TRADER"
            ? "/dashboard/trader"
            : data.user.role === "ADMIN"
              ? "/dashboard/admin"
              : "/dashboard/follower";

        setTimeout(() => {
          setImpersonateTarget(null);
          setMasterKeyInput("");
          setImpersonateMsg(null);
          router.push(dashboardPath);
          router.refresh();
        }, 800);
      } else {
        setImpersonateMsg({ type: "error", text: data.error || "Failed to access account" });
      }
    } catch {
      setImpersonateMsg({ type: "error", text: "Network error" });
    } finally {
      setImpersonateLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch("/api/admin?view=users"),
        fetch("/api/admin?view=stats"),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateRole", userId, role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      console.error("Role change failed:", err);
    } finally {
      setChangingRole(null);
    }
  };

  const handleSuspendToggle = async () => {
    if (!suspendTarget) return;
    setSuspendLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suspendUser",
          userId: suspendTarget.id,
          suspended: !suspendTarget.suspended,
        }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === suspendTarget.id ? { ...u, suspended: !suspendTarget.suspended } : u
          )
        );
      }
    } catch (err) {
      console.error("Suspend toggle failed:", err);
    } finally {
      setSuspendLoading(false);
      setSuspendTarget(null);
    }
  };

  const handleBalanceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setBalanceSaving(true);
    setBalanceMsg("");

    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "editBalance",
          userId: editingUser.id,
          operation: balanceOp,
          amount: parseFloat(balanceAmount),
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setBalanceMsg("Balance updated");
        setBalanceAmount("");
        // Update local state
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? { ...u, balance: { totalBalance: data.balance.totalBalance, totalProfit: data.balance.totalProfit } }
              : u
          )
        );
      } else {
        setBalanceMsg(data.error || "Failed");
      }
    } catch {
      setBalanceMsg("Network error");
    } finally {
      setBalanceSaving(false);
    }
  };

  const handleAssignTrader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningUser) return;
    setAssignSaving(true);
    setAssignMsg("");

    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assignTrader",
          userId: assigningUser.id,
          traderId,
        }),
      });

      if (res.ok) {
        setAssignMsg("Trader assigned successfully");
        setTraderId("");
      } else {
        const data = await res.json();
        setAssignMsg(data.error || "Failed");
      }
    } catch {
      setAssignMsg("Network error");
    } finally {
      setAssignSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    setCreateMsg(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createUser",
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          role: createForm.role,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setCreateMsg({ type: "success", text: `User "${data.user.name}" created successfully` });
        setCreateForm({ name: "", email: "", password: "", role: "FOLLOWER" });
        // Refresh the user list
        await fetchData();
        // Close modal after a brief delay so user sees the success message
        setTimeout(() => {
          setCreateModalOpen(false);
          setCreateMsg(null);
        }, 1200);
      } else {
        setCreateMsg({ type: "error", text: data.error || "Failed to create user" });
      }
    } catch {
      setCreateMsg({ type: "error", text: "Network error" });
    } finally {
      setCreateSaving(false);
    }
  };

  const handleDetailSave = async () => {
    if (!viewingUser) return;
    setDetailSaving(true);
    setDetailMsg(null);

    // Only send changed fields
    const payload: Record<string, string> = { action: "editUser", userId: viewingUser.id };
    if (detailEditName !== viewingUser.name) payload.name = detailEditName;
    if (detailEditEmail !== viewingUser.email) payload.email = detailEditEmail;

    if (!payload.name && !payload.email) {
      setDetailMsg({ type: "error", text: "No changes to save" });
      setDetailSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setDetailMsg({ type: "success", text: "User updated successfully" });
        // Update local state
        setUsers((prev) =>
          prev.map((u) =>
            u.id === viewingUser.id
              ? { ...u, name: data.user.name, email: data.user.email }
              : u
          )
        );
        // Update the viewing user reference
        setViewingUser((prev) =>
          prev ? { ...prev, name: data.user.name, email: data.user.email } : null
        );
      } else {
        setDetailMsg({ type: "error", text: data.error || "Failed to update user" });
      }
    } catch {
      setDetailMsg({ type: "error", text: "Network error" });
    } finally {
      setDetailSaving(false);
    }
  };

  const openViewModal = (user: UserRow) => {
    setViewingUser(user);
    setDetailEditName(user.name);
    setDetailEditEmail(user.email);
    setDetailMsg(null);
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (statusFilter === "SUSPENDED" && !u.suspended) return false;
      if (
        searchQuery &&
        !u.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !u.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / USERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filtered.slice(
    (safePage - 1) * USERS_PER_PAGE,
    safePage * USERS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Role", "Status", "Joined", "Balance"];
    const rows = filtered.map((u) => [
      u.name,
      u.email,
      u.role,
      u.suspended ? "Suspended" : "Active",
      new Date(u.createdAt).toLocaleDateString(),
      String(u.balance?.totalBalance || 0),
    ]);
    downloadCSV("users", headers, rows);
  };

  if (loading) {
    return (
      <div className="dashboard-section">
        {/* Header skeleton */}
        <div className="space-y-2 mb-6">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        {/* Stat cards skeleton */}
        <div className="stat-grid-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel p-4 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        {/* Search/filter bar skeleton */}
        <div className="flex gap-3 mb-4">
          <Skeleton className="h-10 flex-1 max-w-sm" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        {/* Table skeleton */}
        <div className="glass-panel overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 border-b border-border/50">
              <div className="grid grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-section">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-text-primary">User Management</h2>
          <p className="text-sm text-text-tertiary mt-0.5">Manage platform users and roles</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="btn-secondary btn-sm inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => {
              setCreateModalOpen(true);
              setCreateForm({ name: "", email: "", password: "", role: "FOLLOWER" });
              setCreateMsg(null);
            }}
            className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
          >
            <UserPlus className="w-4 h-4" />
            Create User
          </button>
        </div>
      </motion.div>

      <div className="stat-grid-3">
        <StatCard
          title="Total Users"
          value={String(stats?.totalUsers ?? users.length)}
          icon={Users}
          iconColor="text-brand"
          delay={0}
        />
        <StatCard
          title="Master Traders"
          value={String(stats?.totalTraders ?? 0)}
          icon={UserCheck}
          iconColor="text-success"
          delay={0.05}
        />
        <StatCard
          title="Active Followers"
          value={String(stats?.totalFollowers ?? 0)}
          icon={Shield}
          iconColor="text-info"
          delay={0.1}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-panel overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field text-sm py-2 pl-9"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {["ALL", "ADMIN", "MASTER_TRADER", "FOLLOWER"].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`text-xs px-2.5 py-1.5 rounded-md transition-colors ${
                  roleFilter === role
                    ? "bg-brand/10 text-brand"
                    : "text-text-tertiary hover:text-text-secondary hover:bg-surface-3"
                }`}
              >
                {role === "ALL" ? "All" : role === "MASTER_TRADER" ? "Traders" : role === "ADMIN" ? "Admin" : "Followers"}
              </button>
            ))}
            <div className="w-px bg-border mx-1" />
            <button
              onClick={() => setStatusFilter(statusFilter === "SUSPENDED" ? "ALL" : "SUSPENDED")}
              className={`text-xs px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                statusFilter === "SUSPENDED"
                  ? "bg-danger/10 text-danger"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-surface-3"
              }`}
            >
              <Ban className="w-3 h-3" />
              Suspended
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-1/30 sticky top-0 z-10">
                <th className="table-header px-4 py-2.5 text-left">User</th>
                <th className="table-header px-4 py-2.5 text-left">Role</th>
                <th className="table-header px-4 py-2.5 text-center">Wallet</th>
                <th className="table-header px-4 py-2.5 text-right">Balance</th>
                <th className="table-header px-4 py-2.5 text-right">Profit</th>
                <th className="table-header px-4 py-2.5 text-right">Activity</th>
                <th className="table-header px-4 py-2.5 text-right">Joined</th>
                <th className="table-header px-4 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user, i) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.02 }}
                    className={`table-row ${i % 2 === 1 ? 'bg-surface-2/20' : ''}`}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand/60 to-brand flex items-center justify-center text-white text-xs font-semibold">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm font-medium text-text-primary">{user.name}</p>
                            <p className="text-2xs text-text-tertiary">{user.email}</p>
                          </div>
                          {user.suspended && (
                            <span className="inline-flex items-center gap-1 text-2xs font-medium px-1.5 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                              Suspended
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="relative inline-block">
                        <select
                          value={user.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            if (newRole !== user.role) {
                              setRoleChangeTarget({ userId: user.id, newRole });
                              // Reset select visually (confirmation will handle the actual change)
                              e.target.value = user.role;
                            }
                          }}
                          disabled={changingRole === user.id}
                          className={`appearance-none text-xs px-2.5 py-1 pr-6 rounded-full border cursor-pointer transition-colors ${
                            ROLE_STYLES[user.role] || ROLE_STYLES.FOLLOWER
                          } ${changingRole === user.id ? "opacity-50" : ""}`}
                        >
                          <option value="FOLLOWER">FOLLOWER</option>
                          <option value="MASTER_TRADER">MASTER TRADER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        {changingRole === user.id ? (
                          <Loader2 className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin text-text-tertiary" />
                        ) : (
                          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      {user.wallet?.isConnected ? (
                        <span className="flex items-center justify-center gap-1 text-2xs text-success">
                          <Wallet className="w-3 h-3" />
                          Connected
                        </span>
                      ) : (
                        <span className="text-2xs text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="table-cell text-right text-sm">
                      {formatCurrency(user.balance?.totalBalance ?? 0)}
                    </td>
                    <td className="table-cell text-right">
                      <span
                        className={`text-sm ${
                          (user.balance?.totalProfit ?? 0) >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {(user.balance?.totalProfit ?? 0) >= 0 ? "+" : ""}
                        {formatCurrency(user.balance?.totalProfit ?? 0)}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      {user.role === "MASTER_TRADER" && user.trader ? (
                        <div className="text-right">
                          <p className="text-xs text-text-primary">{user.trader.totalTrades} trades</p>
                          <p className="text-2xs text-text-tertiary">{user.trader.winRate}% win</p>
                        </div>
                      ) : (
                        <div className="text-right">
                          <p className="text-xs text-text-primary">{user._count.copyResults} copies</p>
                          <p className="text-2xs text-text-tertiary">{user._count.following} following</p>
                        </div>
                      )}
                    </td>
                    <td className="table-cell text-right text-text-tertiary text-xs">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openViewModal(user)}
                          className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-tertiary hover:text-brand"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setEditingUser(user); setBalanceAmount(""); setBalanceMsg(""); }}
                          className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-tertiary hover:text-success"
                          title="Edit Balance"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setAssigningUser(user); setTraderId(""); setAssignMsg(""); }}
                          className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-tertiary hover:text-brand"
                          title="Assign Trader"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setImpersonateTarget(user);
                            setMasterKeyInput("");
                            setImpersonateMsg(null);
                          }}
                          className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-tertiary hover:text-warning"
                          title="Access Account"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSuspendTarget(user)}
                          className={`p-1.5 rounded-md hover:bg-surface-3 transition-colors ${
                            user.suspended
                              ? "text-danger hover:text-success"
                              : "text-text-tertiary hover:text-danger"
                          }`}
                          title={user.suspended ? "Unsuspend User" : "Suspend User"}
                        >
                          {user.suspended ? (
                            <ShieldOff className="w-3.5 h-3.5" />
                          ) : (
                            <Ban className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-sm text-text-tertiary">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-border bg-surface-1/20 flex items-center justify-between">
          <p className="text-2xs text-text-tertiary">
            Showing {(safePage - 1) * USERS_PER_PAGE + 1}–{Math.min(safePage * USERS_PER_PAGE, filtered.length)} of {filtered.length} users
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="p-1.5 rounded-md transition-colors text-text-tertiary hover:text-text-primary hover:bg-surface-3 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-text-secondary tabular-nums min-w-[5rem] text-center">
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="p-1.5 rounded-md transition-colors text-text-tertiary hover:text-text-primary hover:bg-surface-3 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Suspend / Unsuspend Confirmation */}
      <ConfirmDialog
        isOpen={!!suspendTarget}
        title={suspendTarget?.suspended ? "Unsuspend User" : "Suspend User"}
        message={`Are you sure you want to ${suspendTarget?.suspended ? "unsuspend" : "suspend"} this user?`}
        confirmLabel={suspendTarget?.suspended ? "Unsuspend" : "Suspend"}
        variant="danger"
        loading={suspendLoading}
        onConfirm={handleSuspendToggle}
        onCancel={() => setSuspendTarget(null)}
      />

      {/* Role Change Confirmation */}
      <ConfirmDialog
        isOpen={!!roleChangeTarget}
        title="Change User Role"
        message={`Change role to ${roleChangeTarget?.newRole === "MASTER_TRADER" ? "MASTER TRADER" : roleChangeTarget?.newRole ?? ""}?`}
        confirmLabel="Change Role"
        variant="warning"
        loading={changingRole === roleChangeTarget?.userId}
        onConfirm={async () => {
          if (!roleChangeTarget) return;
          await handleRoleChange(roleChangeTarget.userId, roleChangeTarget.newRole);
          setRoleChangeTarget(null);
        }}
        onCancel={() => setRoleChangeTarget(null)}
      />

      {/* Balance Editor Modal */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={`Edit Balance — ${editingUser?.name}`}>
        <form onSubmit={handleBalanceEdit} className="space-y-4">
          <div className="bg-surface-1 rounded-lg p-3 flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Current Balance</span>
            <span className="text-sm font-semibold text-text-primary">
              {formatCurrency(editingUser?.balance?.totalBalance || 0)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Operation</label>
            <select
              value={balanceOp}
              onChange={(e) => setBalanceOp(e.target.value as typeof balanceOp)}
              className="input-field"
            >
              <option value="add_deposit">Add Deposit</option>
              <option value="add_profit">Add Profit</option>
              <option value="add_loss">Add Loss</option>
              <option value="subtract">Subtract Balance</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Amount ($)</label>
            <input
              type="number"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              className="input-field"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
            />
          </div>

          {balanceMsg && (
            <p className={`text-xs ${balanceMsg === "Balance updated" ? "text-success" : "text-danger"}`}>
              {balanceMsg}
            </p>
          )}

          <button type="submit" disabled={balanceSaving || !balanceAmount} className="btn-primary w-full text-sm">
            {balanceSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Apply"}
          </button>
        </form>
      </Modal>

      {/* Assign Trader Modal */}
      <Modal isOpen={!!assigningUser} onClose={() => setAssigningUser(null)} title={`Assign Trader — ${assigningUser?.name}`}>
        <form onSubmit={handleAssignTrader} className="space-y-4">
          <p className="text-xs text-text-tertiary">
            Enter the Trader ID to assign this user as an approved copy follower.
          </p>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Trader ID</label>
            <input
              type="text"
              value={traderId}
              onChange={(e) => setTraderId(e.target.value)}
              className="input-field font-mono text-xs"
              placeholder="Trader UUID"
              required
            />
          </div>

          {assignMsg && (
            <p className={`text-xs ${assignMsg.includes("success") ? "text-success" : "text-danger"}`}>
              {assignMsg}
            </p>
          )}

          <button type="submit" disabled={assignSaving || !traderId} className="btn-primary w-full text-sm">
            {assignSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Assign & Approve"}
          </button>
        </form>
      </Modal>

      {/* Create User Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New User"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Name</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              className="input-field"
              placeholder="Full name"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Email</label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              className="input-field"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Password</label>
            <input
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              className="input-field"
              placeholder="Min 6 characters"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Role</label>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
              className="input-field"
            >
              <option value="FOLLOWER">Follower</option>
              <option value="MASTER_TRADER">Master Trader</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {createMsg && (
            <p className={`text-xs ${createMsg.type === "success" ? "text-success" : "text-danger"}`}>
              {createMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={createSaving}
            className="btn-primary w-full text-sm flex items-center justify-center gap-2"
          >
            {createSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create User
              </>
            )}
          </button>
        </form>
      </Modal>

      {/* Impersonate User Modal */}
      <Modal
        isOpen={!!impersonateTarget}
        onClose={() => { setImpersonateTarget(null); setMasterKeyInput(""); setImpersonateMsg(null); }}
        title={`Access Account — ${impersonateTarget?.name}`}
      >
        <form onSubmit={handleImpersonate} className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-3">
            <KeyRound className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-400">Admin Override Access</p>
              <p className="text-2xs text-amber-400/70 mt-0.5">
                You are about to access <span className="font-semibold">{impersonateTarget?.email}</span>&apos;s account.
                This action will be logged in the audit trail.
              </p>
            </div>
          </div>

          <div className="bg-surface-1 rounded-lg p-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-2xs text-text-tertiary mb-0.5">User</p>
              <p className="text-sm font-medium text-text-primary">{impersonateTarget?.name}</p>
            </div>
            <div>
              <p className="text-2xs text-text-tertiary mb-0.5">Role</p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${ROLE_STYLES[impersonateTarget?.role || "FOLLOWER"]}`}>
                {impersonateTarget?.role === "MASTER_TRADER" ? "MASTER TRADER" : impersonateTarget?.role}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Master Key</label>
            <input
              type="password"
              value={masterKeyInput}
              onChange={(e) => setMasterKeyInput(e.target.value)}
              className="input-field font-mono text-sm"
              placeholder="Enter admin master key"
              autoComplete="off"
              required
            />
          </div>

          {impersonateMsg && (
            <p className={`text-xs ${impersonateMsg.type === "success" ? "text-success" : "text-danger"}`}>
              {impersonateMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={impersonateLoading || !masterKeyInput}
            className="btn-primary w-full text-sm flex items-center justify-center gap-2"
          >
            {impersonateLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                Access Account
              </>
            )}
          </button>
        </form>
      </Modal>

      {/* View / Edit User Detail Modal */}
      <Modal
        isOpen={!!viewingUser}
        onClose={() => setViewingUser(null)}
        title={`User Details — ${viewingUser?.name}`}
        size="lg"
      >
        {viewingUser && (
          <div className="space-y-5">
            {/* User Info Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">User Info</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-1 rounded-lg p-3">
                  <p className="text-2xs text-text-tertiary mb-0.5">Name</p>
                  <p className="text-sm font-medium text-text-primary">{viewingUser.name}</p>
                </div>
                <div className="bg-surface-1 rounded-lg p-3">
                  <p className="text-2xs text-text-tertiary mb-0.5">Email</p>
                  <p className="text-sm font-medium text-text-primary break-all">{viewingUser.email}</p>
                </div>
                <div className="bg-surface-1 rounded-lg p-3">
                  <p className="text-2xs text-text-tertiary mb-0.5">Role</p>
                  <span className={`inline-block text-xs px-2.5 py-1 rounded-full border ${ROLE_STYLES[viewingUser.role] || ROLE_STYLES.FOLLOWER}`}>
                    {viewingUser.role === "MASTER_TRADER" ? "MASTER TRADER" : viewingUser.role}
                  </span>
                </div>
                <div className="bg-surface-1 rounded-lg p-3">
                  <p className="text-2xs text-text-tertiary mb-0.5">Joined</p>
                  <p className="text-sm font-medium text-text-primary">{formatDate(viewingUser.createdAt)}</p>
                </div>
                <div className="bg-surface-1 rounded-lg p-3 col-span-2">
                  <p className="text-2xs text-text-tertiary mb-0.5">Status</p>
                  {viewingUser.suspended ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
                      <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Balance Info Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Balance</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-surface-1 rounded-lg p-3">
                  <p className="text-2xs text-text-tertiary mb-0.5">Total Balance</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {formatCurrency(viewingUser.balance?.totalBalance ?? 0)}
                  </p>
                </div>
                <div className="bg-surface-1 rounded-lg p-3">
                  <p className="text-2xs text-text-tertiary mb-0.5">Available</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {formatCurrency(viewingUser.balance?.availableBalance ?? 0)}
                  </p>
                </div>
                <div className="bg-surface-1 rounded-lg p-3">
                  <p className="text-2xs text-text-tertiary mb-0.5">Allocated</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {formatCurrency(viewingUser.balance?.allocatedBalance ?? 0)}
                  </p>
                </div>
                <div className="bg-surface-1 rounded-lg p-3">
                  <p className="text-2xs text-text-tertiary mb-0.5">Total Profit</p>
                  <p className={`text-sm font-semibold ${(viewingUser.balance?.totalProfit ?? 0) >= 0 ? "text-success" : "text-danger"}`}>
                    {(viewingUser.balance?.totalProfit ?? 0) >= 0 ? "+" : ""}
                    {formatCurrency(viewingUser.balance?.totalProfit ?? 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Wallet Info Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Wallet</h4>
              <div className="bg-surface-1 rounded-lg p-3">
                {viewingUser.wallet?.isConnected ? (
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-success flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-2xs text-text-tertiary mb-0.5">Connected Address</p>
                      <p className="text-xs font-mono text-text-primary break-all">{viewingUser.wallet.address}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-tertiary">No wallet connected</p>
                )}
              </div>
            </div>

            {/* Activity Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Activity</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-1 rounded-lg p-3">
                  <p className="text-2xs text-text-tertiary mb-0.5">Following</p>
                  <p className="text-sm font-semibold text-text-primary">{viewingUser._count.following}</p>
                </div>
                <div className="bg-surface-1 rounded-lg p-3">
                  <p className="text-2xs text-text-tertiary mb-0.5">Copy Results</p>
                  <p className="text-sm font-semibold text-text-primary">{viewingUser._count.copyResults}</p>
                </div>
              </div>
            </div>

            {/* Edit Section */}
            <div className="space-y-3 border-t border-border pt-5">
              <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Edit User</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Name</label>
                  <input
                    type="text"
                    value={detailEditName}
                    onChange={(e) => setDetailEditName(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Email</label>
                  <input
                    type="email"
                    value={detailEditEmail}
                    onChange={(e) => setDetailEditEmail(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {detailMsg && (
                <p className={`text-xs ${detailMsg.type === "success" ? "text-success" : "text-danger"}`}>
                  {detailMsg.text}
                </p>
              )}

              <button
                type="button"
                onClick={handleDetailSave}
                disabled={detailSaving || (detailEditName === viewingUser.name && detailEditEmail === viewingUser.email)}
                className="btn-primary text-sm flex items-center gap-2 px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {detailSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
