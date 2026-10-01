"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { storage } from "@/lib/storage";

interface LanguageToggleProps {
  compact?: boolean;
}

export function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  const toggleLanguage = () => {
    const nextLang = currentLang.startsWith("ar") ? "en" : "ar";
    i18n.changeLanguage(nextLang);
    document.documentElement.dir = nextLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = nextLang;
    // Persist via unified storage engine (Server cookie & BroadcastChannel sync)
    storage.set("locale", nextLang);
  };

  if (compact) {
    return (
      <button
        onClick={toggleLanguage}
        type="button"
        aria-label="Toggle Language"
        title={currentLang.startsWith("ar") ? "Switch to English" : "التبديل إلى العربية"}
        className="p-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer"
      >
        <Languages className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      type="button"
      aria-label="Toggle Language"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
    >
      <Languages className="h-4 w-4" />
      <span>{currentLang.startsWith("ar") ? "English" : "العربية"}</span>
    </button>
  );
}

export default LanguageToggle;
