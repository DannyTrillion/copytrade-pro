import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/layout/providers";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://copytradesultra.com";

// Intentionally minimal head: only name (title), description, and the OG image.
// No SEO surface — the site stays fully de-indexed via robots noindex below.
export const metadata: Metadata = {
  title: "Webull",
  description: "Webull — automated copy trading.",
  // OG tags are emitted manually in <head> below so Next.js does not
  // auto-mirror them into twitter:* tags. Head = title + description + OG only.
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
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
  },
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
        {/* OG tags only — no twitter. Emitted manually to avoid Next auto-mirroring. */}
        <meta property="og:title" content="Webull" />
        <meta property="og:description" content="Webull — automated copy trading." />
        <meta property="og:site_name" content="Webull" />
        <meta property="og:image" content={`${SITE_URL}/og`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
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
