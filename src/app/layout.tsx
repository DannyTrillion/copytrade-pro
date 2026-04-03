import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/layout/providers";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "CopyTrade Pro — Professional Copy Trading Platform",
  description:
    "Professional copy trading platform with TradingView alerts and Polymarket execution",
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
