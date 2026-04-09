import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/layout/providers";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://copytrade-pro-theta.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "Webull CopyTradesPro — Automated Copy Trading",
    template: "%s | Webull CopyTradesPro",
  },
  description:
    "Private access to Webull-powered copy trading infrastructure for advanced traders.",
  authors: [{ name: "CopyTradesPro" }],
  creator: "CopyTradesPro",
  publisher: "CopyTradesPro",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Webull CopyTradesPro",
    title: "Webull CopyTradesPro — Automated Copy Trading",
    description:
      "Private access to Webull-powered copy trading infrastructure for advanced traders.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Webull CopyTradesPro" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Webull CopyTradesPro — Automated Copy Trading",
    description:
      "Private access to Webull-powered copy trading infrastructure for advanced traders.",
    images: ["/og-image.png"],
  },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
  other: {
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Webull CopyTradesPro",
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
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning style={{ colorScheme: "dark", backgroundColor: "#000000" }}>
      <head>
        {process.env.NODE_ENV === "production" && (
          <script dangerouslySetInnerHTML={{ __html: `
            document.addEventListener('contextmenu',function(e){e.preventDefault()});
            document.addEventListener('keydown',function(e){
              if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='I'||e.key==='J'||e.key==='C'))e.preventDefault();
              if(e.key==='F12')e.preventDefault();
              if((e.ctrlKey||e.metaKey)&&e.key==='u')e.preventDefault();
            });
          `}} />
        )}
      </head>
      <body className="antialiased" style={{ backgroundColor: "#000000" }}>
        <Providers>
          <AnalyticsProvider />
          {children}
        </Providers>
      </body>
    </html>
  );
}
