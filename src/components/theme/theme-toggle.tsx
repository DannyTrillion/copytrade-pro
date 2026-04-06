"use client";

import { Sun, Moon, Monitor, Crown } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface ThemeToggleProps {
  className?: string;
  dropdownPosition?: "above" | "below";
}

const modes = [
  { id: "system" as const, label: "System", icon: Monitor },
  { id: "light" as const, label: "Light", icon: Sun },
  { id: "dark" as const, label: "Dark", icon: Moon },
  { id: "luxury" as const, label: "Luxury", icon: Crown },
];

export function ThemeToggle({ className, dropdownPosition = "below" }: ThemeToggleProps) {
  const { theme, mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isLuxury = theme === "luxury";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative inline-flex items-center justify-center w-8 h-8 rounded-md",
          "text-text-secondary hover:text-text-primary",
          "hover:bg-surface-3 active:scale-[0.93]",
          "transition-all duration-200 ease-out",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          className
        )}
        title="Theme settings"
        aria-label="Theme settings"
      >
        <span className="relative w-4 h-4">
          <Sun
            className={cn(
              "absolute inset-0 w-4 h-4 transition-all duration-300",
              theme === "light"
                ? "opacity-100 rotate-0 scale-100"
                : "opacity-0 rotate-90 scale-0"
            )}
          />
          <Moon
            className={cn(
              "absolute inset-0 w-4 h-4 transition-all duration-300",
              theme === "dark"
                ? "opacity-100 rotate-0 scale-100"
                : "opacity-0 -rotate-90 scale-0"
            )}
          />
          <Crown
            className={cn(
              "absolute inset-0 w-4 h-4 transition-all duration-300",
              isLuxury
                ? "opacity-100 rotate-0 scale-100 text-[#D4AF37]"
                : "opacity-0 rotate-90 scale-0"
            )}
          />
        </span>
      </button>

      {open && (
        <div
          className={cn(
            dropdownPosition === "above" ? "absolute left-0 bottom-full mb-2 z-50" : "absolute right-0 top-full mt-2 z-50",
            "w-40 rounded-lg border border-border/60",
            "bg-surface-2 shadow-lg shadow-black/20",
            "py-1 animate-in fade-in slide-in-from-bottom-1 duration-150"
          )}
        >
          {modes.map(({ id, label, icon: Icon }) => {
            const isActive = mode === id;
            const isGold = id === "luxury";
            return (
              <button
                key={id}
                onClick={() => {
                  setMode(id);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 text-sm",
                  "transition-colors duration-150",
                  isActive && isGold
                    ? "text-[#D4AF37] bg-[#D4AF37]/10"
                    : isActive
                    ? "text-brand bg-brand/10"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-3"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isGold && !isActive && "text-[#D4AF37]/50")} />
                <span>{label}</span>
                {isActive && (
                  <span className={cn("ml-auto w-1.5 h-1.5 rounded-full", isGold ? "bg-[#D4AF37]" : "bg-brand")} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
