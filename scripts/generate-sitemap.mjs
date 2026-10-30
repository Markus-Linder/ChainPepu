#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const SITE = process.env.VITE_SITE_URL?.replace(/\/$/, "") || "https://profiangebot.de";
const read = (p) => fs.readFileSync(path.resolve(p), "utf8");

const tradeSlugs = [...read("src/data/trades.ts").matchAll(/slug: "([a-z0-9-]+)"/g)].map((m) => m[1]);
const citySlugs = [...read("src/data/cities.ts").matchAll(/slug: "([a-z0-9-]+)"/g)].map((m) => m[1]);
const articleSlugs = [...read("src/data/articles.ts").matchAll(/slug: "([a-z0-9-]+)"/g)].map((m) => m[1]);

const today = new Date().toISOString().slice(0, 10);
const urls = [
  ["/", "1.0", "weekly"],
  ["/angebot-pruefen", "0.9", "weekly"],
  ["/leistungsverzeichnis", "0.8", "weekly"],
  ["/vergleich", "0.7", "monthly"],
  ["/preise", "0.6", "monthly"],
  ["/gewerke", "0.8", "weekly"],
  ["/ratgeber", "0.7", "weekly"],
  ["/fuer-betriebe", "0.8", "monthly"],
  ["/kontakt", "0.3", "yearly"],
  ["/impressum", "0.1", "yearly"],
  ["/datenschutz", "0.1", "yearly"],
  ["/agb", "0.1", "yearly"],
  ["/widerruf", "0.1", "yearly"],
  ...tradeSlugs.map((t) => [`/gewerke/${t}`, "0.8", "weekly"]),
  ...tradeSlugs.flatMap((t) => citySlugs.map((c) => [`/gewerke/${t}/${c}`, "0.6", "monthly"])),
  ...articleSlugs.map((a) => [`/ratgeber/${a}`, "0.7", "monthly"]),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([loc, prio, freq]) => `  <url><loc>${SITE}${loc}</loc><lastmod>${today}</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`).join("\n")}
</urlset>
`;
fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/sitemap.xml", xml);
console.log(`Sitemap mit ${urls.length} URLs erzeugt: public/sitemap.xml`);
