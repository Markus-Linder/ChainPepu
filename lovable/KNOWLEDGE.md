# Project Knowledge: llmreadiness.com

## What this is
LLM Readiness is a consulting service and self-service check that answers one question for businesses: **Can AI assistants and agents (ChatGPT, Claude, Perplexity, Gemini, shopping agents) find, read, understand and recommend you?**

We audit a website across six categories, produce a score from 0 to 100 with a grade from A to E, and deliver a prioritized action list. Optionally we run real customer questions through an AI assistant with web search and measure whether the business is mentioned or cited, and which competitors are named instead.

## Audience
- Primary: owners and marketing leads of companies with 10 to 500 employees that sell online or generate leads online: e-commerce, B2B manufacturers and dealers, hotels, software vendors, service businesses with bookings.
- Secondary: web agencies that want to add agent readiness to their offer.
- Language of the site: English. Operating company is based in Germany, so legal pages (Imprint, Privacy) are required and GDPR applies.

## Positioning and tone
- Plain, factual, confident. No hype words like "revolutionary", "cutting-edge", "unlock".
- Every claim is backed by a number or a concrete mechanism.
- We are technical specialists, not an ad agency. We talk about crawlers, structured data, llms.txt, MCP, citations.
- The site itself must be a showcase: it has to score A in our own audit.

## The six audit categories (use these names and weights everywhere)
| Category | Weight | What it covers |
|---|---|---|
| Crawler access | 20 % | robots.txt, blocks for AI search crawlers, network-level bot blocking, TLS |
| Discoverability | 15 % | sitemap, llms.txt, feeds, canonical, language |
| Structured data | 25 % | JSON-LD for organization, products/services/offers with prices, FAQ, Open Graph |
| Content clarity | 25 % | text readable without JavaScript, title, description, H1, visible prices, contact details, facts over fluff |
| Agent interfaces | 15 % | OpenAPI, MCP endpoint, agent manifests, direct contact links instead of forms |
| AI visibility | 30 % | real customer questions asked to an AI assistant with web search: mentions, citations, competitors named |

Grades: A 85+ "agent-ready", B 70+ "good with gaps", C 50+ "partially visible", D 30+ "hard for agents to use", E below 30 "practically invisible".

## Offer and pricing (show prices openly, that is part of our message)
| Product | Price | Content |
|---|---|---|
| Free Quick Check | 0 € | Technical categories only, instant score, top 3 issues, email capture optional |
| Readiness Audit | from 1,900 € | Full audit incl. AI visibility test with 10 customer questions, written report, 60-minute walkthrough call, prioritized roadmap. Delivery within 10 working days |
| Implementation | from 6,500 € | We implement the roadmap or guide the client's agency: structured data, llms.txt, content rewrite, crawler fixes, optional API/MCP endpoint. 4 to 8 weeks |
| Monitoring | 490 € per month | Monthly re-run of the audit and the AI visibility test with a fixed question set, competitor tracking, short report |

All prices net, plus VAT where applicable.

## Site structure (priority order)
1. **Home**: hero with URL input for the Free Quick Check, one-sentence promise, three proof points, how it works in 3 steps, the six categories, pricing teaser, FAQ, CTA.
2. **Quick Check result page**: score dial, grade, category bars, top issues with recommendations, CTA to book the full audit. Uses the JSON structure from DATA_CONTRACT.md.
3. **Pricing**: the four products as cards, comparison table, FAQ about pricing.
4. **How it works / Methodology**: explains each category, what we test, why it matters for agents, sample report excerpt.
5. **Sample report**: renders samples/sample-report.json as a full public example.
6. **For agencies**: white-label and partner offer, contact form.
7. **About and Contact**: who we are, email, phone as text, no image-only contact.
8. **Legal**: Imprint, Privacy policy, Terms.

## Hard requirements for the site itself
- Public pages must be server-rendered or prerendered. Content must be in the HTML without JavaScript.
- JSON-LD on every page: Organization (home), Service + Offer with price for each product, FAQPage where FAQs appear, BreadcrumbList.
- `/llms.txt` with a Markdown summary of the offer, prices, contact, key pages. `/llms-full.txt` with the methodology.
- `robots.txt` that allows all AI search crawlers (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Google-Extended, Applebot-Extended) and references the sitemap.
- Sitemap, canonical links, `lang="en"`, Open Graph tags, exactly one H1 per page.
- Phone and email as plain text and as tel:/mailto: links.
- Prices visible as text on Home and Pricing.
- Lighthouse performance and accessibility above 90.
- Cookie-free analytics (Plausible or Umami) or none. No tracking before consent.

## Brand
- Name: LLM Readiness
- Domain: llmreadiness.com
- Tagline options: "Be the answer." / "Get found, read and recommended by AI." / "Your website, readable by every agent."
- Visual direction: clean, technical, light background, one accent color (deep green or electric blue), monospace accents for scores and code, generous white space. No stock photos of robots.

## Out of scope for version 1
- User accounts, payment processing, running the Python audit in the browser.
- Multi-language. English only.
