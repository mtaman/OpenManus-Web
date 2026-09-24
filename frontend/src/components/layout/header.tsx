"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { Activity } from "lucide-react";

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur px-6 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <Activity className="h-4 w-4 text-emerald-500 animate-pulse"/>
        <span className="text-muted-foreground">{t("common.status")}:</span>
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          {t("common.online")}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle/>
        <LanguageToggle/>
      </div>
    </header>
  );
}
