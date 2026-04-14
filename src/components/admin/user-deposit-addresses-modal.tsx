"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, Plus, Wallet, Copy, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";

interface UserDepositAddress {
  id: string;
  userId: string;
  coin: string;
  network: string;
  address: string;
  memo: string | null;
  createdAt: string;
}

interface Props {
  user: { id: string; name: string; email: string } | null;
  onClose: () => void;
}

const COIN_OPTIONS = [
  { coin: "BTC", networks: ["Bitcoin"] },
  { coin: "ETH", networks: ["ERC20", "Base", "Arbitrum", "Optimism"] },
  { coin: "USDT", networks: ["ERC20", "TRC20", "BEP20", "Polygon"] },
  { coin: "USDC", networks: ["ERC20", "Base", "Polygon", "Solana"] },
  { coin: "SOL", networks: ["Solana"] },
  { coin: "TRX", networks: ["TRC20"] },
  { coin: "BNB", networks: ["BEP20"] },
  { coin: "MATIC", networks: ["Polygon"] },
  { coin: "XRP", networks: ["XRP Ledger"] },
  { coin: "DOGE", networks: ["Dogecoin"] },
];

export function UserDepositAddressesModal({ user, onClose }: Props) {
  const [addresses, setAddresses] = useState<UserDepositAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [coin, setCoin] = useState("BTC");
  const [network, setNetwork] = useState("Bitcoin");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");

  const networks = COIN_OPTIONS.find((c) => c.coin === coin)?.networks || [];

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin?view=userDepositAddresses&userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchAddresses();
      setCoin("BTC");
      setNetwork("Bitcoin");
      setAddress("");
      setMemo("");
      setError(null);
    }
  }, [user, fetchAddresses]);

  // Auto-update network when coin changes
  useEffect(() => {
    const opt = COIN_OPTIONS.find((c) => c.coin === coin);
    if (opt && !opt.networks.includes(network)) {
      setNetwork(opt.networks[0]);
    }
  }, [coin, network]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !address.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setUserDepositAddress",
          userId: user.id,
          coin,
          network,
          address: address.trim(),
          memo: memo.trim() || null,
        }),
      });
      if (res.ok) {
        setAddress("");
        setMemo("");
        await fetchAddresses();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save address");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this deposit address?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteUserDepositAddress", id }),
      });
      if (res.ok) await fetchAddresses();
    } catch {
      /* silent */
    }
  };

  const handleCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* silent */
    }
  };

  return (
    <Modal
      isOpen={!!user}
      onClose={onClose}
      title={`Deposit Addresses — ${user?.name || ""}`}
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <p className="text-xs text-text-tertiary">
          These addresses override the global wallet for this user only. Used for direct crypto deposits.
        </p>

        {/* Existing addresses */}
        <div>
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Active addresses
          </h4>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
            </div>
          ) : addresses.length === 0 ? (
            <div className="bg-surface-1 rounded-lg p-4 text-center">
              <Wallet className="w-5 h-5 text-text-tertiary mx-auto mb-1.5" />
              <p className="text-xs text-text-tertiary">No custom addresses set</p>
              <p className="text-2xs text-text-tertiary mt-0.5">User will see global wallets</p>
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="bg-surface-1 rounded-lg p-3 border border-border"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-brand">{addr.coin}</span>
                      <span className="text-2xs text-text-tertiary px-1.5 py-0.5 rounded bg-surface-3">
                        {addr.network}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(addr.id, addr.address)}
                        className="p-1 rounded hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors"
                        title="Copy address"
                      >
                        {copiedId === addr.id ? (
                          <Check className="w-3 h-3 text-success" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(addr.id)}
                        className="p-1 rounded hover:bg-danger/10 text-text-tertiary hover:text-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-2xs font-mono text-text-primary break-all">{addr.address}</p>
                  {addr.memo && (
                    <p className="text-2xs text-text-tertiary mt-1">
                      Memo/Tag: <span className="font-mono">{addr.memo}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new */}
        <form onSubmit={handleSave} className="space-y-3 pt-3 border-t border-border">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Add or update address
          </h4>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-2xs font-medium text-text-secondary mb-1">Coin</label>
              <select
                value={coin}
                onChange={(e) => setCoin(e.target.value)}
                className="input-field text-xs"
              >
                {COIN_OPTIONS.map((c) => (
                  <option key={c.coin} value={c.coin}>{c.coin}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-2xs font-medium text-text-secondary mb-1">Network</label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="input-field text-xs"
              >
                {networks.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-2xs font-medium text-text-secondary mb-1">Wallet address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input-field font-mono text-xs"
              placeholder="0x... or bc1..."
              required
            />
          </div>

          <div>
            <label className="block text-2xs font-medium text-text-secondary mb-1">
              Memo / Tag <span className="text-text-tertiary">(optional)</span>
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="input-field font-mono text-xs"
              placeholder="For XRP, XLM, etc."
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <button
            type="submit"
            disabled={saving || !address.trim()}
            className="btn-primary w-full text-xs flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Save address
              </>
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
}
