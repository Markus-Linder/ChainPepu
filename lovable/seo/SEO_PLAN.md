# SEO- und GEO-Plan für llmreadiness.com

Ziel: Kunden finden llmreadiness.com über Google **und** über KI-Assistenten. Beides braucht dieselbe Grundlage, Agenten brauchen zusätzlich die Dateien aus `lovable/public/` und die JSON-LD-Snippets aus diesem Ordner.

## 1. Keyword-Cluster (Englisch, international)

| Cluster | Suchbegriffe | Seite |
|---|---|---|
| Kernbegriff | llm readiness, llm readiness audit, llm readiness check, ai readiness website | Home, /methodology |
| Sichtbarkeit | ai visibility audit, ai search visibility, get cited by chatgpt, show up in perplexity, chatgpt recommendations business | Home, /blog/get-cited-by-chatgpt-perplexity |
| GEO | generative engine optimization, geo audit, geo agency, answer engine optimization | /methodology, Blog |
| Technik | llms.txt, llms.txt generator, llms.txt example, ai crawlers robots.txt, block or allow gptbot, oai-searchbot, claudebot robots | /blog/llms-txt-guide, /blog/ai-crawlers-robots-txt |
| Daten | schema markup for ai, structured data ai agents, json-ld for llm | /blog/structured-data-for-ai-agents |
| Agenten | agent ready website, agentic commerce readiness, mcp server for business | /methodology, Blog |
| Kauf | ai visibility consultant, llm seo agency, ai search optimization services pricing | /pricing, /agencies |

Deutsche Keywords (KI-Sichtbarkeit, llms.txt Anleitung, GEO Agentur, in ChatGPT gefunden werden) laufen über kiwerbung.de bzw. kiempfiehlt.com, nicht über diese Domain.

## 2. Seitentitel und Descriptions

| Route | Title (max. 60 Zeichen) | Description (max. 155 Zeichen) |
|---|---|---|
| / | LLM Readiness Audit – Get Found by AI Assistants | We audit how ChatGPT, Claude and Perplexity read your website and fix what blocks them. Free quick check, full audit from 1,900 €. |
| /check | Free LLM Readiness Quick Check | Enter your URL and get a 0–100 score across crawler access, structured data, content clarity and agent interfaces in under a minute. |
| /pricing | LLM Readiness Pricing – Audit, Implementation, Monitoring | Readiness Audit from 1,900 €, implementation from 6,500 €, monitoring 490 €/month. All prices listed, no quote request needed. |
| /methodology | How the LLM Readiness Audit Works – 6 Categories, 40+ Checks | What we test in crawler access, discoverability, structured data, content clarity, agent interfaces and AI visibility, and why it matters. |
| /sample-report | Sample LLM Readiness Report | A complete real audit report: scores, findings, recommendations and the AI visibility table. |
| /agencies | LLM Readiness for Agencies – White-Label Audits | Add AI visibility audits to your agency offer. White-label reports, partner pricing, revenue share. |
| /blog/what-is-llm-readiness | What Is LLM Readiness? Definition, Checklist, Examples | Plain definition, how it differs from SEO and GEO, a 12-point checklist you can run today. |
| /blog/llms-txt-guide | llms.txt Guide: Format, Examples, Generator | What llms.txt is, who reads it, a copy-paste template and the mistakes that make it useless. |
| /blog/ai-crawlers-robots-txt | AI Crawlers in robots.txt: Allow Search, Block Training | Complete list of AI user agents, which ones affect visibility, and a ready robots.txt. |
| /blog/get-cited-by-chatgpt-perplexity | How to Get Cited by ChatGPT and Perplexity | What answer engines cite, how we measure it, and the seven changes that moved clients from 0 to regular mentions. |
| /blog/structured-data-for-ai-agents | Structured Data for AI Agents: The JSON-LD That Matters | Organization, Service, Product, Offer, FAQPage: which types agents actually use, with validated examples. |

## 3. Inhalte, die Verlinkungen und Zitate bringen

Reihenfolge nach Wirkung, je ein Artikel pro Woche:

1. **AI crawler list** (robots.txt-Artikel). Listen werden verlinkt und von KI-Antworten zitiert. Monatlich aktualisieren, Datum sichtbar.
2. **llms.txt guide mit Generator.** Ein kleines Formular, das eine llms.txt erzeugt. Tools bekommen Links.
3. **State of LLM Readiness report.** 100 Websites einer Branche mit dem eigenen Werkzeug auditieren, Ergebnisse als Studie mit Zahlen veröffentlichen. Presse und Backlinks, außerdem Rohmaterial für Outreach.
4. **Vorher-Nachher-Fallstudien** aus den ersten Audits, mit echten Nennungsquoten.
5. **Glossar**: LLM readiness, GEO, AEO, llms.txt, MCP, agentic commerce. Kurze Definitionen, die Assistenten gern übernehmen.

Schreibregeln: Zahlen statt Adjektive, eine Frage pro Abschnitt als H2, Antwort im ersten Satz, Tabellen für Vergleiche, Datum und Autor sichtbar, Quellen verlinkt.

## 4. Technische Checkliste (muss vor dem Start erfüllt sein)

- [ ] Alle öffentlichen Seiten vorgerendert, Inhalt ohne JavaScript im HTML
- [ ] `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt` aus `lovable/public/` live
- [ ] JSON-LD aus `jsonld-organization.json` auf jeder Seite, `jsonld-services.json` auf / und /pricing, `jsonld-faq.json` auf / (nur wenn die FAQ dort sichtbar ist)
- [ ] BreadcrumbList auf Unterseiten, Article mit author und datePublished auf Blogartikeln
- [ ] Ein H1 pro Seite, Title und Description aus Tabelle oben, Canonical, `lang="en"`, Open Graph mit Bild 1200×630
- [ ] Preise als Text auf / und /pricing, Telefon und E-Mail als Text und als tel:/mailto:
- [ ] Core Web Vitals grün, Lighthouse über 90, Bilder als WebP mit Alt-Text
- [ ] Google Search Console und Bing Webmaster Tools verifiziert, Sitemap eingereicht
- [ ] Eigenes Audit gegen llmreadiness.com läuft mit mindestens 90 Punkten

## 5. Autorität aufbauen

- Einträge: Clutch, G2 (Kategorie SEO/AI), Crunchbase, LinkedIn-Unternehmensseite, Google Business Profile (auch für reine Online-Dienstleister sinnvoll), Product Hunt für den Quick Check.
- Gastbeiträge und Podcasts zu GEO und AI search bei Marketing-Publikationen, immer mit Link auf den Crawler-Artikel oder den llms.txt-Guide.
- Open-Source-Komponente: das Audit-Werkzeug auf GitHub öffentlich machen, README verlinkt auf llmreadiness.com. Entwickler verlinken Tools.
- Jede Fallstudie mit Zustimmung des Kunden und Nennung der Domain.

## 6. Messung

- Search Console: Impressionen und Klicks pro Cluster, monatlich.
- KI-Sichtbarkeit: das eigene Werkzeug mit `--probe` und festem Fragenkatalog (`lovable/seo/probe-questions.txt`) monatlich gegen llmreadiness.com laufen lassen. Zielwert: in 10 von 10 Fragen genannt bis Monat 6.
- Leads: Quick-Check-Nutzungen, Audit-Anfragen, Quelle pro Lead in Supabase.
