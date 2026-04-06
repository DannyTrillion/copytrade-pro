"use client";

import { useMemo } from "react";
import { useTheme } from "@/components/theme/theme-provider";

export function useChartTheme() {
  const { theme } = useTheme();

  return useMemo(() => {
    const isLight = theme === "light";
    const isLuxury = theme === "luxury";
    const isDark = theme === "dark" || isLuxury;

    return {
      grid: isLight ? "#E5E7EB" : isLuxury ? "#141410" : "#1E1F2B",
      axis: { fill: isLight ? "#9CA3AF" : isLuxury ? "#6e6e5e" : "#6B7084", fontSize: 11 },
      tooltip: {
        background: isLight ? "#FFFFFF" : isLuxury ? "#0a0a0a" : "#12131A",
        border: `1px solid ${isLight ? "#E5E7EB" : isLuxury ? "#1c1a14" : "#1E1F2B"}`,
        borderRadius: "10px",
        boxShadow: isLight
          ? "0 8px 24px rgba(0,0,0,0.12)"
          : isLuxury
          ? "0 8px 24px rgba(0,0,0,0.7)"
          : "0 8px 24px rgba(0,0,0,0.5)",
        padding: "12px 16px",
        fontFamily: "'Inter', system-ui, sans-serif",
      },
      tooltipLabel: { color: isLight ? "#6B7280" : isLuxury ? "#a0a090" : "#9CA0AE", fontSize: 11, marginBottom: 6, fontWeight: 500, letterSpacing: "0.02em" },
      tooltipItem: { color: isLight ? "#111827" : "#eaeaea", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
      dotStroke: isLight ? "#FFFFFF" : isLuxury ? "#0a0a0a" : "#12131A",
      tvTheme: isDark ? "dark" as const : "light" as const,
      tvBgColor: isLight ? "rgba(248, 249, 251, 1)" : isLuxury ? "rgba(5, 5, 5, 1)" : "rgba(18, 19, 26, 1)",
      tvGridColor: isLight ? "rgba(229, 231, 235, 0.6)" : isLuxury ? "rgba(20, 20, 16, 0.6)" : "rgba(30, 31, 43, 0.6)",
      stripeTheme: isDark ? "night" as const : "stripe" as const,
      stripeBg: isLight ? "#F8F9FB" : isLuxury ? "#0a0a0a" : "#12131A",
      stripeText: isLight ? "#111827" : "#eaeaea",
      stripeSecondary: isLight ? "#6B7280" : isLuxury ? "#6e6e5e" : "#6B7084",
      stripeBorder: isLight ? "#E5E7EB" : isLuxury ? "#1c1a14" : "#2A2B37",
      stripeInputBg: isLight ? "#FFFFFF" : isLuxury ? "#111111" : "#1A1B25",
    };
  }, [theme]);
}
