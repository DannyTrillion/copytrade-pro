"use client";

import { Skeleton } from "@/components/ui/loading-skeleton";

interface ChartSkeletonProps {
  height?: number;
  title?: boolean;
}

export function ChartSkeleton({ height = 300, title = true }: ChartSkeletonProps) {
  return (
    <div className="glass-panel p-4 space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      )}
      <div
        className="w-full rounded-lg bg-surface-4 animate-shimmer bg-shimmer bg-[length:200%_100%]"
        style={{ height }}
      />
    </div>
  );
}

interface StatGridSkeletonProps {
  count?: number;
}

export function StatGridSkeleton({ count = 4 }: StatGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel p-4 space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((_, j) => (
              <div
                key={j}
                className="h-4 flex-1 bg-surface-4 rounded animate-shimmer bg-shimmer bg-[length:200%_100%]"
                style={{ maxWidth: j === 0 ? "40%" : "25%" }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
