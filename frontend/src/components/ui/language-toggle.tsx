"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { storage } from "@/lib/storage";

interface LanguageToggleProps {
  compact?: boolean;
}

export function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by resolving language dynamically after mount
  const currentLang = mounted ? (i18n.language || "en") : "en";
  const isArabic = currentLang.startsWith("ar");

  const toggleLanguage = () => {
    const nextLang = isArabic ? "en" : "ar";
    const nextDir = nextLang === "ar" ? "rtl" : "ltr";

    // 1. Immediate DOM & i18next reflection
    i18n.changeLanguage(nextLang);
    document.documentElement.dir = nextDir;
    document.documentElement.lang = nextLang;

    // 2. Persist cleanly into unified storage & cookie
    storage.set("locale", nextLang);

    if (typeof window !== "undefined") {
      document.cookie = `locale=${nextLang}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem("locale", nextLang);
      localStorage.setItem("language", nextLang);
      localStorage.setItem("i18nextLng", nextLang);
    }
  };

  const dynamicTitle = mounted
    ? (isArabic ? "Switch to English" : "التبديل إلى العربية")
    : "Switch Language";

  if (compact) {
    return (
      <button
        suppressHydrationWarning
        onClick={toggleLanguage}
        type="button"
        aria-label="Toggle Language"
        title={dynamicTitle}
        className="p-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer"
      >
        <Languages className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      suppressHydrationWarning
      onClick={toggleLanguage}
      type="button"
      aria-label="Toggle Language"
      title={dynamicTitle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
    >
      <Languages className="h-4 w-4" />
      <span suppressHydrationWarning>{isArabic ? "English" : "العربية"}</span>
    </button>
  );
}

export default LanguageToggle;
