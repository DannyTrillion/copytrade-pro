"use client";

import { motion } from "framer-motion";

export type ChartRange = "7d" | "30d" | "90d" | "all";

const RANGES: { id: ChartRange; label: string }[] = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "all", label: "All" },
];

interface ChartRangeSelectorProps {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
}

export function ChartRangeSelector({ value, onChange }: ChartRangeSelectorProps) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-2/60 border border-border/50">
      {RANGES.map((range) => (
        <button
          key={range.id}
          onClick={() => onChange(range.id)}
          className="relative px-3 py-1 rounded-md text-[11px] font-medium transition-colors duration-200"
          aria-label={`Show ${range.label} data`}
        >
          {value === range.id && (
            <motion.div
              layoutId="chart-range-pill"
              className="absolute inset-0 rounded-md bg-surface-1 border border-border/60 shadow-sm"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className={`relative z-10 ${value === range.id ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary"}`}>
            {range.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Filter data array by date range. Expects items with a date string field. */
export function filterByRange<T>(
  data: T[],
  range: ChartRange,
  dateField: keyof T
): T[] {
  if (range === "all") return data;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = new Date(Date.now() - days * 86400000);
  return data.filter((item) => {
    const dateVal = item[dateField];
    if (typeof dateVal === "string" || dateVal instanceof Date) {
      return new Date(dateVal as string) >= cutoff;
    }
    return true;
  });
}
