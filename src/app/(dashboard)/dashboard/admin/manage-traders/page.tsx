"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  UserPlus,
  Signal,
  Loader2,
  Edit3,
  Trash2,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Users,
  Camera,
  Upload,
  ExternalLink,
  Search,
  Eye,
  X,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency } from "@/lib/utils";

interface TraderRow {
  id: string;
  displayName: string;
  description: string | null;
  bio: string | null;
  performancePct: number;
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  isActive: boolean;
  user: { name: string; email: string; avatar?: string | null };
  _count: { followers: number; traderTrades: number };
}

interface TraderForm {
  displayName: string;
  description: string;
  bio: string;
  performancePct: number;
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  avatar: string;
  email: string;
  password: string;
}

const EMPTY_FORM: TraderForm = {
  displayName: "",
  description: "",
  bio: "",
  performancePct: 0,
  totalPnl: 0,
  winRate: 0,
  totalTrades: 0,
  avatar: "",
  email: "",
  password: "",
};

export default function ManageTradersPage() {
  const [traders, setTraders] = useState<TraderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTrader, setEditTrader] = useState<TraderRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TraderRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [form, setForm] = useState<TraderForm>({ ...EMPTY_FORM });

  // Avatar upload
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin?view=traders");
      if (res.ok) {
        const data = await res.json();
        setTraders(data.traders || []);
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

  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => setMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setAvatarPreview(null);
  };

  /* ─── Avatar upload handler ─── */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setMsg({ type: "error", text: "Please select a JPEG, PNG, WebP, or GIF image." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ type: "error", text: "Image must be under 5MB." });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setMsg({ type: "error", text: data.error || "Upload failed" });
        setAvatarPreview(form.avatar || null);
        return;
      }
      const { url } = await res.json();
      setForm((f) => ({ ...f, avatar: url }));
      setAvatarPreview(url);
    } catch {
      setMsg({ type: "error", text: "Upload failed" });
      setAvatarPreview(form.avatar || null);
    } finally {
      setUploading(false);
    }
  };

  /* ─── Create trader ─── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      // Create trader
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createTrader", ...form }),
      });
      const data = await res.json();

      if (res.ok) {
        // If avatar was set, update the user's avatar
        if (form.avatar && data.trader?.userId) {
          await fetch("/api/admin", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "updateTraderAvatar",
              traderId: data.trader.id,
              avatar: form.avatar,
            }),
          });
        }
        setMsg({ type: "success", text: `Trader created! They can sign in with ${form.email}` });
        setShowCreate(false);
        resetForm();
        fetchData();
      } else {
        setMsg({ type: "error", text: data.error || "Failed" });
      }
    } catch {
      setMsg({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  /* ─── Update trader ─── */
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTrader) return;
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateTrader",
          traderId: editTrader.id,
          displayName: form.displayName,
          description: form.description,
          bio: form.bio,
          performancePct: form.performancePct,
          totalPnl: form.totalPnl,
          winRate: form.winRate,
          totalTrades: form.totalTrades,
        }),
      });

      if (res.ok) {
        // Update avatar if changed
        if (form.avatar !== (editTrader.user.avatar || "")) {
          await fetch("/api/admin", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "updateTraderAvatar",
              traderId: editTrader.id,
              avatar: form.avatar || null,
            }),
          });
        }
        setMsg({ type: "success", text: "Trader updated" });
        setEditTrader(null);
        resetForm();
        fetchData();
      }
    } catch {
      setMsg({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (traderId: string, isActive: boolean) => {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggleTrader", traderId, isActive: !isActive }),
    });
    fetchData();
  };

  const openEdit = (trader: TraderRow) => {
    setForm({
      displayName: trader.displayName,
      description: trader.description || "",
      bio: trader.bio || "",
      performancePct: trader.performancePct,
      totalPnl: trader.totalPnl,
      winRate: trader.winRate,
      totalTrades: trader.totalTrades,
      avatar: trader.user.avatar || "",
      email: "",
      password: "",
    });
    setAvatarPreview(trader.user.avatar || null);
    setEditTrader(trader);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteTrader", traderId: deleteTarget.id }),
      });
      const data = await res.json();

      if (res.ok) {
        setMsg({ type: "success", text: "Trader deleted successfully" });
        setDeleteTarget(null);
        fetchData();
      } else {
        setMsg({ type: "error", text: data.error || "Failed to delete trader" });
      }
    } catch {
      setMsg({ type: "error", text: "Network error" });
    } finally {
      setDeleting(false);
    }
  };

  /* ─── Filtered traders ─── */
  const filteredTraders = searchQuery
    ? traders.filter(
        (t) =>
          t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.user.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : traders;

  /* ─── Avatar section (render function, not component — avoids remount) ─── */
  const renderAvatarUpload = () => (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-2">
        Profile Picture
      </label>
      <div className="flex items-center gap-4">
        <div className="relative group">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-brand/20 to-brand-light/20 flex items-center justify-center border-2 border-border">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-brand">
                {(form.displayName || "T")[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100
                       transition-opacity flex items-center justify-center cursor-pointer"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Camera className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary text-xs gap-1.5"
          >
            {uploading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Upload className="w-3 h-3" />
            )}
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <p className="text-2xs text-text-tertiary mt-1">Max 5MB</p>
        </div>
        {avatarPreview && (
          <button
            type="button"
            onClick={() => {
              setAvatarPreview(null);
              setForm((f) => ({ ...f, avatar: "" }));
            }}
            className="p-1 rounded-md hover:bg-danger/10 text-text-tertiary hover:text-danger transition-colors"
            title="Remove avatar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleAvatarUpload}
        className="hidden"
      />
    </div>
  );

  /* ─── Trader form fields (render function, not component — avoids remount/focus loss) ─── */
  const renderTraderFormFields = (isEdit?: boolean) => (
    <div className="space-y-4">
      {renderAvatarUpload()}

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">
          Display Name *
        </label>
        <input
          type="text"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className="input-field"
          placeholder="Trader display name"
          required
        />
      </div>

      {/* Login credentials — only shown when creating */}
      {!isEdit && (
        <div className="p-3 rounded-lg bg-brand/5 border border-brand/10">
          <p className="text-xs font-medium text-brand mb-3">Login Credentials</p>
          <p className="text-2xs text-text-tertiary mb-3">The trader will use these to sign in to their account.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-2xs text-text-tertiary mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field text-sm"
                placeholder="trader@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-2xs text-text-tertiary mb-1">Password *</label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field text-sm"
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">
          Bio
        </label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          className="input-field min-h-[60px] resize-none"
          placeholder="Short bio about trading style..."
          maxLength={500}
        />
        <p className="text-2xs text-text-tertiary mt-1 text-right">
          {form.bio.length}/500
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input-field min-h-[80px] resize-none"
          placeholder="Detailed trading strategy and experience..."
          maxLength={2000}
        />
        <p className="text-2xs text-text-tertiary mt-1 text-right">
          {form.description.length}/2000
        </p>
      </div>

      <div className="p-3 rounded-lg bg-surface-1 border border-border">
        <p className="text-xs font-medium text-text-secondary mb-3">
          Performance Metrics
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-2xs text-text-tertiary mb-1">
              Performance %
            </label>
            <input
              type="number"
              value={form.performancePct}
              onChange={(e) =>
                setForm({ ...form, performancePct: parseFloat(e.target.value) || 0 })
              }
              className="input-field text-sm"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-2xs text-text-tertiary mb-1">
              Win Rate %
            </label>
            <input
              type="number"
              value={form.winRate}
              onChange={(e) =>
                setForm({ ...form, winRate: parseFloat(e.target.value) || 0 })
              }
              className="input-field text-sm"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-2xs text-text-tertiary mb-1">
              Total P&L ($)
            </label>
            <input
              type="number"
              value={form.totalPnl}
              onChange={(e) =>
                setForm({ ...form, totalPnl: parseFloat(e.target.value) || 0 })
              }
              className="input-field text-sm"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-2xs text-text-tertiary mb-1">
              Total Trades
            </label>
            <input
              type="number"
              value={form.totalTrades}
              onChange={(e) =>
                setForm({ ...form, totalTrades: parseInt(e.target.value) || 0 })
              }
              className="input-field text-sm"
              min="0"
            />
          </div>
        </div>
      </div>

      {isEdit && editTrader && (
        <div className="flex items-center justify-between p-3 bg-surface-1 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Trader ID</span>
            <a
              href={`/trader/${editTrader.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xs text-brand hover:underline flex items-center gap-1"
            >
              View Profile <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <code className="text-2xs text-text-tertiary font-mono">
            {editTrader.id.slice(0, 12)}...
          </code>
        </div>
      )}
    </div>
  );

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
    <>
      <div className="dashboard-section">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Manage Traders</h2>
            <p className="text-sm text-text-tertiary mt-0.5">
              Create, edit, and manage master traders with full control
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Create Trader
          </button>
        </motion.div>

        {/* ─── Status message ─── */}
        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`text-sm px-4 py-3 rounded-lg flex items-center justify-between ${
                msg.type === "success"
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-danger/10 text-danger border border-danger/20"
              }`}
            >
              {msg.text}
              <button onClick={() => setMsg(null)} className="p-1 hover:opacity-70">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Stats ─── */}
        <div className="stat-grid-3">
          <StatCard
            title="Total Traders"
            value={String(traders.length)}
            icon={Signal}
            iconColor="text-brand"
            delay={0}
          />
          <StatCard
            title="Active"
            value={String(traders.filter((t) => t.isActive).length)}
            icon={TrendingUp}
            iconColor="text-success"
            delay={0.05}
          />
          <StatCard
            title="Total Followers"
            value={String(traders.reduce((s, t) => s + t._count.followers, 0))}
            icon={Users}
            iconColor="text-info"
            delay={0.1}
          />
        </div>

        {/* ─── Search ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search traders by name or email..."
              className="input-field pl-10"
            />
          </div>
        </motion.div>

        {/* ─── Traders Table ─── */}
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
                  <th className="table-header px-4 py-2.5 text-left">Trader</th>
                  <th className="table-header px-4 py-2.5 text-right">Performance</th>
                  <th className="table-header px-4 py-2.5 text-right">P&L</th>
                  <th className="table-header px-4 py-2.5 text-right">Win Rate</th>
                  <th className="table-header px-4 py-2.5 text-right">Trades</th>
                  <th className="table-header px-4 py-2.5 text-right">Followers</th>
                  <th className="table-header px-4 py-2.5 text-center">Status</th>
                  <th className="table-header px-4 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTraders.map((t) => (
                  <tr key={t.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-brand/20 to-brand-light/20 flex items-center justify-center flex-shrink-0 border border-border">
                          {t.user.avatar ? (
                            <Image
                              src={t.user.avatar}
                              alt={t.displayName}
                              width={36}
                              height={36}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-brand">
                              {t.displayName[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {t.displayName}
                          </p>
                          <p className="text-2xs text-text-tertiary truncate">{t.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-right text-sm text-brand font-medium tabular-nums">
                      {t.performancePct > 0 ? "+" : ""}
                      {t.performancePct}%
                    </td>
                    <td
                      className={`table-cell text-right text-sm font-medium tabular-nums ${
                        t.totalPnl >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {formatCurrency(t.totalPnl)}
                    </td>
                    <td className="table-cell text-right text-sm text-text-secondary tabular-nums">
                      {t.winRate}%
                    </td>
                    <td className="table-cell text-right text-sm text-text-secondary tabular-nums">
                      {t.totalTrades}
                    </td>
                    <td className="table-cell text-right text-sm text-text-secondary tabular-nums">
                      {t._count.followers}
                    </td>
                    <td className="table-cell text-center">
                      <button
                        onClick={() => handleToggle(t.id, t.isActive)}
                        title={t.isActive ? "Deactivate" : "Activate"}
                      >
                        {t.isActive ? (
                          <ToggleRight className="w-5 h-5 text-success" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-text-tertiary" />
                        )}
                      </button>
                    </td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center gap-1">
                        <a
                          href={`/trader/${t.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-tertiary hover:text-brand"
                          title="View public profile"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-tertiary hover:text-text-primary"
                          title="Edit trader"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 rounded-md hover:bg-danger/10 transition-colors text-text-tertiary hover:text-danger"
                          title="Delete trader"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTraders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Signal className="w-6 h-6 text-text-quaternary" />
                        <p className="text-sm text-text-tertiary">
                          {searchQuery
                            ? "No traders match your search"
                            : "No traders yet — create one above"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* ═══ Create Trader Modal ═══ */}
      <Modal
        isOpen={showCreate}
        onClose={() => {
          setShowCreate(false);
          resetForm();
        }}
        title="Create Trader"
      >
        <form onSubmit={handleCreate} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {renderTraderFormFields()}
          <button
            type="submit"
            disabled={saving || !form.displayName || !form.email || form.password.length < 6}
            className="btn-primary w-full text-sm gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {saving ? "Creating..." : "Create Trader"}
          </button>
        </form>
      </Modal>

      {/* ═══ Edit Trader Modal ═══ */}
      <Modal
        isOpen={!!editTrader}
        onClose={() => {
          setEditTrader(null);
          resetForm();
        }}
        title={`Edit: ${editTrader?.displayName || "Trader"}`}
      >
        <form onSubmit={handleUpdate} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {renderTraderFormFields(true)}
          <button type="submit" disabled={saving} className="btn-primary w-full text-sm gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </Modal>

      {/* ═══ Delete Trader Confirm Dialog ═══ */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Trader"
        message={`Delete trader ${deleteTarget?.displayName}? This will remove the trader profile and unlink all followers. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
