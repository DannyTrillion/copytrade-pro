"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface MiniChartProps {
  data: number[];
  color?: "success" | "danger" | "brand";
  height?: number;
}

const COLORS = {
  success: "#5B8DEF",
  danger: "#C084A0",
  brand: "#6B8AE8",
};

export function MiniChart({ data, color = "success", height = 40 }: MiniChartProps) {
  const chartData = data.map((value, index) => ({ value, index }));
  const strokeColor = COLORS[color];

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={`mini-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill={`url(#mini-${color})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
