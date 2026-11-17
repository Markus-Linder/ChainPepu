import { createFileRoute } from "@tanstack/react-router";
import {
  commonsVideos,
  hostOf,
  listingResults,
  promosForHosts,
  sponsoredResults,
  wikipediaResults,
  type Kind,
  type SearchResult,
} from "../../lib/ser7.server";

// Reihenfolge: Sponsorplätze (gekennzeichnet) → eingetragene Seiten/Videos → Wikipedia bzw. Commons
export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const q = (u.searchParams.get("q") ?? "").trim().slice(0, 200);
        const langParam = u.searchParams.get("lang") ?? "de";
        const lang = /^[a-z]{2}$/.test(langParam) ? langParam : "de";
        const kind: Kind = u.searchParams.get("type") === "video" ? "video" : "web";
        if (!q) return Response.json({ error: "Suchbegriff fehlt" }, { status: 400 });

        const safe = async (p: Promise<SearchResult[]>) => {
          try {
            return await p;
          } catch (e) {
            console.error(e);
            return [];
          }
        };
        const [sponsored, listed, external] = await Promise.all([
          safe(sponsoredResults(q, kind)),
          safe(listingResults(q, kind)),
          safe(kind === "video" ? commonsVideos(q) : wikipediaResults(q, lang)),
        ]);
        const seen = new Set<string>();
        const results = [...sponsored, ...listed, ...external].filter((r) => {
          if (seen.has(r.url)) return false;
          seen.add(r.url);
          return true;
        }).slice(0, 24);

        const promos = await promosForHosts([...new Set(results.map((r) => hostOf(r.url)))]).catch(() => new Map<string, string>());
        for (const r of results) if (!r.promo) r.promo = promos.get(hostOf(r.url)) ?? "";

        if (!results.length && !external.length && kind === "web") {
          return Response.json({ error: "Suche nicht erreichbar" }, { status: 502 });
        }
        return Response.json({ engine: kind === "video" ? "commons" : "wikipedia", kind, results }, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
