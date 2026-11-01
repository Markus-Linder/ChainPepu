import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Dictionary } from "./en";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, negotiateLocale, type Locale } from "./index";

type Ctx = { locale: Locale; t: Dictionary; setLocale: (l: Locale) => void };
const I18nContext = createContext<Ctx | null>(null);

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_COOKIE);
    if (isLocale(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  return negotiateLocale(typeof navigator !== "undefined" ? navigator.languages?.join(",") ?? navigator.language : null) ?? DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(LOCALE_COOKIE, l);
    } catch {
      /* ignore */
    }
  }, []);
  const value = useMemo(() => ({ locale, t: getDictionary(locale), setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
