import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
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
