"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const Web3Provider = dynamic(
  () => import("@/components/layout/web3-provider").then((m) => m.Web3Provider),
  { ssr: false }
);

const FollowerDashboard = dynamic(
  () =>
    import("./follower-content").then((m) => m.FollowerDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
      </div>
    ),
  }
);

export default function FollowerPage() {
  return (
    <Web3Provider>
      <FollowerDashboard />
    </Web3Provider>
  );
}
