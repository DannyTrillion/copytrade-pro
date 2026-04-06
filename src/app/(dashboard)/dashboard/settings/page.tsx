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
} from "lucide-react";
import { TwoFactorSetup } from "@/components/settings/two-factor-setup";

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

  // Profile form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password form
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
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
        setProfileMsg({ type: "success", text: "Profile updated successfully" });
        setProfile((prev) => (prev ? { ...prev, name, email } : prev));
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
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
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
      <>
        <div className="dashboard-section">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="dashboard-section">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-lg font-semibold text-text-primary">Account Settings</h2>
          <p className="text-sm text-text-tertiary mt-1">Manage your profile and security preferences</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel p-5 md:p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-brand/10">
                <User className="w-4 h-4 text-brand" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Profile Information</h3>
                <p className="text-2xs text-text-tertiary">Update your display name and email</p>
              </div>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Your name"
                    required
                    minLength={2}
                    maxLength={50}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              {/* Data Export */}
              <div className="pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = "/api/user/export";
                    a.download = "copytrade-pro-data-export.json";
                    a.click();
                  }}
                  className="btn-ghost text-xs gap-2 w-full justify-center"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Export My Data
                </button>
              </div>

              {/* Account Info */}
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-text-tertiary">Role</span>
                  <span className="text-text-secondary capitalize">{profile?.role?.replace("_", " ").toLowerCase()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-tertiary">Member since</span>
                  <span className="text-text-secondary">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </span>
                </div>
                {profile?.wallet && (
                  <div className="flex justify-between text-xs">
                    <span className="text-text-tertiary">Wallet</span>
                    <span className="text-text-secondary font-mono">
                      {profile.wallet.address.slice(0, 6)}...{profile.wallet.address.slice(-4)}
                    </span>
                  </div>
                )}
              </div>

              {profileMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                    profileMsg.type === "success"
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger"
                  }`}
                >
                  {profileMsg.type === "success" ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {profileMsg.text}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={profileSaving}
                className="btn-primary w-full text-sm"
              >
                {profileSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "Save Changes"
                )}
              </button>
            </form>
          </motion.div>

          {/* Password Section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel p-5 md:p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-warning/10">
                <Shield className="w-4 h-4 text-warning" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Change Password</h3>
                <p className="text-2xs text-text-tertiary">Update your account password</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input-field pl-10 pr-10"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field pl-10 pr-10"
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field pl-10 pr-10"
                    placeholder="Re-enter new password"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                  >
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-2xs text-danger mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Passwords do not match
                  </p>
                )}
              </div>

              {passwordMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                    passwordMsg.type === "success"
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger"
                  }`}
                >
                  {passwordMsg.type === "success" ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {passwordMsg.text}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                className="btn-primary w-full text-sm"
              >
                {passwordSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          </motion.div>
        </div>

        {/* Two-Factor Authentication */}
        <TwoFactorSetup />

        {/* Session Info */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel p-5 md:p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-info/10">
              <Shield className="w-4 h-4 text-info" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">Active Session</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-2xs text-text-tertiary mb-0.5">Signed in as</p>
              <p className="text-sm text-text-primary font-medium">{session?.user?.email || "—"}</p>
            </div>
            <div>
              <p className="text-2xs text-text-tertiary mb-0.5">Account Role</p>
              <p className="text-sm text-text-primary font-medium capitalize">
                {(session?.user as { role?: string })?.role?.replace("_", " ").toLowerCase() || "—"}
              </p>
            </div>
            <div>
              <p className="text-2xs text-text-tertiary mb-0.5">Wallet Status</p>
              <p className="text-sm font-medium">
                {profile?.wallet?.isConnected ? (
                  <span className="text-success">Connected</span>
                ) : (
                  <span className="text-text-tertiary">Not connected</span>
                )}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
