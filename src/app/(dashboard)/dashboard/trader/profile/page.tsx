"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  User,
  Users,
  TrendingUp,
  Target,
  BarChart3,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Eye,
  DollarSign,
  Camera,
  Upload,
  ExternalLink,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { StatGridSkeleton } from "@/components/ui/chart-skeleton";
import { formatCurrency } from "@/lib/utils";
import { slideUp } from "@/lib/animations";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

interface TraderProfile {
  id: string;
  displayName: string;
  bio: string | null;
  description: string | null;
  performancePct: number;
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  isActive: boolean;
  user: {
    name: string;
    email: string;
    avatar: string | null;
  };
  _count: {
    followers: number;
    traderTrades: number;
  };
}

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */

const BIO_MAX_LENGTH = 500;
const DESCRIPTION_MAX_LENGTH = 2000;

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */

export default function TraderProfilePage() {
  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  /* ─── Avatar state ─── */
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ─── Form state ─── */
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [description, setDescription] = useState("");

  /* ─── Fetch profile ─── */
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/trader/profile");
      if (res.ok) {
        const data = await res.json();
        const trader = data.trader as TraderProfile;
        setProfile(trader);
        setDisplayName(trader.displayName || "");
        setBio(trader.bio || "");
        setDescription(trader.description || "");
        setAvatarUrl(trader.user.avatar || null);
        setAvatarPreview(trader.user.avatar || null);
      }
    } catch (err) {
      console.error("Failed to fetch trader profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /* ─── Avatar upload ─── */
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate client-side
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setErrorMessage("Please select a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image must be under 5MB.");
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to server
    setUploading(true);
    setErrorMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.error || "Upload failed");
        setAvatarPreview(avatarUrl); // revert
        return;
      }
      const { url } = await res.json();
      setAvatarUrl(url);
      setAvatarPreview(url);
    } catch {
      setErrorMessage("Upload failed. Please try again.");
      setAvatarPreview(avatarUrl); // revert
    } finally {
      setUploading(false);
    }
  };

  /* ─── Save profile ─── */
  const handleSave = async () => {
    setSuccessMessage("");
    setErrorMessage("");

    if (!displayName.trim()) {
      setErrorMessage("Display name is required.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string | undefined> = {
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        description: description.trim() || undefined,
      };

      // Include avatar if it changed
      if (avatarUrl !== profile?.user.avatar) {
        payload.avatar = avatarUrl || undefined;
      }

      const res = await fetch("/api/trader/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update profile.");
        return;
      }

      setSuccessMessage("Profile updated successfully.");
      fetchProfile();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Copy trader ID ─── */
  const handleCopyId = () => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  /* ─── Copy public profile URL ─── */
  const handleCopyUrl = () => {
    if (!profile) return;
    const url = `${window.location.origin}/trader/${profile.id}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
        <StatGridSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass-panel p-6 space-y-4">
            <Skeleton className="h-5 w-28" />
            <div className="flex items-center gap-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-9 w-28 rounded-lg" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
          <div className="glass-panel p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-14 h-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="dashboard-section">
        <div className="glass-panel p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-danger/10 to-danger/5 flex items-center justify-center mx-auto mb-3 border border-danger/10">
            <XCircle className="w-6 h-6 text-danger" />
          </div>
          <p className="text-sm font-medium text-text-secondary">
            Failed to load trader profile. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const hasChanges =
    displayName !== (profile.displayName || "") ||
    bio !== (profile.bio || "") ||
    description !== (profile.description || "") ||
    avatarUrl !== (profile.user.avatar || null);

  return (
    <div className="dashboard-section">
      {/* ═══ Header ═══ */}
      <motion.div
        {...slideUp(0)}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-text-primary">
            Your Trader Profile
          </h2>
          <p className="text-2xs text-text-tertiary mt-0.5">
            Manage how followers see your profile and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyUrl}
            className="btn-secondary text-xs gap-1.5"
          >
            {copiedUrl ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
            {copiedUrl ? "Copied!" : "Share Profile"}
          </button>
          {profile.isActive ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-xs font-medium text-success">Active</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-danger/10 border border-danger/20">
              <span className="w-1.5 h-1.5 rounded-full bg-danger" />
              <span className="text-xs font-medium text-danger">Inactive</span>
            </span>
          )}
        </div>
      </motion.div>

      {/* ═══ Stats ═══ */}
      <div className="stat-grid">
        <StatCard
          title="Total PnL"
          value={formatCurrency(profile.totalPnl)}
          changeType={profile.totalPnl >= 0 ? "positive" : "negative"}
          icon={DollarSign}
          iconColor={profile.totalPnl >= 0 ? "text-success" : "text-danger"}
          delay={0}
        />
        <StatCard
          title="Win Rate"
          value={`${profile.winRate}%`}
          icon={Target}
          iconColor="text-info"
          delay={0.05}
        />
        <StatCard
          title="Total Trades"
          value={String(profile._count.traderTrades)}
          icon={BarChart3}
          iconColor="text-warning"
          delay={0.1}
        />
        <StatCard
          title="Followers"
          value={String(profile._count.followers)}
          icon={Users}
          iconColor="text-brand"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ═══ Edit Form ═══ */}
        <motion.div
          {...slideUp(0.2)}
          className="lg:col-span-2 glass-panel p-5 md:p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1.5 rounded-lg bg-brand/10">
              <User className="w-3.5 h-3.5 text-brand" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">
              Edit Profile
            </h3>
          </div>

          {/* Status messages */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 mb-4">
              <XCircle className="w-4 h-4 text-danger shrink-0" />
              <p className="text-xs text-danger">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 mb-4">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <p className="text-xs text-success">{successMessage}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* ── Avatar Upload ── */}
            <div>
              <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-2 block">
                Profile Picture
              </label>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-brand/20 to-brand-light/20 flex items-center justify-center border-2 border-border">
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview}
                        alt="Profile"
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-semibold text-brand">
                        {(displayName || profile.user.name || "T")[0]?.toUpperCase()}
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
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="btn-secondary text-xs gap-1.5"
                  >
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </button>
                  <p className="text-2xs text-text-tertiary mt-1.5">
                    JPG, PNG, WebP or GIF. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1.5 block">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your trader display name"
                className="input-field"
                maxLength={100}
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Bio</span>
                <span
                  className={`text-2xs ${
                    bio.length > BIO_MAX_LENGTH * 0.9
                      ? "text-warning"
                      : "text-text-tertiary"
                  }`}
                >
                  {bio.length}/{BIO_MAX_LENGTH}
                </span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => {
                  if (e.target.value.length <= BIO_MAX_LENGTH) {
                    setBio(e.target.value);
                  }
                }}
                placeholder="A short bio about your trading style..."
                className="input-field resize-none h-24"
                maxLength={BIO_MAX_LENGTH}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Description</span>
                <span
                  className={`text-2xs ${
                    description.length > DESCRIPTION_MAX_LENGTH * 0.9
                      ? "text-warning"
                      : "text-text-tertiary"
                  }`}
                >
                  {description.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= DESCRIPTION_MAX_LENGTH) {
                    setDescription(e.target.value);
                  }
                }}
                placeholder="Detailed description of your trading strategy, experience, and track record..."
                className="input-field resize-none h-36"
                maxLength={DESCRIPTION_MAX_LENGTH}
              />
            </div>

            {/* Trader ID */}
            <div>
              <label className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1.5 block">
                Trader ID
              </label>
              <p className="text-2xs text-text-tertiary mb-2">
                Share this ID with followers so they can send copy requests.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-surface-1 border border-border text-xs text-text-secondary font-mono break-all select-all tabular-nums">
                  {profile.id}
                </code>
                <button
                  onClick={handleCopyId}
                  className="p-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-text-secondary transition-colors shrink-0"
                  title="Copy Trader ID"
                >
                  {copiedId ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Save button */}
            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="btn-primary text-sm gap-2 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ═══ Profile Preview ═══ */}
        <motion.div
          {...slideUp(0.25)}
          className="glass-panel p-5 md:p-6 h-fit"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1.5 rounded-lg bg-brand/10">
              <Eye className="w-3.5 h-3.5 text-brand" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">
              Follower Preview
            </h3>
          </div>
          <p className="text-2xs text-text-tertiary mb-4">
            This is how your profile appears to followers.
          </p>

          {/* Avatar + Name */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white text-lg font-semibold shrink-0 border-2 border-border shadow-sm">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Preview"
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              ) : (
                (displayName || profile.user.name || "T")[0]?.toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">
                {displayName || profile.displayName || "Unnamed Trader"}
              </p>
              {bio && (
                <p className="text-2xs text-text-tertiary mt-0.5 line-clamp-2">
                  {bio}
                </p>
              )}
            </div>
          </div>

          {/* Stats grid in preview */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-3 rounded-lg bg-surface-1 border border-border text-center">
              <p className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1">Total PnL</p>
              <p
                className={`text-sm font-bold tabular-nums ${
                  profile.totalPnl >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {formatCurrency(profile.totalPnl)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-1 border border-border text-center">
              <p className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1">Win Rate</p>
              <p className="text-sm font-bold tabular-nums text-text-primary">
                {profile.winRate}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-1 border border-border text-center">
              <p className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1">Trades</p>
              <p className="text-sm font-bold tabular-nums text-text-primary">
                {profile._count.traderTrades}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-1 border border-border text-center">
              <p className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-1">Followers</p>
              <p className="text-sm font-bold tabular-nums text-text-primary">
                {profile._count.followers}
              </p>
            </div>
          </div>

          {/* Performance badge */}
          {profile.performancePct !== 0 && (
            <div className="p-3 rounded-lg bg-surface-1 border border-border">
              <div className="flex items-center gap-2">
                <TrendingUp
                  className={`w-4 h-4 ${
                    profile.performancePct >= 0 ? "text-success" : "text-danger"
                  }`}
                />
                <div>
                  <p className="text-2xs text-text-tertiary font-medium uppercase tracking-wider">Performance</p>
                  <p
                    className={`text-sm font-bold tabular-nums ${
                      profile.performancePct >= 0
                        ? "text-success"
                        : "text-danger"
                    }`}
                  >
                    {profile.performancePct >= 0 ? "+" : ""}
                    {profile.performancePct}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Description preview */}
          {description && (
            <div className="mt-4">
              <p className="text-2xs text-text-tertiary font-medium uppercase tracking-wider mb-2">
                About
              </p>
              <p className="text-xs text-text-secondary leading-relaxed line-clamp-6">
                {description}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
