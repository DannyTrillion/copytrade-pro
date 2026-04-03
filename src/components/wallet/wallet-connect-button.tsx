"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  Wallet,
  Link2Off,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { shortenAddress } from "@/lib/utils";

interface WalletConnectButtonProps {
  /** Compact mode for top-bar usage */
  compact?: boolean;
  /** Called after wallet is connected + verified with the backend */
  onConnectionChange?: (connected: boolean, address: string) => void;
}

export function WalletConnectButton({
  compact = false,
  onConnectionChange,
}: WalletConnectButtonProps) {
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();

  const [backendSynced, setBackendSynced] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  // Check existing wallet status from backend on mount
  useEffect(() => {
    const checkWallet = async () => {
      try {
        const res = await fetch("/api/wallet");
        if (res.ok) {
          const data = await res.json();
          if (data.wallet?.isConnected) {
            setBackendSynced(true);
            setVerified(!!data.wallet.verifiedAt);
            onConnectionChange?.(true, data.wallet.address);
          }
        }
      } catch {
        // Silently fail — wallet check is non-critical
      }
    };
    checkWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync wallet connection to backend when wagmi connects
  const syncToBackend = useCallback(async () => {
    if (!address || !isConnected || backendSynced) return;
    setSyncing(true);
    setError("");
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          chainId: 1,
          connector: connector?.name || null,
        }),
      });
      if (res.ok) {
        setBackendSynced(true);
        onConnectionChange?.(true, address);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to sync wallet");
      }
    } catch {
      setError("Network error syncing wallet");
    } finally {
      setSyncing(false);
    }
  }, [address, isConnected, backendSynced, connector, onConnectionChange]);

  useEffect(() => {
    if (isConnected && address && !backendSynced) {
      syncToBackend();
    }
  }, [isConnected, address, backendSynced, syncToBackend]);

  // Verify wallet ownership via signature
  const handleVerify = async () => {
    if (!address) return;
    setVerifying(true);
    setError("");

    const message = `CopyTrade Pro — Verify wallet ownership\n\nAddress: ${address}\nTimestamp: ${Date.now()}`;

    try {
      const signature = await signMessageAsync({ message });

      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          signature,
          message,
          chainId: 1,
          connector: connector?.name || null,
        }),
      });

      if (res.ok) {
        setVerified(true);
        setBackendSynced(true);
        onConnectionChange?.(true, address);
      } else {
        const data = await res.json();
        setError(data.error || "Verification failed");
      }
    } catch (err) {
      // User rejected signature or error
      if (err instanceof Error && err.message.includes("User rejected")) {
        setError("Signature rejected");
      } else {
        setError("Signature failed — please try again");
      }
    } finally {
      setVerifying(false);
    }
  };

  // Disconnect from both wagmi and backend
  const handleDisconnect = async () => {
    try {
      await fetch("/api/wallet", { method: "DELETE" });
    } catch {
      // Continue with local disconnect even if backend fails
    }
    disconnect();
    setBackendSynced(false);
    setVerified(false);
    setError("");
    onConnectionChange?.(false, "");
  };

  // ─── Compact mode (top-bar) ───
  if (compact) {
    if (isConnected && address) {
      return (
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-surface-3 transition-colors group"
          title={`${address} — Click to disconnect`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              verified ? "bg-success" : "bg-warning"
            }`}
          />
          <span className="text-xs font-mono text-text-secondary group-hover:text-text-primary">
            {shortenAddress(address)}
          </span>
        </button>
      );
    }
    return (
      <button
        onClick={() => openConnectModal?.()}
        className="p-2 rounded-md hover:bg-surface-3 transition-colors text-text-secondary hover:text-text-primary"
        title="Connect Wallet"
      >
        <Wallet className="w-4 h-4" />
      </button>
    );
  }

  // ─── Full mode (dashboard) ───
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 glass-panel">
          <div
            className={`w-2 h-2 rounded-full ${
              verified ? "bg-success" : "bg-warning animate-pulse"
            }`}
          />
          <span className="text-sm font-mono text-text-secondary">
            {shortenAddress(address)}
          </span>
          {verified && (
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
          )}
        </div>

        {!verified && (
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="btn-primary text-xs gap-1.5"
          >
            {verifying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            {verifying ? "Signing..." : "Verify"}
          </button>
        )}

        <button
          onClick={handleDisconnect}
          className="btn-danger text-sm gap-1.5"
        >
          <Link2Off className="w-3.5 h-3.5" />
          Disconnect
        </button>

        {(error || syncing) && (
          <span className="text-xs text-danger">{error}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => openConnectModal?.()}
        disabled={syncing}
        className="btn-primary text-sm gap-2"
      >
        {syncing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Wallet className="w-3.5 h-3.5" />
        )}
        Connect Wallet
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
