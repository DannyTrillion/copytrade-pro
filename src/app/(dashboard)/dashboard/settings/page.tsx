"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Check,
  Loader2,
  AlertCircle,
  Download,
  Fingerprint,
  Monitor,
  Wallet,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { TwoFactorSetup } from "@/components/settings/two-factor-setup";

const EASE = [0.16, 1, 0.3, 1] as const;

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  createdAt: string;
  wallet: { address: string; isConnected: boolean; verifiedAt: string | null } | null;
  balance: { totalBalance: number; totalProfit: number } | null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setName(data.profile.name || "");
        setEmail(data.profile.email || "");
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateProfile", name, email }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ type: "success", text: "Profile updated" });
        fetchProfile();
      } else {
        setProfileMsg({ type: "error", text: data.error || "Update failed" });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Network error" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match" });
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changePassword", currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ type: "success", text: "Password changed successfully" });
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      } else {
        setPasswordMsg({ type: "error", text: data.error || "Password change failed" });
      }
    } catch {
      setPasswordMsg({ type: "error", text: "Network error" });
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-[900px]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <h2 className="text-xl font-bold text-text-primary">Settings</h2>
        <p className="text-sm text-text-tertiary mt-1">Manage your account, security, and preferences</p>
      </motion.div>

      {/* Account overview card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4, ease: EASE }}
        className="glass-panel p-5 md:p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white text-lg font-bold shrink-0">
            {profile?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-text-primary">{profile?.name || "User"}</h3>
            <p className="text-xs text-text-tertiary truncate">{profile?.email}</p>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Role</p>
              <p className="text-xs font-medium text-text-secondary capitalize">{profile?.role?.replace("_", " ").toLowerCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Member since</p>
              <p className="text-xs font-medium text-text-secondary">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        {/* ═══ Profile ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
          className="glass-panel p-5 md:p-6"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <User className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-semibold text-text-primary">Profile</h3>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-text-tertiary mb-1.5 uppercase tracking-wide">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="input-field" placeholder="Your name" required minLength={2} maxLength={50} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-tertiary mb-1.5 uppercase tracking-wide">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" placeholder="your@email.com" required />
            </div>

            {profileMsg && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${profileMsg.type === "success" ? "bg-success/8 text-success" : "bg-danger/8 text-danger"}`}>
                {profileMsg.type === "success" ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {profileMsg.text}
              </motion.div>
            )}

            <button type="submit" disabled={profileSaving} className="btn-primary w-full text-sm">
              {profileSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save Changes"}
            </button>
          </form>
        </motion.div>

        {/* ═══ Password ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: EASE }}
          className="glass-panel p-5 md:p-6"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <Lock className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold text-text-primary">Password</h3>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {[
              { label: "Current", value: currentPassword, set: setCurrentPassword, show: showCurrentPw, toggle: () => setShowCurrentPw(!showCurrentPw), placeholder: "Current password" },
              { label: "New", value: newPassword, set: setNewPassword, show: showNewPw, toggle: () => setShowNewPw(!showNewPw), placeholder: "Min. 8 characters" },
              { label: "Confirm", value: confirmPassword, set: setConfirmPassword, show: showConfirmPw, toggle: () => setShowConfirmPw(!showConfirmPw), placeholder: "Re-enter new password" },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-[11px] font-medium text-text-tertiary mb-1.5 uppercase tracking-wide">{field.label}</label>
                <div className="relative">
                  <input
                    type={field.show ? "text" : "password"}
                    value={field.value}
                    onChange={(e) => field.set(e.target.value)}
                    className="input-field pr-10"
                    placeholder={field.placeholder}
                    required
                    minLength={field.label !== "Current" ? 8 : undefined}
                  />
                  <button type="button" onClick={field.toggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors border-none bg-transparent p-0">
                    {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-2xs text-danger flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Passwords do not match
              </p>
            )}

            {passwordMsg && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${passwordMsg.type === "success" ? "bg-success/8 text-success" : "bg-danger/8 text-danger"}`}>
                {passwordMsg.type === "success" ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {passwordMsg.text}
              </motion.div>
            )}

            <button type="submit" disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
              className="btn-primary w-full text-sm">
              {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Update Password"}
            </button>
          </form>
        </motion.div>
      </div>

      {/* ═══ Security & 2FA ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
      >
        <TwoFactorSetup />
      </motion.div>

      {/* ═══ Quick Actions ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4, ease: EASE }}
        className="glass-panel overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Quick Actions</h3>
        </div>
        <div className="divide-y divide-border">
          {/* Export data */}
          <button
            type="button"
            onClick={() => {
              const a = document.createElement("a");
              a.href = "/api/user/export";
              a.download = "copytrade-pro-data-export.json";
              a.click();
            }}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2/50 transition-colors text-left border-none bg-transparent"
          >
            <Download className="w-4 h-4 text-text-tertiary" />
            <div className="flex-1">
              <p className="text-sm text-text-primary font-medium">Export My Data</p>
              <p className="text-[11px] text-text-tertiary">Download all your account data as JSON</p>
            </div>
            <ChevronRight className="w-4 h-4 text-text-quaternary" />
          </button>

          {/* Session info */}
          <div className="px-5 py-3.5 flex items-center gap-3">
            <Monitor className="w-4 h-4 text-text-tertiary" />
            <div className="flex-1">
              <p className="text-sm text-text-primary font-medium">Active Session</p>
              <p className="text-[11px] text-text-tertiary">{session?.user?.email || "—"}</p>
            </div>
            <span className="text-[10px] text-success bg-success/8 px-2 py-0.5 rounded-full font-medium">Active</span>
          </div>

          {/* Wallet */}
          <div className="px-5 py-3.5 flex items-center gap-3">
            <Wallet className="w-4 h-4 text-text-tertiary" />
            <div className="flex-1">
              <p className="text-sm text-text-primary font-medium">Wallet</p>
              <p className="text-[11px] text-text-tertiary font-mono">
                {profile?.wallet?.address ? `${profile.wallet.address.slice(0, 6)}...${profile.wallet.address.slice(-4)}` : "Not connected"}
              </p>
            </div>
            {profile?.wallet?.isConnected ? (
              <span className="text-[10px] text-success bg-success/8 px-2 py-0.5 rounded-full font-medium">Connected</span>
            ) : (
              <span className="text-[10px] text-text-tertiary bg-surface-3 px-2 py-0.5 rounded-full">—</span>
            )}
          </div>

          {/* Member since */}
          <div className="px-5 py-3.5 flex items-center gap-3">
            <Calendar className="w-4 h-4 text-text-tertiary" />
            <div className="flex-1">
              <p className="text-sm text-text-primary font-medium">Member Since</p>
              <p className="text-[11px] text-text-tertiary">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
