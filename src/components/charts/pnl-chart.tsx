"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useChartTheme } from "@/hooks/use-chart-theme";

interface PnlChartProps {
  data: Array<{ date: string; pnl: number; volume?: number }>;
  height?: number;
  showGrid?: boolean;
}

export function PnlChart({ data, height = 300, showGrid = false }: PnlChartProps) {
  const ct = useChartTheme();
  const isPositive = data.length > 0 && data[data.length - 1].pnl >= 0;
  const gradientId = `pnl-gradient-${isPositive ? "pos" : "neg"}`;
  const strokeColor = isPositive ? "#26A69A" : "#EF5350";
  const fillColor = isPositive ? "#26A69A" : "#EF5350";

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={ct.grid}
              horizontal={true}
              vertical={false}
            />
          )}
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={ct.axis}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={ct.axis}
            tickFormatter={(val) => formatCurrency(val, 0)}
            dx={-8}
          />
          <Tooltip
            contentStyle={ct.tooltip}
            labelStyle={ct.tooltipLabel}
            itemStyle={ct.tooltipItem}
            formatter={(value) => {
              const num = Number(value);
              const formatted = formatCurrency(Math.abs(num));
              return [num >= 0 ? `+${formatted}` : `-${formatted}`, "P&L"];
            }}
            labelFormatter={(label) => `${label}`}
          />
          <Area
            type="monotone"
            dataKey="pnl"
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 4,
              fill: strokeColor,
              stroke: ct.dotStroke,
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
