"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Check,
  AlertCircle,
  Copy,
  KeyRound,
  Download,
  RefreshCw,
} from "lucide-react";

type SetupStep = "idle" | "loading" | "qr" | "verifying" | "disabling" | "backup-codes" | "regenerating";

interface StatusMessage {
  type: "success" | "error";
  text: string;
}

export function TwoFactorSetup() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<SetupStep>("idle");
  const [secret, setSecret] = useState("");
  const [otpauthURL, setOtpauthURL] = useState("");
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [copied, setCopied] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);
  const [regenCode, setRegenCode] = useState("");
  const codeInputRef = useRef<HTMLInputElement>(null);
  const disableInputRef = useRef<HTMLInputElement>(null);
  const regenInputRef = useRef<HTMLInputElement>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/two-factor");
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleStartSetup = async () => {
    setStep("loading");
    setStatus(null);

    try {
      const res = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });

      const data = await res.json();

      if (res.ok) {
        setSecret(data.secret);
        setOtpauthURL(data.otpauthURL);
        setStep("qr");
        setCode("");
        // Focus the code input after render
        setTimeout(() => codeInputRef.current?.focus(), 300);
      } else {
        setStatus({ type: "error", text: data.error || "Setup failed" });
        setStep("idle");
      }
    } catch {
      setStatus({ type: "error", text: "Network error" });
      setStep("idle");
    }
  };

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setStep("verifying");
    setStatus(null);

    try {
      const res = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-setup", code }),
      });

      const data = await res.json();

      if (res.ok) {
        setEnabled(true);
        setSecret("");
        setOtpauthURL("");
        setCode("");
        if (data.backupCodes && data.backupCodes.length > 0) {
          setBackupCodes(data.backupCodes);
          setStep("backup-codes");
        } else {
          setStep("idle");
          setStatus({ type: "success", text: "Two-factor authentication enabled" });
        }
      } else {
        setStatus({ type: "error", text: data.error || "Verification failed" });
        setStep("qr");
        setCode("");
        setTimeout(() => codeInputRef.current?.focus(), 100);
      }
    } catch {
      setStatus({ type: "error", text: "Network error" });
      setStep("qr");
    }
  };

  const handleStartDisable = () => {
    setStep("disabling");
    setDisableCode("");
    setStatus(null);
    setTimeout(() => disableInputRef.current?.focus(), 100);
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disableCode.length !== 6) return;

    setStatus(null);

    try {
      const res = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", code: disableCode }),
      });

      const data = await res.json();

      if (res.ok) {
        setEnabled(false);
        setStep("idle");
        setDisableCode("");
        setStatus({ type: "success", text: "Two-factor authentication disabled" });
      } else {
        setStatus({ type: "error", text: data.error || "Failed to disable 2FA" });
        setDisableCode("");
        setTimeout(() => disableInputRef.current?.focus(), 100);
      }
    } catch {
      setStatus({ type: "error", text: "Network error" });
    }
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — select the text
    }
  };

  const handleCancel = () => {
    setStep("idle");
    setSecret("");
    setOtpauthURL("");
    setCode("");
    setDisableCode("");
    setRegenCode("");
    setStatus(null);
  };

  const handleDownloadBackupCodes = () => {
    const content = [
      "CopyTrade Pro — Two-Factor Authentication Backup Codes",
      "=" .repeat(55),
      "",
      "Each code can only be used once.",
      "Store these codes in a safe place.",
      "",
      ...backupCodes.map((code, i) => `${(i + 1).toString().padStart(2, " ")}. ${code}`),
      "",
      `Generated: ${new Date().toISOString()}`,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "copytrade-pro-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setBackupCodesCopied(true);
      setTimeout(() => setBackupCodesCopied(false), 2000);
    } catch {
      // Silent fail
    }
  };

  const handleDismissBackupCodes = () => {
    setBackupCodes([]);
    setStep("idle");
    setStatus({ type: "success", text: "Two-factor authentication enabled" });
  };

  const handleStartRegenerate = () => {
    setStep("regenerating");
    setRegenCode("");
    setStatus(null);
    setTimeout(() => regenInputRef.current?.focus(), 100);
  };

  const handleRegenerateBackupCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regenCode.length !== 6) return;

    setStatus(null);

    try {
      const res = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate-backup-codes", code: regenCode }),
      });

      const data = await res.json();

      if (res.ok && data.backupCodes) {
        setBackupCodes(data.backupCodes);
        setRegenCode("");
        setStep("backup-codes");
      } else {
        setStatus({ type: "error", text: data.error || "Failed to regenerate backup codes" });
        setRegenCode("");
        setTimeout(() => regenInputRef.current?.focus(), 100);
      }
    } catch {
      setStatus({ type: "error", text: "Network error" });
    }
  };

  // Code input handler — only allow digits, auto-advance
  const handleCodeInput = (
    value: string,
    setter: (v: string) => void
  ) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setter(cleaned);
  };

  if (loading) {
    return (
      <div className="glass-panel p-5 md:p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel p-5 md:p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${enabled ? "bg-success/10" : "bg-brand/10"}`}>
            {enabled ? (
              <ShieldCheck className="w-4 h-4 text-success" />
            ) : (
              <Shield className="w-4 h-4 text-brand" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Two-Factor Authentication
            </h3>
            <p className="text-2xs text-text-tertiary">
              {enabled
                ? "Your account is protected with 2FA"
                : "Add an extra layer of security"}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div
          className={`px-2.5 py-1 rounded-full text-2xs font-medium ${
            enabled
              ? "bg-success/10 text-success border border-success/20"
              : "bg-surface-2 text-text-tertiary border border-border"
          }`}
        >
          {enabled ? "Enabled" : "Disabled"}
        </div>
      </div>

      {/* Step indicator for setup flow */}
      {["qr", "verifying", "backup-codes"].includes(step) && (
        <div className="flex items-center justify-center gap-2 mb-5">
          {[1, 2, 3].map((s) => {
            const currentStep = step === "qr" ? 1 : step === "verifying" ? 2 : 3;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  currentStep >= s ? "bg-brand" : "bg-surface-3"
                }`} />
                {s < 3 && <div className={`w-8 h-px transition-colors duration-300 ${
                  currentStep > s ? "bg-brand" : "bg-border"
                }`} />}
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ─── Idle State ─── */}
        {step === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {!enabled ? (
              <div className="space-y-4">
                <div className="bg-surface-1 border border-border rounded-lg p-4">
                  <div className="flex gap-3">
                    <KeyRound className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs text-text-secondary">
                        Use an authenticator app like Google Authenticator, Authy, or 1Password to
                        generate verification codes.
                      </p>
                      <p className="text-xs text-text-tertiary">
                        You will be asked for a code each time you sign in.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartSetup}
                  className="btn-primary w-full text-sm"
                >
                  Enable Two-Factor Authentication
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-success/5 border border-success/10 rounded-lg p-4">
                  <div className="flex gap-3">
                    <ShieldCheck className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    <p className="text-xs text-text-secondary">
                      Your account is secured with two-factor authentication. You will need your
                      authenticator app to sign in.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleStartRegenerate}
                  className="w-full text-sm px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:bg-surface-1 transition-colors font-medium"
                >
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Regenerate Backup Codes
                  </span>
                </button>

                <button
                  onClick={handleStartDisable}
                  className="w-full text-sm px-4 py-2.5 rounded-lg border border-danger/20 text-danger hover:bg-danger/10 transition-colors font-medium"
                >
                  <span className="flex items-center justify-center gap-2">
                    <ShieldOff className="w-4 h-4" />
                    Disable Two-Factor Authentication
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Loading State ─── */}
        {step === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-8"
          >
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
          </motion.div>
        )}

        {/* ─── QR Code + Verification ─── */}
        {(step === "qr" || step === "verifying") && (
          <motion.div
            key="qr"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* Step 1: Scan QR */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand/10 text-brand text-2xs font-bold">
                  1
                </span>
                <p className="text-xs font-medium text-text-primary">
                  Scan this QR code with your authenticator app
                </p>
              </div>

              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl">
                  <QRCodeSVG
                    value={otpauthURL}
                    size={180}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              </div>
            </div>

            {/* Manual entry */}
            <div className="space-y-2">
              <p className="text-2xs text-text-tertiary">
                Or enter this secret key manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-surface-1 border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-secondary break-all select-all">
                  {secret}
                </code>
                <button
                  onClick={handleCopySecret}
                  className="p-2 rounded-lg border border-border hover:bg-surface-1 transition-colors shrink-0"
                  title="Copy secret"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-text-tertiary" />
                  )}
                </button>
              </div>
            </div>

            {/* Step 2: Enter code */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand/10 text-brand text-2xs font-bold">
                  2
                </span>
                <p className="text-xs font-medium text-text-primary">
                  Enter the 6-digit code from your app
                </p>
              </div>

              <form onSubmit={handleVerifySetup} className="space-y-3">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    ref={codeInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => handleCodeInput(e.target.value, setCode)}
                    placeholder="000000"
                    maxLength={6}
                    className="input-field pl-10 text-center font-mono text-lg tracking-[0.3em] placeholder:tracking-[0.3em]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 text-sm px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:bg-surface-1 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={code.length !== 6 || step === "verifying"}
                    className="flex-1 btn-primary text-sm"
                  >
                    {step === "verifying" ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      "Verify & Enable"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* ─── Disable Flow ─── */}
        {step === "disabling" && (
          <motion.div
            key="disabling"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="bg-danger/5 border border-danger/10 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
                <p className="text-xs text-text-secondary">
                  Enter your current authenticator code to disable two-factor authentication.
                  This will make your account less secure.
                </p>
              </div>
            </div>

            <form onSubmit={handleDisable} className="space-y-3">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  ref={disableInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={disableCode}
                  onChange={(e) => handleCodeInput(e.target.value, setDisableCode)}
                  placeholder="000000"
                  maxLength={6}
                  className="input-field pl-10 text-center font-mono text-lg tracking-[0.3em] placeholder:tracking-[0.3em]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 text-sm px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:bg-surface-1 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disableCode.length !== 6}
                  className="flex-1 text-sm px-4 py-2.5 rounded-lg bg-danger text-white hover:bg-danger/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Disable 2FA
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ─── Backup Codes Display ─── */}
        {step === "backup-codes" && backupCodes.length > 0 && (
          <motion.div
            key="backup-codes"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-text-primary">
                    Save these backup codes
                  </p>
                  <p className="text-xs text-text-secondary">
                    Save these codes securely. Each code can only be used once. If you lose access
                    to your authenticator app, you can use these codes to sign in.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((bCode, i) => (
                <div
                  key={i}
                  className="bg-surface-1 border border-border rounded-lg px-3 py-2 text-center"
                >
                  <code className="text-xs font-mono text-text-primary tracking-wider">
                    {bCode}
                  </code>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadBackupCodes}
                className="flex-1 text-sm px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:bg-surface-1 transition-colors font-medium"
              >
                <span className="flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Download
                </span>
              </button>
              <button
                onClick={handleCopyBackupCodes}
                className="flex-1 text-sm px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:bg-surface-1 transition-colors font-medium"
              >
                <span className="flex items-center justify-center gap-2">
                  {backupCodesCopied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {backupCodesCopied ? "Copied" : "Copy All"}
                </span>
              </button>
            </div>

            <button
              onClick={handleDismissBackupCodes}
              className="btn-primary w-full text-sm"
            >
              <span className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                I&apos;ve saved my codes
              </span>
            </button>
          </motion.div>
        )}

        {/* ─── Regenerate Backup Codes Flow ─── */}
        {step === "regenerating" && (
          <motion.div
            key="regenerating"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="bg-surface-1 border border-border rounded-lg p-4">
              <div className="flex gap-3">
                <RefreshCw className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                <p className="text-xs text-text-secondary">
                  Enter your current authenticator code to regenerate backup codes.
                  This will invalidate all existing backup codes.
                </p>
              </div>
            </div>

            <form onSubmit={handleRegenerateBackupCodes} className="space-y-3">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  ref={regenInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={regenCode}
                  onChange={(e) => handleCodeInput(e.target.value, setRegenCode)}
                  placeholder="000000"
                  maxLength={6}
                  className="input-field pl-10 text-center font-mono text-lg tracking-[0.3em] placeholder:tracking-[0.3em]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 text-sm px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:bg-surface-1 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regenCode.length !== 6}
                  className="flex-1 btn-primary text-sm"
                >
                  Regenerate Codes
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Status Message ─── */}
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mt-4 ${
              status.type === "success"
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            }`}
          >
            {status.type === "success" ? (
              <Check className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            )}
            {status.text}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
