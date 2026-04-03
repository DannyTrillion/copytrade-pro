"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ScrollableTable } from "@/components/ui/scrollable-table";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading,
  emptyMessage = "No data available",
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="glass-panel overflow-hidden">
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              {columns.map((_, j) => (
                <div
                  key={j}
                  className="h-4 bg-surface-4 rounded animate-shimmer bg-shimmer bg-[length:200%_100%]"
                  style={{ width: `${60 + Math.random() * 40}%`, flex: 1 }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-text-tertiary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden">
      <ScrollableTable>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-1/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "table-header px-4 py-3",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center"
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <motion.tr
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className={cn("table-row", onRowClick && "cursor-pointer")}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "table-cell",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center"
                    )}
                  >
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>
    </div>
  );
}
