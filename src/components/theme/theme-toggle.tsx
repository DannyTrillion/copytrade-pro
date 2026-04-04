"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface ThemeToggleProps {
  className?: string;
}

const modes = [
  { id: "system" as const, label: "System", icon: Monitor },
  { id: "light" as const, label: "Light", icon: Sun },
  { id: "dark" as const, label: "Dark", icon: Moon },
];

export function ThemeToggle({ className }: ThemeToggleProps) {
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
        </span>
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 z-50",
            "w-36 rounded-lg border border-border/60",
            "bg-surface-2 shadow-lg shadow-black/20",
            "py-1 animate-in fade-in slide-in-from-top-1 duration-150"
          )}
        >
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setMode(id);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2 text-sm",
                "transition-colors duration-150",
                mode === id
                  ? "text-brand bg-brand/10"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-3"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
              {mode === id && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
