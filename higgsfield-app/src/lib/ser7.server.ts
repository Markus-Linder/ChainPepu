// ser7 – gemeinsame Server-Logik: Datenbank, Inhaltsprüfung, Admin-Zugang, Stripe, Suche.
import process from "node:process";
import type { D1Database } from "@cloudflare/workers-types";
import { bindings } from "./bindings.server";

export type Kind = "web" | "video";

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  image: string | null;
  source: string;
  kind: Kind;
  video?: string | null;       // direkte Videodatei (mp4/webm) oder YouTube-Einbettung
  sponsored?: boolean;
  campaignId?: number;
  promo?: string;
};

export type ListingRow = {
  id: number;
  kind: Kind;
  url: string;
  title: string;
  description: string;
  keywords: string;
  promo: string;
  promo_until: string | null;
  email: string | null;
  status: string;
  check_result: string | null;
  created_at: string;
};

export type CampaignRow = {
  id: number;
  token: string;
  url: string;
  headline: string;
  description: string;
  keywords: string;
  promo: string;
  days: number;
  price_cents: number;
  email: string;
  status: string;
  stripe_session: string | null;
  starts_at: string | null;
  ends_at: string | null;
  impressions: number;
  clicks: number;
  check_result: string | null;
  created_at: string;
};

export function db(): D1Database | null {
  return bindings().DB ?? null;
}

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store", ...extra } });
}

// ---------- Eingaben ----------
export function clean(v: unknown, max: number): string {
  return String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
}

export function normalizeUrl(raw: unknown): string | null {
  const s = clean(raw, 500);
  if (!s) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || h === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.endsWith(".local")) return null;
  return u.href;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function isEmail(v: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(v);
}

// ---------- Automatische Vorprüfung (regelbasiert, ohne KI) ----------
// Endgültig entscheidet immer der Betreiber im Verwaltungsbereich.
const REJECT_PATTERNS: [RegExp, string][] = [
  [/\b(porn\w*|xxx|hardcore|sexcam\w*|camgirl\w*|nude[sz]?|nackt\w*|erotik\w*|escort\w*|onlyfans|hentai|fetisch\w*|bordell\w*)\b/i, "sexual content"],
  [/\b(sieg heil|heil hitler|white power|rassenkrieg|untermensch\w*|judensau|kanake\w*|neger\w*|holocaust (?:lüge|luege|hoax)|14 ?words)\b/i, "racist or hateful content"],
  [/\b(drogen kaufen|koks kaufen|kokain kaufen|crystal meth|mdma kaufen|waffen ohne schein|waffe kaufen ohne|falsch(?:e|en) (?:ausweis|pass|führerschein)|fake ?id|geldwäsche|kinderporn\w*|darknet ?markt)\b/i, "illegal offers"],
  [/\b(warez|crack(?:ed)? download|keygen|raubkopie\w*|kostenlos streamen illegal)\b/i, "copyright infringement"],
];
const REVIEW_PATTERNS: [RegExp, string][] = [
  [/\b(casino\w*|sportwetten|glücksspiel\w*|gluecksspiel\w*|poker)\b/i, "gambling (check licence)"],
  [/\b(krypto\w*|bitcoin|trading signal\w*|schnell reich|garantierte? rendite)\b/i, "financial promises (check)"],
  [/\b(diät\w*|abnehmen|wundermittel|heilt|potenz\w*)\b/i, "health claims (check)"],
  [/\b(waffe\w*|messer\w*|munition)\b/i, "weapons (check)"],
];

export type CheckResult = { verdict: "ok" | "review" | "reject"; reasons: string[]; pageTitle?: string };

export async function checkContent(url: string, texts: string[]): Promise<CheckResult> {
  const reasons: string[] = [];
  let verdict: CheckResult["verdict"] = "ok";
  let pageTitle: string | undefined;
  let pageText = "";
  try {
    const r = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; ser7-check/1.0)" },
      signal: AbortSignal.timeout(7000),
    });
    const ct = r.headers.get("content-type") ?? "";
    if (!r.ok) {
      reasons.push(`page not reachable (HTTP ${r.status})`);
      verdict = "review";
    } else if (ct.includes("text/html")) {
      const html = (await r.text()).slice(0, 200_000);
      pageTitle = /<title[^>]*>([^<]{1,200})<\/title>/i.exec(html)?.[1]?.trim();
      if (/<meta[^>]+name=["']rating["'][^>]+content=["'](adult|mature|RTA-5042)/i.test(html) || /RTA-5042-1996-1400-1577-RTA/.test(html)) {
        reasons.push("page is labelled adults-only");
        verdict = "reject";
      }
      pageText = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .slice(0, 60_000);
    } else {
      await r.body?.cancel();
    }
  } catch {
    reasons.push("page could not be loaded");
    verdict = verdict === "reject" ? "reject" : "review";
  }
  const all = [...texts, pageTitle ?? "", pageText].join(" \n ");
  for (const [re, why] of REJECT_PATTERNS) if (re.test(all)) { reasons.push(why); verdict = "reject"; }
  if (verdict !== "reject") for (const [re, why] of REVIEW_PATTERNS) if (re.test(all)) { reasons.push(why); verdict = "review"; }
  return { verdict, reasons, pageTitle };
}

// ---------- Admin ----------
export function isAdmin(request: Request): boolean {
  const pw = process.env.ADMIN_PASSWORD ?? "";
  if (!pw) return false;
  const given = request.headers.get("x-admin-password") ?? "";
  if (given.length !== pw.length) return false;
  let diff = 0;
  for (let i = 0; i < pw.length; i++) diff |= pw.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

// ---------- Preise & Stripe ----------
export function pricePerDayCents(): number {
  const v = Number(process.env.SPONSOR_PRICE_PER_DAY_CENTS);
  return Number.isFinite(v) && v >= 50 ? Math.round(v) : 500;
}

export async function stripe(path: string, init: { method?: string; form?: Record<string, string> } = {}): Promise<Record<string, unknown>> {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) throw new Error("STRIPE_NOT_CONFIGURED");
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init.method ?? (init.form ? "POST" : "GET"),
    headers: {
      authorization: `Bearer ${key}`,
      ...(init.form ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body: init.form ? new URLSearchParams(init.form).toString() : undefined,
  });
  const data = (await r.json()) as Record<string, unknown>;
  if (!r.ok) throw new Error(`Stripe ${r.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

export function randomToken(): string {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

// ---------- Suche ----------
function words(q: string): string[] {
  return q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2).slice(0, 6);
}

function promoActive(promo: string, until: string | null): string {
  if (!promo) return "";
  if (until && until < new Date().toISOString().slice(0, 10)) return "";
  return promo;
}

export function youtubeEmbed(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

export async function sponsoredResults(q: string, kind: Kind): Promise<SearchResult[]> {
  const d = db();
  const ws = words(q);
  if (!d || !ws.length || kind !== "web") return [];
  const now = new Date().toISOString();
  const { results } = await d
    .prepare("SELECT * FROM campaigns WHERE status = 'active' AND (ends_at IS NULL OR ends_at > ?) ORDER BY id DESC LIMIT 200")
    .bind(now)
    .all<CampaignRow>();
  const hits = (results ?? []).filter((c) => {
    const kw = c.keywords.toLowerCase();
    return ws.some((w) => kw.split(/[,;\s]+/).some((k) => k && (k === w || (w.length >= 4 && k.startsWith(w)))));
  });
  // Rotation, höchstens zwei Sponsorplätze je Suche
  const pick = hits.sort(() => crypto.getRandomValues(new Uint8Array(1))[0] - 128).slice(0, 2);
  if (pick.length) {
    await d.batch(pick.map((c) => d.prepare("UPDATE campaigns SET impressions = impressions + 1 WHERE id = ?").bind(c.id)));
  }
  return pick.map((c) => ({
    title: c.headline,
    url: c.url,
    snippet: c.description,
    image: null,
    source: hostOf(c.url),
    kind: "web" as const,
    sponsored: true,
    campaignId: c.id,
    promo: c.promo,
  }));
}

export async function listingResults(q: string, kind: Kind): Promise<SearchResult[]> {
  const d = db();
  const ws = words(q);
  if (!d || !ws.length) return [];
  const conds = ws.map(() => "(lower(title) LIKE ? OR lower(description) LIKE ? OR lower(keywords) LIKE ?)").join(" OR ");
  const args = ws.flatMap((w) => [`%${w}%`, `%${w}%`, `%${w}%`]);
  const { results } = await d
    .prepare(`SELECT * FROM listings WHERE status = 'approved' AND kind = ? AND (${conds}) ORDER BY id DESC LIMIT 8`)
    .bind(kind, ...args)
    .all<ListingRow>();
  return (results ?? []).map((l) => ({
    title: l.title,
    url: l.url,
    snippet: l.description,
    image: null,
    source: hostOf(l.url),
    kind: l.kind,
    video: l.kind === "video" ? youtubeEmbed(l.url) ?? (/\.(mp4|webm)(\?|$)/i.test(l.url) ? l.url : null) : undefined,
    promo: promoActive(l.promo, l.promo_until),
  }));
}

// Aktionen eingetragener Shops auch an fremden Ergebnissen derselben Domain zeigen
export async function promosForHosts(hosts: string[]): Promise<Map<string, string>> {
  const d = db();
  const out = new Map<string, string>();
  if (!d || !hosts.length) return out;
  const { results } = await d
    .prepare("SELECT url, promo, promo_until FROM listings WHERE status = 'approved' AND promo != '' ORDER BY id DESC LIMIT 300")
    .all<Pick<ListingRow, "url" | "promo" | "promo_until">>();
  for (const r of results ?? []) {
    const h = hostOf(r.url);
    const p = promoActive(r.promo, r.promo_until);
    if (p && hosts.includes(h) && !out.has(h)) out.set(h, p);
  }
  return out;
}

type WikiPage = { title: string; index: number; extract?: string; thumbnail?: { source: string } };

export type Page = { results: SearchResult[]; nextOffset: number | null };

export async function wikipediaResults(q: string, lang: string, offset = 0): Promise<Page> {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&generator=search` +
    `&gsrsearch=${encodeURIComponent(q)}&gsrlimit=20&gsroffset=${offset}&prop=pageimages|extracts&exintro=1` +
    `&explaintext=1&exsentences=4&exlimit=20&piprop=thumbnail&pithumbsize=800`;
  const r = await fetch(url, { headers: { "user-agent": "ser7/1.0 (3D search)" } });
  if (!r.ok) throw new Error(`Wikipedia ${r.status}`);
  const j = (await r.json()) as { query?: { pages?: Record<string, WikiPage> }; continue?: { gsroffset?: number } };
  const results = Object.values(j.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .map((x) => ({
      title: x.title,
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(x.title.replace(/ /g, "_"))}`,
      snippet: x.extract ?? "",
      image: x.thumbnail?.source ?? null,
      source: `${lang}.wikipedia.org`,
      kind: "web" as const,
    }));
  return { results, nextOffset: j.continue?.gsroffset ?? null };
}

type CommonsPage = {
  title: string;
  index: number;
  imageinfo?: { url: string; mime: string; thumburl?: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[];
};

// Videos von Wikimedia Commons (frei, ohne Schlüssel)
export async function commonsVideos(q: string, offset = 0): Promise<Page> {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6" +
    `&gsrsearch=${encodeURIComponent(`filetype:video ${q}`)}&gsrlimit=20&gsroffset=${offset}&prop=imageinfo` +
    "&iiprop=url|mime|extmetadata&iiurlwidth=1280&iiextmetadatafilter=ImageDescription|ObjectName";
  const r = await fetch(url, { headers: { "user-agent": "ser7/1.0 (3D search)" } });
  if (!r.ok) throw new Error(`Commons ${r.status}`);
  const j = (await r.json()) as { query?: { pages?: Record<string, CommonsPage> }; continue?: { gsroffset?: number } };
  const results = Object.values(j.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .filter((p) => p.imageinfo?.[0]?.mime?.startsWith("video/"))
    .map((p) => {
      const ii = p.imageinfo![0];
      const name = ii.extmetadata?.ObjectName?.value || p.title.replace(/^File:|^Datei:/, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ");
      const desc = (ii.extmetadata?.ImageDescription?.value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return {
        title: name,
        url: ii.descriptionurl,
        snippet: desc.slice(0, 400) || "Video on Wikimedia Commons",
        image: ii.thumburl ?? null,
        source: "commons.wikimedia.org",
        kind: "video" as const,
        video: ii.url,
      };
    });
  return { results, nextOffset: j.continue?.gsroffset ?? null };
}
