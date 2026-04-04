"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  Copy,
  Check,
  Settings,
  CreditCard,
  Shield,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ─── Types ───
interface WalletConfig {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  network: string;
}

// ─── Wallet configurations ───
const WALLET_CONFIGS: WalletConfig[] = [
  {
    key: "DEPOSIT_WALLET_EVM",
    label: "EVM Deposit Wallet",
    description: "Ethereum, Base, BSC, Polygon — receives card purchase crypto (USDC, ETH, etc.)",
    placeholder: "0x...",
    network: "EVM",
  },
  {
    key: "DEPOSIT_WALLET_BTC",
    label: "Bitcoin Wallet",
    description: "Bitcoin network deposits",
    placeholder: "bc1... or 1... or 3...",
    network: "Bitcoin",
  },
  {
    key: "DEPOSIT_WALLET_SOL",
    label: "Solana Wallet",
    description: "Solana network deposits (SOL, USDC-SPL)",
    placeholder: "Base58 address...",
    network: "Solana",
  },
  {
    key: "DEPOSIT_WALLET_TRX",
    label: "TRON Wallet",
    description: "TRON network deposits (TRX, USDT-TRC20)",
    placeholder: "T...",
    network: "TRON",
  },
  {
    key: "DEPOSIT_WALLET_SUI",
    label: "SUI Wallet",
    description: "SUI network deposits",
    placeholder: "0x...",
    network: "SUI",
  },
];

// Simple EVM address validation
const isValidEvmAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customWallets, setCustomWallets] = useState<{ key: string; value: string }[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ─── Fetch config ───
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin?view=config");
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        // Initialize edit values from config
        const edits: Record<string, string> = {};
        WALLET_CONFIGS.forEach((w) => {
          edits[w.key] = data.config[w.key] || "";
        });
        setEditValues(edits);

        // Find custom wallet configs not in the predefined list
        const predefinedKeys = new Set(WALLET_CONFIGS.map((w) => w.key));
        const custom = Object.entries(data.config as Record<string, string>)
          .filter(([k]) => k.startsWith("DEPOSIT_WALLET_") || k.startsWith("WALLET_"))
          .filter(([k]) => !predefinedKeys.has(k))
          .map(([key, value]) => ({ key, value }));
        setCustomWallets(custom);
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // ─── Save wallet ───
  const handleSave = async (key: string) => {
    const value = editValues[key]?.trim();
    if (!value) return;

    setSaving(key);
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setConfig", key, value }),
      });

      if (res.ok) {
        setConfig((prev) => ({ ...prev, [key]: value }));
        toast.success("Wallet address saved");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(null);
    }
  };

  // ─── Delete wallet ───
  const handleDelete = async (key: string) => {
    setDeleting(key);
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteConfig", key }),
      });

      if (res.ok) {
        setConfig((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setEditValues((prev) => ({ ...prev, [key]: "" }));
        setCustomWallets((prev) => prev.filter((w) => w.key !== key));
        toast.success("Wallet address removed");
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  // ─── Add custom wallet ───
  const handleAddCustom = async () => {
    const key = customKey.trim().toUpperCase().replace(/\s+/g, "_");
    const value = customValue.trim();
    if (!key || !value) return;

    const fullKey = key.startsWith("WALLET_") || key.startsWith("DEPOSIT_WALLET_")
      ? key
      : `WALLET_${key}`;

    setSaving(fullKey);
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setConfig", key: fullKey, value }),
      });

      if (res.ok) {
        setConfig((prev) => ({ ...prev, [fullKey]: value }));
        setCustomWallets((prev) => [...prev, { key: fullKey, value }]);
        setCustomKey("");
        setCustomValue("");
        setShowAddCustom(false);
        toast.success("Custom wallet added");
      } else {
        toast.error("Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(null);
    }
  };

  // ─── Copy address ───
  const copyAddress = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ─── Helpers ───
  const hasChanged = (key: string) =>
    editValues[key]?.trim() !== (config[key] || "");

  const getValidation = (key: string, value: string) => {
    if (!value) return null;
    if (key.includes("EVM") || key.includes("ETH") || key.includes("BNB") || key.includes("SUI")) {
      return isValidEvmAddress(value) ? "valid" : "invalid";
    }
    return value.length > 10 ? "valid" : null;
  };

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
      <div className="dashboard-section space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand" />
              Platform Settings
            </h1>
            <p className="text-sm text-text-tertiary mt-1">
              Configure deposit wallets and payment settings
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchConfig(); }}
            className="btn-secondary text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </motion.div>

        {/* ═══ Deposit Wallets Section ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-semibold text-text-primary">Deposit Wallet Addresses</h2>
          </div>
          <p className="text-xs text-text-tertiary mb-4">
            These are the wallet addresses where crypto purchased via card payments and direct deposits will land.
            The EVM wallet is used by Thirdweb and MoonPay for card purchases.
          </p>

          <div className="space-y-3">
            {WALLET_CONFIGS.map((walletConfig, i) => {
              const value = editValues[walletConfig.key] || "";
              const saved = config[walletConfig.key] || "";
              const changed = hasChanged(walletConfig.key);
              const validation = getValidation(walletConfig.key, value);
              const isSaving = saving === walletConfig.key;

              return (
                <motion.div
                  key={walletConfig.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * (i + 1) }}
                  className="card p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-text-primary">
                          {walletConfig.label}
                        </h3>
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-surface-2 text-text-tertiary font-mono">
                          {walletConfig.network}
                        </span>
                        {saved && (
                          <span className="text-2xs px-1.5 py-0.5 rounded bg-success/10 text-success flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {walletConfig.description}
                      </p>
                    </div>
                    {saved && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyAddress(walletConfig.key, saved)}
                          className="p-1.5 rounded-md hover:bg-surface-2 text-text-tertiary hover:text-text-primary transition-colors"
                          title="Copy address"
                        >
                          {copiedKey === walletConfig.key ? (
                            <Check className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(walletConfig.key)}
                          className="p-1.5 rounded-md hover:bg-danger/10 text-text-tertiary hover:text-danger transition-colors"
                          title="Remove wallet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={value}
                        onChange={(e) =>
                          setEditValues((prev) => ({ ...prev, [walletConfig.key]: e.target.value }))
                        }
                        placeholder={walletConfig.placeholder}
                        className={`input-field text-sm font-mono pr-8 ${
                          validation === "invalid"
                            ? "border-danger/50 focus:border-danger"
                            : validation === "valid"
                            ? "border-success/30 focus:border-success"
                            : ""
                        }`}
                        spellCheck={false}
                      />
                      {validation && (
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          {validation === "valid" ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-danger" />
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleSave(walletConfig.key)}
                      disabled={!changed || !value || isSaving || validation === "invalid"}
                      className="btn-primary text-xs gap-1.5 shrink-0"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      {isSaving ? "Saving..." : saved ? "Update" : "Save"}
                    </button>
                  </div>

                  {validation === "invalid" && (
                    <p className="text-2xs text-danger mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Invalid address format
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ═══ Custom Wallets ═══ */}
        {customWallets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-sm font-semibold text-text-primary mb-3">Custom Wallets</h2>
            <div className="space-y-3">
              {customWallets.map((cw) => (
                <div key={cw.key} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-text-secondary">{cw.key}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyAddress(cw.key, cw.value)}
                        className="p-1.5 rounded-md hover:bg-surface-2 text-text-tertiary hover:text-text-primary transition-colors"
                      >
                        {copiedKey === cw.key ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cw.key)}
                        className="p-1.5 rounded-md hover:bg-danger/10 text-text-tertiary hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-mono text-text-tertiary break-all">{cw.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ Add Custom Wallet ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {showAddCustom ? (
            <div className="card p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">Add Custom Wallet</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">
                    Wallet Label (e.g. MATIC, AVAX, ARB)
                  </label>
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="MATIC"
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="0x..."
                    className="input-field text-sm font-mono"
                    spellCheck={false}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCustom}
                    disabled={!customKey.trim() || !customValue.trim() || saving !== null}
                    className="btn-primary text-xs gap-1.5"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save Wallet
                  </button>
                  <button
                    onClick={() => {
                      setShowAddCustom(false);
                      setCustomKey("");
                      setCustomValue("");
                    }}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddCustom(true)}
              className="btn-secondary text-xs gap-1.5 w-full justify-center py-3 border-dashed"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Custom Wallet
            </button>
          )}
        </motion.div>

        {/* ═══ Info Card ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card p-4 bg-brand/5 border-brand/10"
        >
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-1">How it works</h3>
              <ul className="text-xs text-text-secondary space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <CreditCard className="w-3 h-3 mt-0.5 text-text-tertiary shrink-0" />
                  <span>
                    <strong>Card Payments</strong> — When users pay with card via Thirdweb or MoonPay,
                    purchased crypto (USDC) lands in the <strong>EVM Deposit Wallet</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Wallet className="w-3 h-3 mt-0.5 text-text-tertiary shrink-0" />
                  <span>
                    <strong>Direct Deposits</strong> — Users sending crypto directly use the network-specific
                    wallet (BTC, SOL, TRX, SUI).
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Shield className="w-3 h-3 mt-0.5 text-text-tertiary shrink-0" />
                  <span>
                    Wallet addresses are stored securely in the database and never exposed to users.
                    Only admins can view and edit them.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ Delete Confirmation ═══ */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remove Wallet"
        message={`Remove the wallet address for "${deleteTarget}"? Users won't be able to deposit to this network until a new address is set.`}
        confirmLabel="Remove"
        variant="danger"
        loading={deleting !== null}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
