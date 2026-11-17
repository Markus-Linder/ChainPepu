# ser7 – Server-Teil für die Higgsfield-Website

Diese Dateien liegen in der Higgsfield-Website (React/TanStack Start auf Cloudflare Workers)
unter `app/`. Die 3D-Welt selbst liegt in `../public/world/` und wird dort nach `app/public/world/` kopiert.

| Pfad | Zweck |
|---|---|
| `src/lib/ser7.server.ts` | Datenbank, regelbasierte Vorprüfung, Admin-Zugang, Stripe, Suche (Sponsoren, Einträge, Wikipedia, Commons-Videos) |
| `src/routes/api/search.ts` | Suche `?q=…&type=web|video` |
| `src/routes/api/submit.ts` | Webseite/Video eintragen |
| `src/routes/api/ads/*` | Werbeanzeigenmanager: Preise, Buchung mit Stripe Checkout, Status/Zahlen |
| `src/routes/api/admin/*` | Verwaltung: Liste, Freigeben/Ablehnen |
| `src/routes/api/click.ts` | Klickzählung für Sponsorplätze |
| `migrations/0002_ser7.sql` | Tabellen `listings` und `campaigns` (D1) |
| `public/submit`, `public/advertise`, `public/admin`, `public/imprint`, `public/terms`, `public/privacy` | Unterseiten |

## Geheimnisse (in den Higgsfield-Website-Einstellungen setzen)

- `ADMIN_PASSWORD` – Passwort für `/admin/`
- `STRIPE_SECRET_KEY` – geheimer Stripe-Schlüssel (`sk_live_…` bzw. zum Testen `sk_test_…`)
- optional `SPONSOR_PRICE_PER_DAY_CENTS` – Preis pro Tag in Cent (Standard 500 = 5 €)
