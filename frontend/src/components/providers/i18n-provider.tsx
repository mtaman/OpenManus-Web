"use client";

import React, { useEffect, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import "@/i18n";

interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: string;
}

export function I18nProvider({
  children,
  initialLocale = "en",
}: I18nProviderProps) {
  const { i18n } = useTranslation();
  const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    const target = initialLocale || i18n.language || "en";
    if (i18n.language !== target) {
      i18n.changeLanguage(target);
    }
    const isRtl = target.startsWith("ar");
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = target;
  }, [initialLocale, i18n]);

  return <>{children}</>;
}

export default I18nProvider;
