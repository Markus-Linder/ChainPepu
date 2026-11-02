# Data contract between the audit engine and the website

## Report JSON

The Python engine writes one JSON file per audit. `samples/sample-report.json` is a real example. Structure:

```
AuditReport
├─ url            string   normalized start page, e.g. "https://www.example.com/"
├─ domain         string   "example.com"
├─ brand          string   brand name, guessed from the title or passed with --brand
├─ generated_at   string   "2026-11-01 22:40 UTC"
├─ total_score    number   0..100, weighted over non-skipped categories
├─ categories[]   CategoryResult (always 6, in fixed order)
│   ├─ key            "crawlers" | "discovery" | "structured" | "content" | "interfaces" | "visibility"
│   ├─ name           German display name from the engine
│   ├─ weight         20 | 15 | 25 | 25 | 15 | 30
│   ├─ score          0..100
│   ├─ skipped        boolean (true for visibility when --probe was not run)
│   ├─ skipped_reason string
│   └─ findings[]     Finding
│       ├─ severity       "kritisch" | "warnung" | "hinweis" | "ok"
│       ├─ title          short German sentence
│       ├─ detail         evidence in prose, may be empty
│       ├─ recommendation what to do, may be empty
│       └─ evidence       free-form object (urls, counts, lists)
├─ probe[]        ProbeQuestion (empty without --probe)
│   ├─ question, answer
│   ├─ target_mentioned, target_cited   boolean
│   ├─ providers_mentioned[]            competitor names found in the answer
│   ├─ sources[]                        URLs the assistant searched
│   └─ error                            non-empty if this question failed
└─ meta
    ├─ final_url, http_status, title
    ├─ probe_summary { asked, valid, mentioned, cited, score, top_competitors[[name, count], ...] }
    └─ probe_model
```

Texts are German today because the first customers are German-speaking. For llmreadiness.com the engine will get an `--lang en` switch; the keys and structure stay the same. The UI should therefore map by `key` and `severity`, never by the German display strings.

## Planned HTTP API (step 2)

A small FastAPI service around the engine:

```
POST /api/audit
{ "url": "https://example.com", "probe": false }
→ 202 { "job_id": "..." }

GET /api/audit/{job_id}
→ 200 { "status": "running" | "done" | "failed", "report": AuditReport | null }
```

- Quick Check on the website calls it with `probe: false`. Runtime 10 to 40 seconds, so the UI polls.
- Full audits with `probe: true` are run by us manually or by a queue, not from the public site.
- Rate limit per IP and a simple captcha before the public endpoint goes live.
- The Lovable frontend should read the API base URL from an environment variable and fall back to the sample JSON when it is not set.

## Running the engine locally

```bash
pip install -e ".[probe,dev]"
agent-readiness audit https://example.com --out reports
agent-readiness audit https://example.com --probe --questions 10 --brand "Example Inc"
```
