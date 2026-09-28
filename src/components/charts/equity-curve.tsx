"use client";

/**
 * Equity curve with a range selector.
 *
 * Consolidates what were three separate P&L charts on the Copy Trading page
 * into one control. Three charts asking three versions of the same question
 * cost vertical space and force the reader to reconcile them; one chart with
 * an explicit toggle does not.
 *
 * Two metrics, because they answer different questions:
 *   Balance        — "what am I actually worth?"   (includes deposits)
 *   Cumulative P&L — "is copying working?"          (trading result only)
 */

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { cn } from "@/lib/utils";

export interface EquityPoint {
  date: string;
  balance: number;
  pnl: number;
  cumulativePnl: number;
  trades: number;
}

export type EquityRange = "30d" | "90d" | "1y" | "all";
type Metric = "balance" | "cumulativePnl";

const RANGES: Array<{ id: EquityRange; label: string }> = [
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "1y", label: "1Y" },
  { id: "all", label: "All" },
];

const METRICS: Array<{ id: Metric; label: string }> = [
  { id: "balance", label: "Balance" },
  { id: "cumulativePnl", label: "P&L" },
];

export function EquityCurve({
  data,
  range,
  onRangeChange,
  loading = false,
  height = 260,
  className,
}: {
  data: EquityPoint[];
  range: EquityRange;
  onRangeChange: (range: EquityRange) => void;
  loading?: boolean;
  height?: number;
  className?: string;
}) {
  const ct = useChartTheme();
  const [metric, setMetric] = useState<Metric>("balance");

  const { series, isPositive, delta, deltaPercent } = useMemo(() => {
    const series = data.map((d) => ({
      date: d.date,
      value: metric === "balance" ? d.balance : d.cumulativePnl,
      trades: d.trades,
    }));

    if (series.length < 2) {
      return { series, isPositive: true, delta: 0, deltaPercent: 0 };
    }

    const first = series[0].value;
    const last = series[series.length - 1].value;
    const delta = last - first;

    return {
      series,
      // For P&L the sign of the value itself is what matters; for balance it
      // is the direction of travel over the window.
      isPositive: metric === "cumulativePnl" ? last >= 0 : delta >= 0,
      delta,
      deltaPercent: first !== 0 ? (delta / Math.abs(first)) * 100 : 0,
    };
  }, [data, metric]);

  const stroke = isPositive ? "#26A69A" : "#EF5350";
  const gradientId = `equity-${metric}-${isPositive ? "up" : "down"}`;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-text-primary tabular-nums">
            {series.length > 0
              ? formatCurrency(series[series.length - 1].value)
              : formatCurrency(0)}
          </span>
          {series.length > 1 && (
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                isPositive ? "text-success" : "text-danger"
              )}
            >
              {delta >= 0 ? "+" : ""}
              {formatCurrency(delta)}
              {metric === "balance" && Number.isFinite(deltaPercent) && (
                <span className="text-text-tertiary ml-1">
                  ({deltaPercent >= 0 ? "+" : ""}
                  {deltaPercent.toFixed(1)}%)
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Segmented options={METRICS} value={metric} onChange={setMetric} />
          <Segmented options={RANGES} value={range} onChange={onRangeChange} />
        </div>
      </div>

      <div style={{ height }} className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-0/40 backdrop-blur-[1px] rounded-lg">
            <span className="text-2xs text-text-tertiary">Loading…</span>
          </div>
        )}

        {series.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-text-tertiary">
              No copy activity in this period.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke={ct.grid}
                horizontal
                vertical={false}
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={ct.axis}
                dy={8}
                minTickGap={40}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={ct.axis}
                width={56}
                tickFormatter={(v: number) => formatCurrency(v)}
              />
              <Tooltip
                contentStyle={ct.tooltip}
                labelStyle={ct.tooltipLabel}
                itemStyle={ct.tooltipItem}
                formatter={(value) => [
                  formatCurrency(Number(value)),
                  metric === "balance" ? "Balance" : "Cumulative P&L",
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: ct.dotStroke }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/** Small segmented control shared by the metric and range toggles. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-surface-2/60 p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
          className={cn(
            "px-2 py-1 text-2xs font-medium rounded-md transition-colors",
            value === option.id
              ? "bg-surface-4 text-text-primary"
              : "text-text-tertiary hover:text-text-secondary"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
