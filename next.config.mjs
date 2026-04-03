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

  // Allow Supabase storage images in next/image
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uzvqwwhjmehbrvoxqibu.supabase.co",
        pathname: "/storage/v1/object/public/**",
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
    // Suppress known non-critical warnings
    config.ignoreWarnings = [
      { module: /node_modules\/@metamask\/sdk/ },
      { module: /node_modules\/pino/ },
    ];
    return config;
  },
};

export default nextConfig;
