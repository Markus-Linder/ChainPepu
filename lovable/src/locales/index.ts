import en from "./en";
import de from "./de";
import es from "./es";
import fr from "./fr";
import pt from "./pt";
import tr from "./tr";
import ar from "./ar";
import hi from "./hi";
import id from "./id";
import ja from "./ja";

export type Lang = "en" | "de" | "es" | "fr" | "pt" | "tr" | "ar" | "hi" | "id" | "ja";
export const DICTS: Record<Lang, Record<string, string>> = { en, de, es, fr, pt, tr, ar, hi, id, ja };
/** Languages written right to left. */
export const RTL: Lang[] = ["ar"];
