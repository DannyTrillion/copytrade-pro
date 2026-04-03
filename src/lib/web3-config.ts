import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, polygon, arbitrum, optimism, base } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "CopyTrade Pro",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id",
  chains: [mainnet, polygon, arbitrum, optimism, base],
  ssr: true,
});
