# Start prompt for Lovable

Copy everything below the line into Lovable as the first prompt. Paste KNOWLEDGE.md into the project's Knowledge field first.

---

Build the marketing website for **LLM Readiness** (llmreadiness.com), a consulting service that checks whether AI assistants and agents can find, read, understand and recommend a business. Follow the project Knowledge exactly for positioning, categories, weights, pricing and hard requirements.

Tech: React with Vite, TypeScript, Tailwind, shadcn/ui. Use static prerendering for all public routes so every page's content is in the HTML without JavaScript. Add react-helmet-async or equivalent for per-page title, description, canonical, Open Graph and JSON-LD.

Pages and routes:

1. `/` Home
   - Hero: H1 "Get found, read and recommended by AI." Subline: "We audit how well ChatGPT, Claude, Perplexity and shopping agents can use your website, and fix what blocks them." A single URL input with button "Run free quick check".
   - Three proof points in one row with numbers: "6 categories, 40+ checks", "Report in 10 working days", "Prices from 1,900 €".
   - "How it works" in three steps: Check, Fix, Monitor.
   - Section "What we test" with six cards, one per category, each with weight and a one-line explanation.
   - Pricing teaser with the four products and prices, link to /pricing.
   - FAQ with 6 questions (also emitted as FAQPage JSON-LD).
   - Final CTA and footer with phone and email as plain text plus tel: and mailto: links.

2. `/check` Quick Check result
   - Accepts `?url=` and renders the result from a `AuditReport` object (type from the data contract below). For now load `/samples/sample-report.json` as mock data and show a notice "Example result" until the API exists.
   - Layout: big score with grade, six horizontal category bars (skipped categories greyed with the reason), "Top actions" list from findings of severity "kritisch" or "warnung" with their recommendation, then an accordion with all findings per category using the severity icons 🔴 🟠 🔵 🟢.
   - CTA card "Get the full audit with AI visibility test" linking to /pricing.
   - Email capture: "Send me this result as PDF" storing email and url in a Supabase table `quick_check_leads` (create it) with consent checkbox.

3. `/pricing` Four product cards from Knowledge, a comparison table, pricing FAQ, Service + Offer JSON-LD with price for each product.

4. `/methodology` One section per category: what we test, why it matters for agents, what good looks like, a short code or file example (robots.txt snippet, JSON-LD snippet, llms.txt snippet).

5. `/sample-report` Renders the full sample report including the "AI visibility" table layout even if the sample has no probe data (show the empty state).

6. `/agencies` Partner offer: white-label audits, revenue share, contact form to Supabase table `partner_requests`.

7. `/about`, `/contact`, `/imprint`, `/privacy`, `/terms`. Imprint and Privacy need placeholders for a German company (name, address, managing director, VAT ID, contact), clearly marked TODO.

8. `/unsubscribe` Reads `?e=<email>&t=<token>` from the query string, shows a one-line confirmation and writes `{email, token, created_at}` to a Supabase table `unsubscribes` on load (no extra click). Add `Disallow: /unsubscribe` is already in robots.txt. No navigation link to this page.

9. `/blog` and five articles with the slugs from sitemap.xml: `what-is-llm-readiness`, `llms-txt-guide`, `ai-crawlers-robots-txt`, `get-cited-by-chatgpt-perplexity`, `structured-data-for-ai-agents`. Use the titles and descriptions from `seo/SEO_PLAN.md`. Create the article pages with placeholder outlines (H2 questions, 2 sentences each) that I will fill; each with Article JSON-LD (headline, author, datePublished, dateModified).

Static files in `public/`: use the files provided in the `public/` folder of the upload (robots.txt, sitemap.xml, llms.txt, llms-full.txt) unchanged. Use the JSON-LD from `seo/jsonld-organization.json` on every page, `seo/jsonld-services.json` on / and /pricing, `seo/jsonld-faq.json` on / where the FAQ is rendered. Page titles and meta descriptions come from the table in `seo/SEO_PLAN.md`.

If those files are not available, generate them as follows in `public/`:
- `robots.txt` allowing all crawlers, explicitly listing OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Google-Extended, Applebot-Extended with `Allow: /`, and `Sitemap: https://llmreadiness.com/sitemap.xml`.
- `sitemap.xml` with all public routes.
- `llms.txt` in Markdown: H1 "LLM Readiness", a blockquote summary, sections "Services and prices", "How the audit works", "Contact", "Key pages" with absolute links.
- `llms-full.txt` with the methodology text.

Data contract, put in `src/types/audit.ts`:

```ts
export type Severity = "kritisch" | "warnung" | "hinweis" | "ok";

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
  recommendation: string;
  evidence: Record<string, unknown>;
}

export interface CategoryResult {
  key: "crawlers" | "discovery" | "structured" | "content" | "interfaces" | "visibility";
  name: string;
  weight: number;
  score: number;
  findings: Finding[];
  skipped: boolean;
  skipped_reason: string;
}

export interface ProbeQuestion {
  question: string;
  answer: string;
  target_mentioned: boolean;
  target_cited: boolean;
  providers_mentioned: string[];
  sources: string[];
  error: string;
}

export interface AuditReport {
  url: string;
  domain: string;
  brand: string;
  generated_at: string;
  categories: CategoryResult[];
  total_score: number;
  probe: ProbeQuestion[];
  meta: Record<string, unknown>;
}
```

Category names in the JSON are German (the engine is German); map them to English labels in the UI: crawlers → "Crawler access", discovery → "Discoverability", structured → "Structured data", content → "Content clarity", interfaces → "Agent interfaces", visibility → "AI visibility". Severity labels: kritisch → Critical, warnung → Warning, hinweis → Note, ok → OK.

Design: light background, one accent color (deep green #0F5132 or similar), dark text, Inter for text, JetBrains Mono for scores and code. Generous spacing, no stock photos, no robot illustrations. Score dial and category bars should look like a technical dashboard.

Accessibility and performance: semantic HTML, one H1 per page, alt text on every image, keyboard-navigable accordion, Lighthouse above 90.

Start with Home, /check and /pricing, then the rest.
