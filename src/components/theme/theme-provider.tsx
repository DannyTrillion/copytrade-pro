"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export type Theme = "dark" | "light" | "luxury";
type ThemeMode = "system" | "dark" | "light" | "luxury";

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setTheme: (theme: Theme) => void;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "cpt-theme";
const MODE_KEY = "cpt-theme-mode";

const VALID_THEMES: Theme[] = ["dark", "light", "luxury"];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light", "luxury");
  root.classList.add(theme);
  root.setAttribute("data-theme", theme);
}

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Resolve the effective theme based on mode and route context */
function resolveTheme(mode: ThemeMode, pathname: string): Theme {
  if (mode === "dark" || mode === "light" || mode === "luxury") return mode;

  // System mode: use route-aware defaults with system preference as tiebreaker
  const isDashboard = pathname.startsWith("/dashboard");
  const isLanding = pathname === "/" || pathname.startsWith("/pricing") || pathname.startsWith("/about");
  const isAuth = pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/reset-password");

  if (isLanding || isAuth) return "dark";
  if (isDashboard) {
    const systemPref = getSystemTheme();
    return systemPref === "dark" ? "dark" : "light";
  }

  return getSystemTheme();
}

function isValidTheme(value: string | null): value is Theme {
  return VALID_THEMES.includes(value as Theme);
}

function isValidMode(value: string | null): value is ThemeMode {
  return value === "system" || VALID_THEMES.includes(value as Theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);
  const { status } = useSession();
  const pathname = usePathname();

  // On mount, read stored preferences
  useEffect(() => {
    const storedMode = localStorage.getItem(MODE_KEY);
    const storedTheme = localStorage.getItem(STORAGE_KEY);

    const effectiveMode = isValidMode(storedMode) ? storedMode : "system";
    setModeState(effectiveMode);

    if (effectiveMode === "system") {
      const resolved = resolveTheme("system", window.location.pathname);
      setThemeState(resolved);
      applyTheme(resolved);
    } else if (isValidTheme(storedTheme)) {
      setThemeState(storedTheme);
      applyTheme(storedTheme);
    } else {
      applyTheme("dark");
    }

    setMounted(true);
  }, []);

  // When pathname changes and mode is "system", update theme based on route context
  useEffect(() => {
    if (!mounted || mode !== "system") return;
    const resolved = resolveTheme("system", pathname);
    setThemeState(resolved);
    applyTheme(resolved);
  }, [pathname, mode, mounted]);

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (!mounted || mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const isDashboard = pathname.startsWith("/dashboard");
      if (isDashboard) {
        const systemTheme = getSystemTheme();
        setThemeState(systemTheme);
        applyTheme(systemTheme);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mounted, mode, pathname]);

  // Sync from user API when authenticated (if no local preference)
  useEffect(() => {
    if (status !== "authenticated" || !mounted) return;
    const storedMode = localStorage.getItem(MODE_KEY);
    if (storedMode) return;

    const controller = new AbortController();
    fetch("/api/user/preferences", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data: { theme?: string }) => {
        if (isValidTheme(data.theme ?? null)) {
          const t = data.theme as Theme;
          setModeState(t);
          setThemeState(t);
          applyTheme(t);
          localStorage.setItem(MODE_KEY, t);
          localStorage.setItem(STORAGE_KEY, t);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [status, mounted]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
    localStorage.setItem(MODE_KEY, next);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(MODE_KEY, next);

    if (next === "system") {
      localStorage.removeItem(STORAGE_KEY);
      const resolved = resolveTheme("system", pathname);
      setThemeState(resolved);
      applyTheme(resolved);
    } else {
      setThemeState(next);
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, [pathname]);

  const toggleTheme = useCallback(() => {
    const cycle: Theme[] = ["light", "dark", "luxury"];
    const idx = cycle.indexOf(theme);
    const next = cycle[(idx + 1) % cycle.length];
    setTheme(next);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
