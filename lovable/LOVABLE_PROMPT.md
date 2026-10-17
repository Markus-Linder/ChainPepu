# Prompt für Lovable

Diesen Text als ersten Prompt in ein neues Lovable-Projekt einfügen. Danach Supabase verbinden,
die Migration aus `supabase/migrations/` ausführen und die Dateien aus `src/` übernehmen.

---

Baue eine deutschsprachige Social-Web-App namens **ChainPepu**. Dunkles Weltraum-Design (Hintergrund #05040f, Akzente Violett #7c5cff und Pink #ff5cc8, Sterne-Gelb #ffd26b), mobil zuerst, installierbar als PWA.

**Kernidee:** Jeder Mensch ist ein Planet. Jeder Beitrag ist ein Kettenglied. Wer eine Kette startet, bleibt als Ursprung sichtbar, andere hängen ihr Glied an. Die Startseite ist keine Liste, sondern eine Universumskarte: Planeten (Nutzer), verbunden durch Linien (gemeinsame Ketten). Große und geboostete Ketten leuchten stärker.

**Seiten:**
- `/` Universumskarte (SVG, ziehen und zoomen), Statistik, Hinweis auf das Tages-Ereignis, Liste der heißesten Ketten
- `/heute` Tages-Ereignis: jeden Tag ein neues Thema aus einer festen Liste, eine gemeinsame Kette für alle, Countdown bis Mitternacht UTC
- `/ketten` alle Ketten, sortierbar nach heiß und neu
- `/c/:id` eine Kette: alle Glieder in Reihenfolge, Formular zum Anhängen (Text bis 500 Zeichen, optionales Bild per Upload, Farbe), Einladungslink erzeugen, Kette boosten
- `/p/:username` Planet eines Nutzers: großes Planeten-Bild, gestartete und mitgebaute Ketten, letzte Glieder
- `/neu` neue Kette starten (Titel + erstes Glied)
- `/shop` Planeten-Skins (Standard, Lava, Eis, Neon, Gold, Void) und Sterne-Pakete kaufen
- `/login`, `/registrieren` (E-Mail, Passwort, Nutzername, Anzeigename), `/einladung/:token`

**Planeten:** Aussehen deterministisch aus einem Zufalls-Seed (Farben, Größe, Ringe, Monde) als SVG, Position im Universum ebenfalls aus dem Seed auf einer Spiralgalaxie.

**Sterne (Währung):** 50 zum Start, +1 pro angehängtem Glied, +10 wenn jemand über deinen Einladungslink beitritt. Boost kostet 25, Skins 0 bis 200. Sterne-Pakete über Stripe Checkout (Edge Function), solange kein Stripe da ist im Demo-Modus.

**Backend Supabase:** Tabellen `profiles`, `chains`, `links`, `invites`, `purchases`, `app_settings`; Sichten `chain_stats` und `map_edges`; Storage-Bucket `bilder`. Alles Lesen ist öffentlich, alles Schreiben läuft über Postgres-Funktionen mit `security definer`: `start_chain`, `add_link`, `boost_chain`, `buy_skin`, `use_invite`, `ensure_daily_chain`, `demo_add_stars`. Profil wird per Trigger beim Signup aus den Metadaten angelegt.

Die genaue SQL-Migration und der komplette Frontend-Code liegen bei; bitte diese verwenden statt sie neu zu erfinden.
