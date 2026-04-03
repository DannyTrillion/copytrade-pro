import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/layout/providers";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://copytrade-pro-theta.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "CopyTrade Pro — Professional Copy Trading Platform",
    template: "%s | CopyTrade Pro",
  },
  description:
    "Follow verified traders, copy winning strategies, and earn automatically. Real-time trade execution on Polymarket with sub-200ms latency. Join 2,800+ traders worldwide.",
  keywords: [
    "copy trading",
    "Polymarket",
    "automated trading",
    "crypto trading",
    "trade signals",
    "TradingView",
    "prediction markets",
    "portfolio management",
    "master traders",
    "copy trade platform",
  ],
  authors: [{ name: "CopyTrade Pro" }],
  creator: "CopyTrade Pro",
  publisher: "CopyTrade Pro",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "CopyTrade Pro",
    title: "CopyTrade Pro — Copy First, Then Earn",
    description:
      "Follow verified traders, copy winning strategies, and earn automatically. Real-time execution on Polymarket with sub-200ms latency. $0 to start, no credit card needed.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CopyTrade Pro — Copy First, Then Earn",
    description:
      "Follow verified traders, copy winning strategies, and earn automatically. Real-time execution on Polymarket. Join 2,800+ traders.",
    creator: "@CopyTradePro",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CopyTrade Pro",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
  },
  category: "finance",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#F8F9FB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <AnalyticsProvider />
          {children}
        </Providers>
      </body>
    </html>
  );
}
