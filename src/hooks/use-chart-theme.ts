"use client";

import { useMemo } from "react";
import { useTheme } from "@/components/theme/theme-provider";

export function useChartTheme() {
  const { theme } = useTheme();

  return useMemo(() => {
    const isLight = theme === "light";
    return {
      grid: isLight ? "#E5E7EB" : "#1E1F2B",
      axis: { fill: isLight ? "#9CA3AF" : "#6B7084", fontSize: 11 },
      tooltip: {
        background: isLight ? "#FFFFFF" : "#12131A",
        border: `1px solid ${isLight ? "#E5E7EB" : "#1E1F2B"}`,
        borderRadius: "10px",
        boxShadow: isLight
          ? "0 8px 24px rgba(0,0,0,0.12)"
          : "0 8px 24px rgba(0,0,0,0.5)",
        padding: "12px 16px",
        fontFamily: "'Inter', system-ui, sans-serif",
      },
      tooltipLabel: { color: isLight ? "#6B7280" : "#9CA0AE", fontSize: 11, marginBottom: 6, fontWeight: 500, letterSpacing: "0.02em" },
      tooltipItem: { color: isLight ? "#111827" : "#E8E9ED", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
      dotStroke: isLight ? "#FFFFFF" : "#12131A",
      tvTheme: isLight ? "light" as const : "dark" as const,
      tvBgColor: isLight ? "rgba(248, 249, 251, 1)" : "rgba(18, 19, 26, 1)",
      tvGridColor: isLight ? "rgba(229, 231, 235, 0.6)" : "rgba(30, 31, 43, 0.6)",
      stripeTheme: isLight ? "stripe" as const : "night" as const,
      stripeBg: isLight ? "#F8F9FB" : "#12131A",
      stripeText: isLight ? "#111827" : "#E8E9ED",
      stripeSecondary: isLight ? "#6B7280" : "#6B7084",
      stripeBorder: isLight ? "#E5E7EB" : "#2A2B37",
      stripeInputBg: isLight ? "#FFFFFF" : "#1A1B25",
    };
  }, [theme]);
}
