"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Settings,
  Save,
  Wallet,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
  Download,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { downloadCSV } from "@/lib/csv";

interface DepositRow {
  id: string;
  amount: number;
  method: string;
  coin: string | null;
  network: string | null;
  txHash: string | null;
  proofUrl: string | null;
  status: string;
  userWallet: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

const STATUS_STYLES: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  PENDING: { icon: Clock, color: "text-warning bg-warning/10" },
  CONFIRMED: { icon: CheckCircle2, color: "text-success bg-success/10" },
  REJECTED: { icon: XCircle, color: "text-danger bg-danger/10" },
};

// Supported coins and networks — must match user deposit page
const COIN_NETWORKS = [
  { coin: "BTC", network: "Bitcoin", label: "Bitcoin — Bitcoin Network" },
  { coin: "ETH", network: "ERC20", label: "Ethereum — ERC20" },
  { coin: "USDT", network: "ERC20", label: "USDT — ERC20 (Ethereum)" },
  { coin: "USDT", network: "TRC20", label: "USDT — TRC20 (Tron)" },
  { coin: "USDT", network: "BEP20", label: "USDT — BEP20 (BSC)" },
  { coin: "USDT", network: "SOL", label: "USDT — Solana" },
  { coin: "USDC", network: "ERC20", label: "USDC — ERC20 (Ethereum)" },
  { coin: "USDC", network: "TRC20", label: "USDC — TRC20 (Tron)" },
  { coin: "USDC", network: "BEP20", label: "USDC — BEP20 (BSC)" },
  { coin: "USDC", network: "SOL", label: "USDC — Solana" },
  { coin: "BNB", network: "BEP20", label: "BNB — BEP20 (BSC)" },
  { coin: "SOL", network: "Solana", label: "Solana — Solana Network" },
  { coin: "TRX", network: "TRC20", label: "TRON — TRC20" },
];

interface WalletEntry {
  coin: string;
  network: string;
  label: string;
  address: string;
  saving: boolean;
}

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // Default wallet (fallback for all coins)
  const [defaultWallet, setDefaultWallet] = useState("");
  const [savingDefault, setSavingDefault] = useState(false);
  const [defaultMsg, setDefaultMsg] = useState("");

  // Per-coin wallets
  const [walletEntries, setWalletEntries] = useState<WalletEntry[]>([]);
  const [walletsExpanded, setWalletsExpanded] = useState(true);

  // Add new wallet dropdown
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [dRes, cRes] = await Promise.all([
        fetch("/api/admin?view=deposits"),
        fetch("/api/admin?view=config"),
      ]);
      if (dRes.ok) {
        const data = await dRes.json();
        setDeposits(data.deposits || []);
      }
      if (cRes.ok) {
        const data = await cRes.json();
        const configMap: Record<string, string> = data.config || {};
        setDefaultWallet(configMap.deposit_wallet || "");

        // Parse per-coin wallet configs
        const entries: WalletEntry[] = [];
        for (const [key, value] of Object.entries(configMap)) {
          if (key.startsWith("wallet_")) {
            const rest = key.replace("wallet_", "");
            const underscoreIdx = rest.indexOf("_");
            if (underscoreIdx > 0) {
              const coin = rest.slice(0, underscoreIdx);
              const network = rest.slice(underscoreIdx + 1);
              const match = COIN_NETWORKS.find((cn) => cn.coin === coin && cn.network === network);
              entries.push({
                coin,
                network,
                label: match?.label || `${coin} — ${network}`,
                address: value,
                saving: false,
              });
            }
          }
        }
        setWalletEntries(entries);
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

  const handleReview = async (depositId: string, status: "CONFIRMED" | "REJECTED") => {
    setProcessing(depositId);
    try {
      await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reviewDeposit", depositId, status }),
      });
      fetchData();
    } catch {
      // silent
    } finally {
      setProcessing(null);
    }
  };

  const saveConfig = async (key: string, value: string) => {
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setConfig", key, value }),
    });
    return res.ok;
  };

  const deleteConfig = async (key: string) => {
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteConfig", key }),
    });
    return res.ok;
  };

  const handleSaveDefault = async () => {
    setSavingDefault(true);
    setDefaultMsg("");
    const ok = await saveConfig("deposit_wallet", defaultWallet);
    setDefaultMsg(ok ? "Saved" : "Failed");
    setTimeout(() => setDefaultMsg(""), 3000);
    setSavingDefault(false);
  };

  const handleSaveEntry = async (index: number) => {
    const entry = walletEntries[index];
    setWalletEntries((prev) => prev.map((e, i) => i === index ? { ...e, saving: true } : e));
    const key = `wallet_${entry.coin}_${entry.network}`;
    await saveConfig(key, entry.address);
    setWalletEntries((prev) => prev.map((e, i) => i === index ? { ...e, saving: false } : e));
  };

  const handleDeleteEntry = async (index: number) => {
    const entry = walletEntries[index];
    const key = `wallet_${entry.coin}_${entry.network}`;
    setWalletEntries((prev) => prev.map((e, i) => i === index ? { ...e, saving: true } : e));
    const ok = await deleteConfig(key);
    if (ok) {
      setWalletEntries((prev) => prev.filter((_, i) => i !== index));
    } else {
      setWalletEntries((prev) => prev.map((e, i) => i === index ? { ...e, saving: false } : e));
    }
  };

  const handleUpdateAddress = (index: number, address: string) => {
    setWalletEntries((prev) => prev.map((e, i) => i === index ? { ...e, address } : e));
  };

  const handleAddCoin = (coin: string, network: string) => {
    const match = COIN_NETWORKS.find((cn) => cn.coin === coin && cn.network === network);
    // Don't add duplicates
    if (walletEntries.some((e) => e.coin === coin && e.network === network)) {
      setShowAddDropdown(false);
      return;
    }
    setWalletEntries((prev) => [
      ...prev,
      { coin, network, label: match?.label || `${coin} — ${network}`, address: "", saving: false },
    ]);
    setShowAddDropdown(false);
  };

  // Coins not yet configured
  const availableToAdd = COIN_NETWORKS.filter(
    (cn) => !walletEntries.some((e) => e.coin === cn.coin && e.network === cn.network)
  );

  const pendingCount = deposits.filter((d) => d.status === "PENDING").length;

  const handleExportCSV = () => {
    const headers = ["User", "Email", "Amount", "Method", "Coin", "Network", "Status", "Date", "TX Hash"];
    const rows = deposits.map((d) => [
      d.user.name,
      d.user.email,
      String(d.amount),
      d.method,
      d.coin || "",
      d.network || "",
      d.status,
      new Date(d.createdAt).toLocaleDateString(),
      d.txHash || "",
    ]);
    downloadCSV("deposits", headers, rows);
  };

  if (loading) {
    return (
      <div className="dashboard-section">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        {/* Wallet config skeleton */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-72" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-surface-1 border border-border space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        {/* Table skeleton */}
        <div className="glass-panel overflow-hidden">
          <div className="border-b border-border bg-surface-1/30">
            <div className="grid grid-cols-7 gap-4 px-4 py-2.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-16" />
              ))}
            </div>
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-7 gap-4 px-4 py-3 border-b border-border/50">
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-20 rounded-full mx-auto" />
              <Skeleton className="h-3 w-24" />
              <div className="flex gap-1 justify-center">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-section">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Deposit Management</h2>
          <p className="text-sm text-text-tertiary mt-0.5">
            {pendingCount > 0 ? `${pendingCount} pending deposit(s) to review` : "All deposits reviewed"}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="btn-secondary btn-sm inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </motion.div>

      {/* ═══ Wallet Configuration ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-panel overflow-hidden"
      >
        {/* Header */}
        <button
          onClick={() => setWalletsExpanded(!walletsExpanded)}
          className="w-full flex items-center justify-between p-5 hover:bg-surface-1/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand/10">
              <Wallet className="w-4 h-4 text-brand" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-text-primary">Deposit Wallet Addresses</h3>
              <p className="text-2xs text-text-tertiary mt-0.5">
                Set wallet addresses per coin & network. Users see the matching address for their selected coin.
              </p>
            </div>
          </div>
          {walletsExpanded ? <ChevronUp className="w-4 h-4 text-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-text-tertiary" />}
        </button>

        <AnimatePresence>
          {walletsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-4">
                {/* Default wallet */}
                <div className="p-4 rounded-xl bg-surface-1 border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-text-tertiary" />
                    <span className="text-xs font-semibold text-text-primary">Default Wallet (Fallback)</span>
                  </div>
                  <p className="text-2xs text-text-tertiary">Used when no coin-specific wallet is configured.</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={defaultWallet}
                      onChange={(e) => setDefaultWallet(e.target.value)}
                      className="input-field flex-1 font-mono text-xs"
                      placeholder="0x... or wallet address"
                    />
                    <button onClick={handleSaveDefault} disabled={savingDefault} className="btn-primary text-sm flex items-center gap-2 shrink-0">
                      {savingDefault ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>
                  {defaultMsg && <p className={`text-xs ${defaultMsg === "Saved" ? "text-success" : "text-danger"}`}>{defaultMsg}</p>}
                </div>

                {/* Per-coin wallets */}
                {walletEntries.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Coin-Specific Wallets</p>
                    {walletEntries.map((entry, i) => (
                      <div key={`${entry.coin}_${entry.network}`} className="p-3 rounded-lg bg-surface-1 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center text-brand text-2xs font-bold">
                              {entry.coin[0]}
                            </div>
                            <span className="text-xs font-medium text-text-primary">{entry.label}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteEntry(i)}
                            disabled={entry.saving}
                            className="p-1 rounded hover:bg-danger/10 text-text-tertiary hover:text-danger transition-colors"
                            title="Remove this wallet"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={entry.address}
                            onChange={(e) => handleUpdateAddress(i, e.target.value)}
                            className="input-field flex-1 font-mono text-xs"
                            placeholder={`Paste ${entry.coin} (${entry.network}) wallet address`}
                          />
                          <button
                            onClick={() => handleSaveEntry(i)}
                            disabled={entry.saving || !entry.address}
                            className="btn-primary text-xs flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                          >
                            {entry.saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Save
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add coin button */}
                <div className="relative">
                  <button
                    onClick={() => setShowAddDropdown(!showAddDropdown)}
                    className="btn-secondary text-xs gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Coin Wallet
                  </button>

                  <AnimatePresence>
                    {showAddDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute left-0 top-full mt-1 w-72 glass-panel-elevated overflow-hidden z-20 max-h-64 overflow-y-auto"
                      >
                        {availableToAdd.length > 0 ? (
                          availableToAdd.map((cn) => (
                            <button
                              key={`${cn.coin}_${cn.network}`}
                              onClick={() => handleAddCoin(cn.coin, cn.network)}
                              className="w-full text-left px-4 py-2.5 text-xs hover:bg-surface-3 transition-colors border-b border-border last:border-0 flex items-center gap-2"
                            >
                              <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center text-brand text-2xs font-bold shrink-0">
                                {cn.coin[0]}
                              </div>
                              <span className="text-text-primary">{cn.label}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-xs text-text-tertiary text-center">
                            All coins configured
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Info notice */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-info/5 border border-info/10">
                  <AlertCircle className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
                  <p className="text-2xs text-text-secondary leading-relaxed">
                    When a user selects a coin and network, the matching wallet address is shown. If no specific address is set,
                    the default wallet is displayed. Changes take effect immediately for new deposits.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ═══ Deposits Table ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-1/30 sticky top-0 z-10">
                <th className="table-header px-4 py-2.5 text-left">User</th>
                <th className="table-header px-4 py-2.5 text-left">Method</th>
                <th className="table-header px-4 py-2.5 text-right">Amount</th>
                <th className="table-header px-4 py-2.5 text-left">TX / Proof</th>
                <th className="table-header px-4 py-2.5 text-center">Status</th>
                <th className="table-header px-4 py-2.5 text-right">Date</th>
                <th className="table-header px-4 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((d, i) => {
                const statusStyle = STATUS_STYLES[d.status] || STATUS_STYLES.PENDING;
                const StatusIcon = statusStyle.icon;
                return (
                  <tr key={d.id} className={`table-row ${i % 2 === 1 ? 'bg-surface-2/20' : ''}`}>
                    <td className="table-cell">
                      <p className="text-sm text-text-primary">{d.user.name}</p>
                      <p className="text-2xs text-text-tertiary">{d.user.email}</p>
                    </td>
                    <td className="table-cell">
                      <p className="text-sm text-text-primary">{d.method}</p>
                      {d.coin && <p className="text-2xs text-text-tertiary">{d.coin} — {d.network}</p>}
                    </td>
                    <td className="table-cell text-right text-sm font-medium text-success">
                      +{formatCurrency(d.amount)}
                    </td>
                    <td className="table-cell">
                      {d.txHash ? (
                        <code className="text-2xs text-text-tertiary font-mono">{d.txHash.slice(0, 14)}...</code>
                      ) : d.proofUrl ? (
                        <a href={d.proofUrl} target="_blank" rel="noopener noreferrer" className="text-2xs text-brand hover:text-brand-light transition-colors">
                          View proof
                        </a>
                      ) : (
                        <span className="text-2xs text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusStyle.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {d.status}
                      </span>
                    </td>
                    <td className="table-cell text-right text-xs text-text-tertiary">
                      {formatDate(d.createdAt)}
                    </td>
                    <td className="table-cell text-center">
                      {d.status === "PENDING" ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleReview(d.id, "CONFIRMED")}
                            disabled={processing === d.id}
                            className="p-1.5 rounded-md hover:bg-success/10 transition-colors text-success"
                            title="Confirm"
                          >
                            {processing === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleReview(d.id, "REJECTED")}
                            disabled={processing === d.id}
                            className="p-1.5 rounded-md hover:bg-danger/10 transition-colors text-danger"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-2xs text-text-tertiary">Reviewed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {deposits.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-sm text-text-tertiary">
                    No deposit requests
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
