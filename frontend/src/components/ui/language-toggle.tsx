"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  const toggleLanguage = () => {
    const nextLang = currentLang.startsWith("ar") ? "en" : "ar";
    i18n.changeLanguage(nextLang);
    document.documentElement.dir = nextLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = nextLang;
    localStorage.setItem("language", nextLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      type="button"
      aria-label="Toggle Language"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted transition-colors"
    >
      <Languages className="h-4 w-4"/>
      <span>{currentLang.startsWith("ar") ? "English" : "العربية"}</span>
    </button>
  );
}
