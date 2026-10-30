# Profiangebot Plattform

Angebots-Check, Leistungsverzeichnis-Generator, Angebotsvergleich und Lead-Marktplatz für Handwerksbetriebe. Rein online, KI-gestützt, DSGVO-orientiert.

**Stack (Lovable-kompatibel):** Vite, React 18, TypeScript, Tailwind, shadcn-Komponenten, React Router, TanStack Query, Supabase (Postgres, Auth, Storage, Edge Functions), Stripe, Anthropic Claude.

---

## Funktionen

| Bereich | Route | Beschreibung |
|---|---|---|
| Angebots-Check | `/angebot-pruefen` | PDF/Foto hochladen, KI prüft Positionen, Preise (Richtwerte + anonymisierte Marktdaten), fehlende Leistungen, Risiken, Formalien. Kostenlose Vorschau. |
| Prüfbericht | `/bericht/:id?t=TOKEN` | Vorschau kostenlos, vollständiger Bericht 9,99 € (Stripe). Druck/PDF. Lead-Freigabe für bis zu 3 Betriebe. |
| Leistungsverzeichnis | `/leistungsverzeichnis` | Diktat (Web Speech API) oder Text plus Fotos, KI erstellt strukturiertes LV. |
| Vergleich | `/vergleich` | Mehrere geprüfte Angebote (lokal im Browser gemerkt) normalisiert vergleichen. |
| Gewerke-SEO | `/gewerke/:trade`, `/gewerke/:trade/:city` | 10 Gewerke × 30 Städte, Richtwerttabellen, FAQ-Schema, Breadcrumbs. |
| Ratgeber | `/ratgeber/:slug` | 6 Artikel mit Article-Schema. |
| Betriebe | `/fuer-betriebe`, `/betriebe/login`, `/betriebe/dashboard` | Registrierung, Profil (Gewerke, PLZ-Gebiete), Lead-Marktplatz, Lead-Kauf (49 €/39 €), Mitgliedschaft (59 €/Monat), Stripe-Kundenportal. |
| Rechtliches | `/impressum`, `/datenschutz`, `/agb`, `/widerruf`, `/kontakt` | Vollständig mit Kontaktdaten Markus Linder. |

---

## 1. Lokale Einrichtung

```bash
npm install
cp .env.example .env   # VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SITE_URL eintragen
npm run dev            # http://localhost:8080
```

`npm run build` erzeugt zuerst `public/sitemap.xml` (329 URLs), prüft Typen und baut nach `dist/`.

---

## 2. Supabase einrichten

1. Neues Projekt auf https://supabase.com anlegen (Region **Frankfurt (eu-central-1)**).
2. SQL ausführen: Inhalt von `supabase/migrations/20261030120000_init.sql` im SQL-Editor einfügen und starten. Alternativ per CLI:
   ```bash
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase db push
   ```
   Das legt Tabellen, RLS-Policies, RPC-Funktionen, den privaten Storage-Bucket `quotes` und 58 Richtwerte an.
3. **Auth:** Authentication → Providers → E-Mail aktivieren. Unter URL Configuration die Site URL (`https://profiangebot.de`) und Redirect URLs (`https://profiangebot.de/**`, lokal `http://localhost:8080/**`) eintragen. Optional "Confirm email" deaktivieren, damit Betriebe sofort loslegen können.
4. **Edge Functions deployen:**
   ```bash
   npx supabase functions deploy analyze-quote generate-lv compare-quotes release-lead create-checkout stripe-webhook contact --no-verify-jwt
   ```
   (`supabase/config.toml` setzt `verify_jwt = false`, weil die Kundenseite ohne Login arbeitet; Betriebs-Aufrufe werden in der Funktion über den Bearer-Token geprüft.)
5. **Secrets setzen** (Dashboard → Edge Functions → Secrets oder CLI):
   ```bash
   npx supabase secrets set \
     ANTHROPIC_API_KEY=sk-ant-... \
     STRIPE_SECRET_KEY=sk_live_... \
     STRIPE_WEBHOOK_SECRET=whsec_... \
     STRIPE_PRICE_PREMIUM_REPORT=price_... \
     STRIPE_PRICE_LEAD=price_... \
     STRIPE_PRICE_LEAD_MEMBER=price_... \
     STRIPE_PRICE_MEMBERSHIP=price_... \
     SITE_URL=https://profiangebot.de \
     CONTACT_EMAIL=kontakt@profiangebot.de \
     RESEND_API_KEY=re_... \
     FROM_EMAIL="Profiangebot <kontakt@profiangebot.de>"
   ```
   `SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` stellt Supabase automatisch bereit. `RESEND_API_KEY`/`FROM_EMAIL` sind optional; ohne sie werden E-Mails nur geloggt. Für Resend die Domain `profiangebot.de` verifizieren (SPF/DKIM).
   `ANTHROPIC_MODEL` ist optional (Standard `claude-opus-5-5`).

---

## 3. Stripe einrichten

1. Produkte und Preise anlegen (idempotent):
   ```bash
   STRIPE_SECRET_KEY=sk_live_... npm run stripe:setup
   ```
   Das Skript legt vier Produkte an (Prüfbericht 9,99 €, Anfrage 49 €, Anfrage Mitglieder 39 €, Mitgliedschaft 59 €/Monat) und gibt die `STRIPE_PRICE_*`-Werte für die Supabase-Secrets aus. Für Tests zuerst mit `sk_test_...` ausführen.
2. Webhook anlegen: Stripe Dashboard → Developers → Webhooks → Endpoint `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook` mit den Events
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
   Den Signing Secret als `STRIPE_WEBHOOK_SECRET` setzen.
3. Stripe-Einstellungen: Kundenportal aktivieren (Billing → Customer portal), Zahlungsmethoden (Karte, SEPA, PayPal, Apple/Google Pay), Rechnungsadresse und USt-IdNr. DE364689720 hinterlegen. Steuer: Preise sind `tax_behavior: inclusive`; bei Bedarf Stripe Tax aktivieren.

---

## 4. In Lovable importieren

1. Lovable → New Project → **Import from GitHub** → dieses Repository (Branch mit dem Code).
2. Lovable → Integrations → **Supabase** verbinden (bestehendes Projekt wählen). Lovable setzt `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` automatisch; zusätzlich `VITE_SITE_URL=https://profiangebot.de` als Environment Variable setzen.
3. Edge Functions werden von Lovable aus dem Ordner `supabase/functions` deployt; Secrets wie in Abschnitt 2 setzen.
4. Domain: Lovable → Settings → Domains → `profiangebot.de` verbinden (DNS: A-Record bzw. CNAME laut Lovable-Anleitung).

Alternativ läuft das Projekt auf jedem statischen Host (Vercel, Netlify, Cloudflare Pages): `npm run build`, Ordner `dist/` ausliefern. SPA-Rewrites liegen in `vercel.json` bzw. `public/_redirects`.

---

## 5. Go-Live-Checkliste

- [ ] Migration ausgeführt, Bucket `quotes` vorhanden
- [ ] Edge Functions deployt, alle Secrets gesetzt
- [ ] `npm run stripe:setup` ausgeführt, Webhook aktiv, Testkauf mit `4242 4242 4242 4242` erfolgreich
- [ ] Testupload eines echten Angebots: Bericht erscheint, Premium-Freischaltung funktioniert
- [ ] Betrieb registriert, Profil gespeichert, Lead gekauft, Kontaktdaten sichtbar
- [ ] Resend-Domain verifiziert (optional)
- [ ] Google Search Console: `https://profiangebot.de/sitemap.xml` einreichen
- [ ] Datenschutzerklärung gegenlesen (Abschnitte 4, 7, 8 nennen Anthropic, Stripe, Resend)

---

## Projektstruktur

```
src/
  components/      UI-Bausteine (shadcn-Stil), Layout, SEO, LeadReleaseForm, ScoreRing
  data/            Gewerke, Städte, Richtwerte, Artikel, Rechts-/Preisdaten
  hooks/           useAuth, useMyQuotes (lokale Angebotsliste)
  lib/api.ts       Aufrufe der Edge Functions und RPCs
  pages/           Alle Routen
supabase/
  migrations/      Schema, RLS, RPC, Seed
  functions/       analyze-quote, generate-lv, compare-quotes, release-lead, create-checkout, stripe-webhook, contact, _shared
scripts/           stripe-setup.mjs, generate-sitemap.mjs
docs/              Marktanalysen und Umsatzmodell
```

## Sicherheit und Datenschutz

- Alle Schreibzugriffe laufen über Edge Functions mit Service-Role; Kundenberichte sind nur per ID + Zugriffstoken (RPC `get_quote_report`) erreichbar.
- Betriebe sehen Leads nur anonymisiert (RPC `list_marketplace_leads`); Kontaktdaten erst nach bezahltem Kauf (RPC `get_purchased_leads`).
- Stripe-Webhooks werden signaturgeprüft und idempotent verarbeitet (`processed_stripe_events`).
- Der Storage-Bucket `quotes` ist privat.
- KI-Aufrufe nutzen strukturierte Ausgaben (JSON-Schema) und serverseitige Fallbacks; eine Ablehnung oder ein Schema-Fehler wird als Fehler am Angebot gespeichert, nicht als Bericht.

## Lizenz

Proprietär. © Markus Linder.
