"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface PortfolioDonutProps {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
}

const COLORS = [
  "#2962FF",
  "#26A69A",
  "#AB47BC",
  "#FF7043",
  "#42A5F5",
  "#FFCA28",
  "#EF5350",
  "#66BB6A",
];

export function PortfolioDonut({
  segments,
  centerLabel = "Total",
  centerValue,
  size = 160,
}: PortfolioDonutProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) return null;

  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulated = 0;
  const arcs = segments.map((seg, i) => {
    const pct = seg.value / total;
    const dashLength = pct * circumference;
    const dashOffset = -accumulated * circumference;
    accumulated += pct;
    return {
      ...seg,
      index: i,
      pct,
      dashLength,
      dashOffset,
      color: seg.color || COLORS[i % COLORS.length],
    };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Donut SVG */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke="rgb(var(--border-default) / 0.3)" strokeWidth={strokeWidth}
          />
          {arcs.map((arc) => (
            <motion.circle
              key={arc.index}
              cx={center} cy={center} r={radius}
              fill="none" stroke={arc.color}
              strokeWidth={hovered === arc.index ? strokeWidth + 3 : strokeWidth}
              strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
              strokeDashoffset={arc.dashOffset}
              strokeLinecap="butt"
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{
                strokeDasharray: `${arc.dashLength} ${circumference - arc.dashLength}`,
                opacity: hovered !== null && hovered !== arc.index ? 0.4 : 1,
              }}
              transition={{ duration: 1, delay: arc.index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={() => setHovered(arc.index)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer transition-all duration-200"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            key={hovered !== null ? `seg-${hovered}` : "total"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <p className="text-base font-bold text-text-primary tabular-nums">
              {hovered !== null ? formatCurrency(arcs[hovered].value) : centerValue || formatCurrency(total)}
            </p>
            <p className="text-2xs text-text-tertiary">
              {hovered !== null ? arcs[hovered].label : centerLabel}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Legend — horizontal wrap */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 w-full">
        {arcs.map((arc) => (
          <div
            key={arc.index}
            className={`flex items-center gap-1.5 py-0.5 px-1.5 rounded transition-colors duration-200 cursor-default ${
              hovered === arc.index ? "bg-surface-3" : ""
            }`}
            onMouseEnter={() => setHovered(arc.index)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: arc.color }} />
            <span className="text-[11px] text-text-secondary">{arc.label}</span>
            <span className="text-[11px] font-semibold text-text-primary tabular-nums">{(arc.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
