# ChainPepu – Das Universum aus Ketten

Kostenlose Social-Plattform mit einem einzigen Kern-Mechanismus: **Ketten**.

- **Jeder Mensch ist ein Planet.** Bei der Registrierung bekommt jeder einen einzigartigen Planeten (Aussehen aus einem Zufalls-Seed).
- **Jeder Beitrag ist ein Kettenglied.** Wer eine Kette startet, bleibt als Ursprung sichtbar, egal wie lang sie wird. Andere hängen ihr Glied an.
- **Die Entdeckung ist eine Karte.** Die Startseite zeigt das Universum: Planeten, verbunden durch die Ketten, an denen sie gemeinsam gebaut haben. Große und geboostete Ketten leuchten.
- **Tages-Ereignis.** Jeden Tag baut das ganze Universum eine gemeinsame Kette zu einem Thema, mit Countdown bis Mitternacht (UTC).
- **Einladungen sind Kettenglieder.** Ein Einladungslink führt direkt in die Kette; wer darüber einen Planeten erstellt, landet sofort dort. Der Einladende bekommt Sterne.
- **Kostenlos, mit optionalen Käufen.** Sterne sind die interne Währung (gibt es fürs Mitmachen und Einladen). Damit kauft man Planeten-Skins und Ketten-Booster. Sterne-Pakete laufen über Stripe; ohne Stripe-Schlüssel im Demo-Modus.
- **PWA.** Installierbar auf dem Handy, ohne App-Store.

## Starten

Voraussetzung: Node 22.13 oder neuer (die eingebaute SQLite-Datenbank von Node wird genutzt).

```bash
npm install
cp .env.example .env     # SESSION_SECRET setzen
npm run dev              # http://localhost:3000
```

Produktion:

```bash
npm run build
npm start
```

Die Datenbank liegt unter `data/chainpepu.db` (per `DATABASE_PATH` änderbar). Beim ersten Start wird das Schema automatisch angelegt.

## Umgebungsvariablen

| Variable | Zweck |
|---|---|
| `SESSION_SECRET` | Schlüssel für Sitzungs-Cookies. In Produktion zwingend setzen. |
| `DATABASE_PATH` | Pfad zur SQLite-Datei. Standard `./data/chainpepu.db`. |
| `NEXT_PUBLIC_APP_URL` | Öffentliche URL, wird in Einladungslinks verwendet. |
| `STRIPE_SECRET_KEY` | Optional. Aktiviert echte Sterne-Käufe über Stripe Checkout. |

## Aufbau

```
src/lib/db.ts        Datenschicht (SQLite). Einzige Stelle, die mit der Datenbank spricht.
src/lib/auth.ts      Sitzungen (signierte Cookies), Passwort-Hashing
src/lib/actions.ts   Server Actions: Registrieren, Ketten, Glieder, Einladungen, Shop
src/lib/planet.ts    Planeten-Aussehen und Position im Universum aus dem Seed
src/lib/events.ts    Tages-Ereignis (Themenliste, Countdown)
src/lib/shop.ts      Sterne-Pakete, Booster-Kosten
src/components/      Universumskarte, Planet, Formulare, Navigation
src/app/             Seiten: /, /heute, /ketten, /c/[id], /p/[username], /neu, /shop, /einladung/[token]
```

## Skalierung und Datensicherheit

Der aktuelle Stand läuft mit einer SQLite-Datei auf einem Server. Das ist für die Startphase (bis in die Tausende aktiver Nutzer) bewusst so gewählt: kein Betrieb einer separaten Datenbank, keine Kosten, einfacher Backup (eine Datei kopieren).

Für Massen an Nutzern sind drei Schritte vorgesehen, alle an einer Stelle (`src/lib/db.ts`):

1. **Postgres statt SQLite** (z. B. Supabase, Neon, RDS). Mehrere App-Server können dann gleichzeitig schreiben, die Datenbank macht automatische Backups und Replikation.
2. **Medien in Objektspeicher** (S3, Cloudflare R2). Bilder und Videos gehören nie auf die Festplatte des App-Servers. Aktuell werden nur Bild-Links gespeichert, kein Upload, genau aus diesem Grund.
3. **Mehrere App-Instanzen hinter einem Load Balancer.** Die App hält keinen Zustand im Prozess, Sitzungen stecken im Cookie. Das ist schon jetzt so gebaut.

Datenverlust entsteht in der Praxis nicht durch viele Nutzer, sondern durch fehlende Backups. Für SQLite: tägliche Kopie der Datei (z. B. mit Litestream in Echtzeit nach S3). Für Postgres: Point-in-Time-Recovery des Anbieters aktivieren.
