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

type Theme = "dark" | "light";
type ThemeMode = "system" | "dark" | "light";

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

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.setAttribute("data-theme", theme);
}

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Resolve the effective theme based on mode and route context */
function resolveTheme(mode: ThemeMode, pathname: string): Theme {
  if (mode === "dark" || mode === "light") return mode;

  // System mode: use route-aware defaults with system preference as tiebreaker
  const isDashboard = pathname.startsWith("/dashboard");
  const isLanding = pathname === "/" || pathname.startsWith("/pricing") || pathname.startsWith("/about");
  const isAuth = pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/reset-password");

  if (isLanding || isAuth) return "dark"; // landing + auth = dark first
  if (isDashboard) return getSystemTheme(); // dashboard follows system

  return getSystemTheme();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);
  const { status } = useSession();
  const pathname = usePathname();

  // On mount, read stored preferences
  useEffect(() => {
    const storedMode = localStorage.getItem(MODE_KEY) as ThemeMode | null;
    const storedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;

    const effectiveMode = storedMode || "system";
    setModeState(effectiveMode);

    if (effectiveMode === "system") {
      const resolved = resolveTheme("system", window.location.pathname);
      setThemeState(resolved);
      applyTheme(resolved);
    } else if (storedTheme === "dark" || storedTheme === "light") {
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
      // Only respond to system changes on dashboard (landing stays dark)
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
        if (data.theme === "light" || data.theme === "dark") {
          setModeState(data.theme);
          setThemeState(data.theme);
          applyTheme(data.theme);
          localStorage.setItem(MODE_KEY, data.theme);
          localStorage.setItem(STORAGE_KEY, data.theme);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [status, mounted]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    // When manually setting theme, switch to manual mode
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
    const next = theme === "dark" ? "light" : "dark";
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
