import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

function resolveInitialLocale(): string {
  if (typeof window !== "undefined") {
    const match = document.cookie.match(/(?:^|; )locale=([^;]*)/);
    if (match) {
      let val = decodeURIComponent(match[1]).trim().replace(/^["']+|["']+$/g, "");
      if (val === "ar" || val === "en") return val;
    }
    const saved = localStorage.getItem("locale") || localStorage.getItem("language");
    if (saved === "ar" || saved === "en") return saved;
  }
  return "en";
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: resolveInitialLocale(),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export default i18n;
