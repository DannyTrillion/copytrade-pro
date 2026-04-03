"use client";

import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "badge-success",
  EXECUTING: "badge-info",
  PROCESSING: "badge-info",
  PENDING: "badge-warning",
  FAILED: "badge-danger",
  CANCELLED: "badge-neutral",
  COLLECTED: "badge-success",
  ACTIVE: "badge-success",
  INACTIVE: "badge-neutral",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(STATUS_STYLES[status] || "badge-neutral", className)}>
      {status}
    </span>
  );
}
