"use client";

import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function LiveIndicator({ label = "Live", className, size = "sm" }: LiveIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative flex">
        <span
          className={cn(
            "absolute inline-flex rounded-full bg-success opacity-75 animate-ping",
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
          )}
        />
        <span
          className={cn(
            "relative inline-flex rounded-full bg-success",
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
          )}
        />
      </span>
      {label && (
        <span className={cn("font-medium text-success", size === "sm" ? "text-2xs" : "text-xs")}>
          {label}
        </span>
      )}
    </span>
  );
}
