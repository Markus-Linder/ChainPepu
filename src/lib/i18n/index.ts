import { en, type Dictionary } from "./en";
import { de } from "./de";

export const LOCALES = ["en", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "cp_locale";

const dictionaries: Record<Locale, Dictionary> = { en, de };

export const LOCALE_LABELS: Record<Locale, string> = { en: "English", de: "Deutsch" };

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}

/** Negotiate a locale from an Accept-Language header. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const prefs = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const p of prefs) if (isLocale(p.tag)) return p.tag;
  return DEFAULT_LOCALE;
}

/** Simple `{placeholder}` interpolation. */
export function fmt(template: string, vars: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export function languageName(locale: Locale) {
  return { en: "English", de: "German" }[locale];
}
