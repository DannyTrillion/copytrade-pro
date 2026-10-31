import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Never advertise the framework. Next omits this by default in recent
  // versions, but setting it explicitly stops a future upgrade or a stray
  // config change from reintroducing it.
  poweredByHeader: false,

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Two years, all subdomains, and eligible for the browser preload
          // list. Preload matters because it removes the first-request window
          // where a user can still be downgraded to HTTP and stripped.
          // Only safe because every subdomain here is already HTTPS.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },

          // Revoke hardware and sensor access this app never uses, so an
          // injected script or a compromised third-party widget cannot reach
          // them. `payment` stays enabled for the gateway's payment request
          // flows.
          {
            key: "Permissions-Policy",
            value: [
              "accelerometer=()",
              "ambient-light-sensor=()",
              "autoplay=(self)",
              "camera=()",
              "display-capture=()",
              "encrypted-media=()",
              "fullscreen=(self)",
              "geolocation=()",
              "gyroscope=()",
              "magnetometer=()",
              "microphone=()",
              "midi=()",
              "payment=(self)",
              "screen-wake-lock=()",
              "usb=()",
              "xr-spatial-tracking=()",
            ].join(", "),
          },

          // Isolate the browsing context from windows we open or that open us.
          // `allow-popups` rather than plain `same-origin`: wallet connectors
          // and hosted checkouts rely on popups keeping an opener reference,
          // and the stricter value silently breaks them.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },

          // Stop the browser pre-resolving hostnames found in markup. Minor,
          // but it removes a passive signal about third parties a visitor has
          // not actually interacted with yet.
          { key: "X-DNS-Prefetch-Control", value: "off" },

          // Modern equivalent of X-Frame-Options, kept alongside it because
          // frame-ancestors is what current browsers honour.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      {
        // API responses are never cacheable and never embeddable.
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },

  // Speed up dev server module resolution
  transpilePackages: [
    "@rainbow-me/rainbowkit",
    "wagmi",
    "@tanstack/react-query",
  ],

  // Optimize production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // Allow external images in next/image
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uzvqwwhjmehbrvoxqibu.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // Reduce dev server overhead
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "recharts",
      "@rainbow-me/rainbowkit",
      "wagmi",
      "ethers",
    ],
  },

  // Reduce unnecessary module warnings
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    config.ignoreWarnings = [
      { module: /node_modules\/@metamask\/sdk/ },
      { module: /node_modules\/pino/ },
    ];
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps for better error traces
  widenClientFileUpload: true,

  // Hide source maps from client bundles
  hideSourceMaps: true,

  // Disable Sentry telemetry
  disableLogger: true,

  // Don't fail build if Sentry is not configured
  silent: !process.env.SENTRY_AUTH_TOKEN,
});
