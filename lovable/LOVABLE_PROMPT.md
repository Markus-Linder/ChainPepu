# Prompt für Lovable

Diesen Text als ersten Prompt in ein neues Lovable-Projekt einfügen. Danach Supabase verbinden,
die drei Migrationen aus `supabase/migrations/` ausführen und die Dateien aus `src/`, `public/` und `index.html` übernehmen.

---

Baue eine internationale Social-Web-App namens **ChainPepu** (5 Sprachen: en, de, es, fr, pt, automatische Erkennung, Umschalter). Exklusives, dunkles Markendesign: Obsidian #06050d, Violett #7b61ff → Magenta #ff3d9a, Champagner-Gold #f2c46d für Sterne, Schrift Space Grotesk (Überschriften) + Inter, eigenes SVG-Icon-Set statt Emojis, mobil zuerst, installierbar als PWA.

**Kernidee:** Jeder Mensch ist ein Planet. Jeder Beitrag ist ein Kettenglied. Wer eine Kette startet, bleibt als Ursprung sichtbar, andere hängen ihr Glied an und können unter jedem Glied antworten. Die Startseite ist eine Universumskarte: Planeten (Nutzer), verbunden durch Linien (gemeinsame Ketten). Gespendete Sterne und Boosts stehen als Plakette direkt an der Kette auf der Karte. Creator-Themen leuchten pink.

**Seiten:** `/` (Hero, Karte, Themen von Creators, heiße Ketten, „So funktioniert es“, Creator-Economy 80/20, Sicherheit), `/today` (Tages-Ereignis mit Countdown), `/chains`, `/c/:id` (Kette mit Gliedern, Antworten, Spenden, Einladung, Boost, Vollbild-Player), `/p/:username` (Planet, Einnahmen, Archiv aller gestarteten Ketten nach Jahren, durchsuchbar), `/new` (Kette oder Thema mit Beschreibung und Laufzeit 1–14 Tage), `/shop`, `/notifications`, `/moderation`, `/rules`, `/about` (Partner & Investoren), `/login`, `/signup`, `/invite/:token`.

**Sterne:** 50 zum Start, +1 pro sichtbarem Glied, +10 pro Einladung. Boost 25, Skins 0–200. Sterne-Pakete über Stripe Checkout (Edge Function), ohne Stripe Demo-Modus. Spenden an Creator: 80 % Creator, 20 % Plattform (`app_settings.creator_share_percent`), Hinweis auf Startseite, Shop und Regeln. Auszahlung ab Mindestbetrag.

**Prüfung vor Veröffentlichung:** Jedes Glied und jede Antwort wird mit Status `pruefung` angelegt. Der Client lädt bei Videos vorher 4 Standbilder hoch (`video_frames`) und ruft die Edge Function `moderate-content` auf, die Text + Bilder mit Claude prüft und den Status auf `sichtbar` oder `gesperrt` (mit Begründung) setzt; unklare Fälle gehen als `gemeldet` an Menschen. Der Client wartet bis zu 25 s und zeigt dem Autor das Ergebnis. Dazu Wortfilter (`banned_terms`), Melden, automatisches Verbergen ab 3 Meldungen, Moderationsseite. Schalter `app_settings.premoderation` = 'ki' | 'aus'.

**Backend Supabase:** Tabellen `profiles`, `chains` (mit `description`, `is_topic`, `ends_at`), `links` (mit `video_url`, `video_frames`, `status`, `moderation_note`), `replies`, `invites`, `purchases`, `app_settings`, `follows`, `notifications` (mit `params` jsonb für Übersetzung), `donations`, `platform_ledger`, `payouts`, `reports`, `banned_terms`; Sichten `chain_stats`, `map_edges`, `creator_stats`; Buckets `bilder`, `videos`. Schreiben nur über `security definer`-Funktionen: `start_chain`, `add_link`, `add_reply`, `boost_chain`, `buy_skin`, `use_invite`, `ensure_daily_chain`, `demo_add_stars`, `follow_creator`, `unfollow_creator`, `donate_stars`, `request_payout`, `convert_earnings`, `report_link`, `moderate_link`, `moderate_reply`, `mark_notifications_read`, `accept_rules`. Trigger `link_visible`/`reply_visible` vergeben Sterne und Mitteilungen erst, wenn ein Beitrag sichtbar wird.

Die genauen SQL-Migrationen, die Edge Functions und der komplette Frontend-Code liegen bei; bitte diese verwenden statt sie neu zu erfinden.
