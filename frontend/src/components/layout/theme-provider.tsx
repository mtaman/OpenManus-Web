"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import "@/i18n";
import { storage } from "@/lib/storage";

type Theme = "dark" | "light" | "system";

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
  [key: string]: any;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: "dark",
  setTheme: () => null,
});

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "theme",
  enableSystem = true,
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const cleanCookie = typeof document !== "undefined" ? (document.cookie.match(/(?:^|; )theme=([^;]*)/)?.[1] || "").replace(/^["']+|["']+$/g, "") : "";
    const saved = cleanCookie || (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    if (saved && (saved === "dark" || saved === "light" || saved === "system")) {
      setThemeState(saved as Theme);
    }
  }, [storageKey, defaultTheme]);

  const applyThemeClass = (t: Theme) => {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;
    const isDark =
      t === "dark" ||
      (t === "system" &&
        enableSystem &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  };

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme, enableSystem]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeClass(newTheme);
    storage.set("theme", newTheme);
    if (typeof window !== "undefined") {
      document.cookie = `theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem(storageKey, newTheme);
      localStorage.setItem("omweb_theme", newTheme);
    }
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
