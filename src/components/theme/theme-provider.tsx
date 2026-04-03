"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "cpt-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const { status } = useSession();

  // On mount, read from localStorage (sync, avoids flash)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "dark" || stored === "light") {
      setThemeState(stored);
      applyTheme(stored);
    } else {
      applyTheme("light");
    }
    setMounted(true);
  }, []);

  // Once authenticated, optionally sync from user API (localStorage takes priority if already set)
  useEffect(() => {
    if (status !== "authenticated" || !mounted) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return; // user already picked a theme locally

    const controller = new AbortController();
    fetch("/api/user/preferences", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch preferences");
        return res.json();
      })
      .then((data: { theme?: string }) => {
        if (data.theme === "light" || data.theme === "dark") {
          setThemeState(data.theme);
          applyTheme(data.theme);
          localStorage.setItem(STORAGE_KEY, data.theme);
        }
      })
      .catch(() => {
        // Silently ignore — keep current theme
      });

    return () => controller.abort();
  }, [status, mounted]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Prevent flash — render children immediately but context is ready
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
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
