"use client";

import dynamic from "next/dynamic";
import { Wallet } from "lucide-react";

const Web3Provider = dynamic(
  () => import("@/components/layout/web3-provider").then((m) => m.Web3Provider),
  { ssr: false }
);

const WalletConnectButton = dynamic(
  () =>
    import("@/components/wallet/wallet-connect-button").then(
      (m) => m.WalletConnectButton
    ),
  {
    ssr: false,
    loading: () => (
      <button className="p-2 rounded-md text-text-secondary" disabled>
        <Wallet className="w-4 h-4" />
      </button>
    ),
  }
);

export function LazyWalletButton({ compact = false }: { compact?: boolean }) {
  return (
    <Web3Provider>
      <WalletConnectButton compact={compact} />
    </Web3Provider>
  );
}
