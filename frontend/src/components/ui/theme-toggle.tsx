"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/layout/theme-provider";
import { storage } from "@/lib/storage";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="w-8 h-8 rounded-md border border-border bg-card shadow-manus-xs opacity-50"
        aria-hidden="true"
      />
    );
  }

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const handleToggle = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    // Persist via unified storage engine (Server cookie sync to prevent FOUC)
    storage.set("theme", nextTheme);
  };

  return (
    <button
      onClick={handleToggle}
      type="button"
      aria-label="Toggle Theme"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-border bg-card text-foreground shadow-manus-xs hover:bg-muted hover:text-foreground active:scale-95 transition-all duration-150 cursor-pointer"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-[#34322D] transition-transform duration-200 -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
}

export default ThemeToggle;
