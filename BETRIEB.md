# Betrieb: Was läuft automatisch, was musst du selbst machen?

Kurze, ehrliche Antwort für den Start – ohne Fachchinesisch.

## Läuft vollautomatisch (ohne dich)

Wenn ein Kunde angemeldet ist, passiert das alles von allein:

- **Registrierung & Login** – übernimmt Supabase.
- **Scan starten, durchführen, bewerten** – die Edge Function macht das selbst. Du musst
  keinen Test manuell anstoßen, nichts freigeben, nichts auswerten.
- **Ergebnisse, Score, Report** – werden automatisch gespeichert und angezeigt.
- **Trennung der Kundendaten** – jeder Kunde sieht nur seine eigenen Scans (Row Level Security).

Das heißt: Das **Produkt selbst** ist automatisch. Ein Kunde kann sich registrieren und
scannen, ohne dass du etwas tust.

## Musst du einmalig einrichten (vor dem ersten Kunden)

Das machst du genau einmal, nicht pro Kunde:

1. **Supabase verbinden** (Klick in Lovable).
2. **Datenbank-SQL einmal ausführen** (`0001_init.sql`).
3. **Edge Function deployen** und **`ANTHROPIC_API_KEY` setzen**.

Anleitung dafür steht in `README.md`.

## Musst du selbst organisieren (laufend, aber wenig)

Das baut redteamly **noch nicht** automatisch – das sind die typischen Lücken zwischen
„App funktioniert" und „echtes Geschäft":

- **Bezahlung.** Aktuell kann sich jeder kostenlos registrieren. Damit Kunden zahlen, musst
  du eine Zahlungsanbindung (z. B. **Stripe**) ergänzen. Sag mir Bescheid, dann baue ich das ein.
- **API-Kosten.** Jeder Scan kostet dich ein paar Cent Anthropic-Guthaben (Judge + Demo).
  Solange du nichts abrechnest, zahlst **du** das. Mit Stripe + einem Limit pro Plan ist das gedeckt.
- **Support.** Wenn ein Kunde eine Frage per E-Mail stellt, antwortet kein Roboter – das bist du.
  Am Anfang sind das sehr wenige Mails.
- **Rechtliches.** Impressum, Datenschutzerklärung (DSGVO) und AGB brauchst du, sobald du
  öffentlich verkaufst. Dafür gibt es Generatoren; ich kann dir Platzhalter-Seiten anlegen.
- **Missbrauch verhindern.** Bereits eingebaut: Pflicht-Checkbox beim Anlegen eines Ziels,
  Durchsetzung auf Datenbankebene (ohne Bestätigung wird kein Ziel gespeichert und kein Scan
  gestartet), Nutzungsbedingungen-Entwurf unter `/nutzungsbedingungen` mit Freistellungsklausel.
  Den Entwurf vor dem Verkauf anwaltlich prüfen lassen.
- **Wording.** redteamly stellt **Prüfberichte** aus, keine Zertifikate. Das Wort
  „zertifiziert" nirgends verwenden; wir sind keine akkreditierte oder notifizierte Stelle.
  Der Haftungshinweis steht unter jedem Bericht und in den Nutzungsbedingungen.

## Fazit in einem Satz

Das **Scannen** ist vollautomatisch; du musst nur **einmal einrichten** und dich später um
**Bezahlung, Recht und ein bisschen Support** kümmern – und bei all dem helfe ich dir
Schritt für Schritt.

## Empfohlene nächste Schritte

1. App in Lovable zum Laufen bringen (README).
2. Selbst einen Demo-Scan machen, damit du siehst, was Kunden sehen.
3. Mir sagen: **Stripe einbauen** und **Autorisierungs-Checkbox** – dann ist es verkaufsfertig.
