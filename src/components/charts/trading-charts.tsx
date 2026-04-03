"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  ComposedChart,
  Line,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useChartTheme } from "@/hooks/use-chart-theme";

/* ─────────────── Balance Over Time Chart ─────────────── */

interface BalanceChartProps {
  data: Array<{ date: string; balance: number }>;
  height?: number;
}

export function BalanceOverTimeChart({ data, height = 300 }: BalanceChartProps) {
  const ct = useChartTheme();
  const gradientId = "balance-gradient";

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={ct.grid} horizontal vertical={false} />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={ct.axis} dy={8} />
          <YAxis axisLine={false} tickLine={false} tick={ct.axis} tickFormatter={(val) => formatCurrency(val, 0)} dx={-8} />
          <Tooltip contentStyle={ct.tooltip} labelStyle={ct.tooltipLabel} itemStyle={ct.tooltipItem} formatter={(value) => [formatCurrency(Number(value)), "Balance"]} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#3B82F6"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: "#3B82F6", stroke: ct.dotStroke, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────── Trade Performance Chart (Win/Loss bars + cumulative line) ─────────────── */

interface TradePerformanceProps {
  data: Array<{ date: string; profit: number; loss: number; cumulative: number }>;
  height?: number;
}

export function TradePerformanceChart({ data, height = 300 }: TradePerformanceProps) {
  const ct = useChartTheme();

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={ct.grid} horizontal vertical={false} />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={ct.axis} dy={8} />
          <YAxis yAxisId="bars" axisLine={false} tickLine={false} tick={ct.axis} tickFormatter={(val) => formatCurrency(val, 0)} dx={-8} />
          <YAxis yAxisId="line" orientation="right" axisLine={false} tickLine={false} tick={ct.axis} tickFormatter={(val) => formatCurrency(val, 0)} dx={8} />
          <Tooltip
            contentStyle={ct.tooltip}
            labelStyle={ct.tooltipLabel}
            itemStyle={ct.tooltipItem}
            formatter={(value, name) => {
              const label = name === "profit" ? "Wins" : name === "loss" ? "Losses" : "Cumulative";
              return [formatCurrency(Number(value)), label];
            }}
          />
          <Bar yAxisId="bars" dataKey="profit" fill="#26A69A" radius={[3, 3, 0, 0]} barSize={12} />
          <Bar yAxisId="bars" dataKey="loss" fill="#EF5350" radius={[3, 3, 0, 0]} barSize={12} />
          <Line
            yAxisId="line"
            type="monotone"
            dataKey="cumulative"
            stroke="#A78BFA"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: "#A78BFA", stroke: ct.dotStroke, strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────── Profit/Loss Bar Chart ─────────────── */

interface PnlBarChartProps {
  data: Array<{ date: string; pnl: number }>;
  height?: number;
}

export function PnlBarChart({ data, height = 300 }: PnlBarChartProps) {
  const ct = useChartTheme();

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={ct.grid} horizontal vertical={false} />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={ct.axis} dy={8} />
          <YAxis axisLine={false} tickLine={false} tick={ct.axis} tickFormatter={(val) => formatCurrency(val, 0)} dx={-8} />
          <Tooltip
            contentStyle={ct.tooltip}
            labelStyle={ct.tooltipLabel}
            itemStyle={ct.tooltipItem}
            formatter={(value) => [formatCurrency(Number(value)), "P&L"]}
            cursor={{ fill: "rgba(0,0,0,0.03)" }}
          />
          <Bar
            dataKey="pnl"
            radius={[3, 3, 0, 0]}
            barSize={16}
            fill="#26A69A"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape={(props: any) => {
              const { x, y, width, height: h, payload } = props;
              const color = payload.pnl >= 0 ? "#26A69A" : "#EF5350";
              return <rect x={x} y={y} width={width} height={h} rx={3} fill={color} />;
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
