/**
 * Sprachen. Alles, was Nutzer lesen, kommt aus src/locales. Fehlt ein Text in
 * einer Sprache, wird Englisch gezeigt. Platzhalter wie {name} werden ersetzt,
 * "{n} link|{n} links" ist Einzahl|Mehrzahl.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DICTS, type Lang } from "@/locales";

export const LANGS: { code: Lang; name: string; locale: string }[] = [
  { code: "en", name: "English", locale: "en-US" },
  { code: "de", name: "Deutsch", locale: "de-DE" },
  { code: "es", name: "Español", locale: "es-ES" },
  { code: "fr", name: "Français", locale: "fr-FR" },
  { code: "pt", name: "Português", locale: "pt-BR" },
];

const STORAGE = "chainpepu_lang";
type Vars = Record<string, string | number>;

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE) as Lang | null;
    if (saved && DICTS[saved]) return saved;
  } catch {}
  for (const l of navigator.languages ?? [navigator.language]) {
    const code = l.slice(0, 2).toLowerCase() as Lang;
    if (DICTS[code]) return code;
  }
  return "en";
}

export function translate(lang: Lang, key: string, vars?: Vars): string {
  let s = DICTS[lang]?.[key] ?? DICTS.en[key] ?? key;
  if (vars && "n" in vars && s.includes("|")) {
    const [one, many] = s.split("|");
    s = Number(vars.n) === 1 ? one : many;
  }
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Error messages: translation keys become text, everything else (e.g. a database message) is shown as is. */
export function messageOf(lang: Lang, e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const key = raw.trim();
  return DICTS[lang]?.[key] ?? DICTS.en[key] ?? raw;
}

type Ctx = { lang: Lang; locale: string; setLang: (l: Lang) => void; t: (key: string, vars?: Vars) => string };
const LangCtx = createContext<Ctx>({ lang: "en", locale: "en-US", setLang: () => {}, t: (k) => k });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE, l); } catch {}
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const value = useMemo<Ctx>(() => ({
    lang,
    locale: LANGS.find((x) => x.code === lang)?.locale ?? "en-US",
    setLang,
    t: (key, vars) => translate(lang, key, vars),
  }), [lang, setLang]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export const useT = () => useContext(LangCtx);

export function LangSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useT();
  return (
    <select aria-label={t("language")} value={lang} onChange={(e) => setLang(e.target.value as Lang)}
      className={`rounded-full border border-white/15 bg-black/30 px-2 py-1 text-xs text-white ${className}`}>
      {LANGS.map((l) => <option key={l.code} value={l.code} className="bg-[#0d0b22]">{l.name}</option>)}
    </select>
  );
}
