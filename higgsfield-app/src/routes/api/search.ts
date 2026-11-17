import { createFileRoute } from "@tanstack/react-router";
import {
  commonsVideos,
  hostOf,
  listingResults,
  promosForHosts,
  sponsoredResults,
  wikipediaResults,
  type Kind,
  type Page,
  type SearchResult,
} from "../../lib/ser7.server";

// Reihenfolge: Sponsorplätze (gekennzeichnet) → eingetragene Seiten/Videos → Wikipedia bzw. Commons
export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const q = (u.searchParams.get("q") ?? "").trim().slice(0, 200);
        const langParam = (u.searchParams.get("lang") ?? "en").toLowerCase();
        const lang = /^[a-z]{2,3}$/.test(langParam) ? langParam : "en";
        const offset = Math.max(0, Math.min(5000, Number(u.searchParams.get("offset")) || 0));
        const kind: Kind = u.searchParams.get("type") === "video" ? "video" : "web";
        if (!q) return Response.json({ error: "Missing search term" }, { status: 400 });

        const safe = async (p: Promise<SearchResult[]>) => {
          try {
            return await p;
          } catch (e) {
            console.error(e);
            return [];
          }
        };
        // Externe Quelle: Wikipedia in der Sprache des Besuchers, sonst Englisch
        const external = async (): Promise<Page> => {
          if (kind === "video") return commonsVideos(q, offset);
          try {
            const p = await wikipediaResults(q, lang, offset);
            if (p.results.length || lang === "en") return p;
          } catch (e) {
            if (lang === "en") throw e;
          }
          return wikipediaResults(q, "en", offset);
        };
        const first = offset === 0;
        const [sponsored, listed, ext] = await Promise.all([
          first ? safe(sponsoredResults(q, kind)) : Promise.resolve([]),
          first ? safe(listingResults(q, kind)) : Promise.resolve([]),
          external().catch((e) => { console.error(e); return { results: [], nextOffset: null } as Page; }),
        ]);
        const externalResults = ext.results;
        const seen = new Set<string>();
        const results = [...sponsored, ...listed, ...externalResults].filter((r) => {
          if (seen.has(r.url)) return false;
          seen.add(r.url);
          return true;
        }).slice(0, 30);

        const promos = await promosForHosts([...new Set(results.map((r) => hostOf(r.url)))]).catch(() => new Map<string, string>());
        for (const r of results) if (!r.promo) r.promo = promos.get(hostOf(r.url)) ?? "";

        return Response.json(
          { engine: kind === "video" ? "commons" : "wikipedia", kind, results, nextOffset: ext.nextOffset },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
