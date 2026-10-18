import en from "./en";
import de from "./de";
import es from "./es";
import fr from "./fr";
import pt from "./pt";

export type Lang = "en" | "de" | "es" | "fr" | "pt";
export const DICTS: Record<Lang, Record<string, string>> = { en, de, es, fr, pt };
