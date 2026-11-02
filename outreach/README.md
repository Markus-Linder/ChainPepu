# Outreach: persönliche Erstkontakt-Mails auf Basis des Audits

Das Modul `agent-readiness outreach` erzeugt aus einem Audit eine persönliche E-Mail mit den drei wichtigsten Befunden der Website des Empfängers und versendet sie auf Wunsch per SMTP. Entwürfe werden immer zuerst auf die Platte geschrieben, Versand ist ein eigener Schritt.

## Warum "authentisch"

Generische Massenmails landen im Spam und beschädigen die Domain. Diese Mails zitieren konkrete, nachprüfbare Punkte von der Website des Empfängers, nennen einen Score, bieten den vollständigen Bericht kostenlos an und schlagen einen Termin vor. Klartext, kein HTML, kein Tracking-Pixel, ein Empfänger pro Mail, mindestens 30 Sekunden Abstand.

## Rechtlicher Rahmen (bitte lesen, bevor die erste Mail rausgeht)

**Deutschland, Österreich, Schweiz und die meisten EU-Länder:** Werbliche E-Mails ohne vorherige ausdrückliche Einwilligung sind unzulässig, auch an Firmen (§ 7 Abs. 2 Nr. 2 UWG, Art. 13 ePrivacy-Richtlinie, § 174 TKG in Österreich). Abmahnungen kosten typischerweise 1.000 bis 3.000 Euro pro Fall. Ausnahmen:

- Bestehende Kundenbeziehung für ähnliche Leistungen mit Hinweis auf Widerspruch (§ 7 Abs. 3 UWG).
- Der Empfänger hat selbst Kontakt aufgenommen, zum Beispiel über den kostenlosen Quick Check mit Einwilligungs-Checkbox. **Das ist der saubere Hauptkanal:** Der Quick Check auf llmreadiness.com liefert Adresse, Einwilligung und ein konkretes Ergebnis in einem Schritt.
- Ein sachlicher Einzelkontakt über ein Kontaktformular der Firma ist rechtlich ebenfalls Werbung. Keine Grauzone.

**Erlaubte Erstkontakt-Kanäle in DACH ohne Einwilligung:** Brief per Post (mit dem ausgedruckten Audit sehr wirksam), Telefon an Unternehmen bei mutmaßlichem Interesse (§ 7 Abs. 2 Nr. 1 UWG, im B2B zulässig, wenn ein sachliches Interesse vermutet werden darf), LinkedIn-Nachricht (Plattformregeln, keine UWG-Ausnahme, aber in der Praxis der Standardweg), persönliche Übergabe auf Messen.

**USA (CAN-SPAM):** B2B-Kaltmail erlaubt, wenn Absender korrekt, Betreff nicht irreführend, Postadresse enthalten, Abmeldemöglichkeit vorhanden und binnen 10 Tagen umgesetzt. **Großbritannien (PECR):** an Firmenadressen (nicht an Einzelunternehmer) mit Opt-out zulässig. **Kanada (CASL):** Einwilligung nötig, enge Ausnahmen.

Deshalb verlangt der Befehl `--legal-basis`. Der Grund wird in der Mail genannt und im Log gespeichert. Für DACH sind nur `consent`, `inquiry` und `existing-customer` vertretbar. `b2b-allowed-jurisdiction` ist für USA und UK gedacht.

Jede Mail enthält Abmeldelink, Abmeldung per Antwort, Absenderadresse und Impressum. Abgemeldete Adressen kommen in `outreach/suppression.txt` (eine Adresse oder `@domain` pro Zeile) und werden nie wieder angeschrieben.

## Versand einrichten

### 1. Eigene Domain und Postfach

Nicht über eine private Gmail-Adresse versenden. Postfach `markus@llmreadiness.com` (oder eine Subdomain wie `mail.llmreadiness.com`, damit die Hauptdomain geschützt bleibt) bei Google Workspace, Microsoft 365, IONOS, all-inkl oder Fastmail anlegen.

### 2. DNS-Einträge, sonst landet alles im Spam

| Typ | Name | Wert (Beispiel Google Workspace) |
|---|---|---|
| TXT | llmreadiness.com | `v=spf1 include:_spf.google.com ~all` |
| TXT | google._domainkey | DKIM-Schlüssel aus der Workspace-Admin-Konsole |
| TXT | _dmarc | `v=DMARC1; p=quarantine; rua=mailto:dmarc@llmreadiness.com; adkim=s; aspf=s` |
| MX | llmreadiness.com | laut Anbieter |

Prüfen mit mail-tester.com (Ziel: 10/10) und `dig TXT _dmarc.llmreadiness.com`. Danach 2 bis 3 Wochen "Aufwärmen": täglich wenige Mails an echte Kontakte, die antworten.

### 3. Zugangsdaten als Umgebungsvariablen

```bash
export SMTP_HOST=smtp.gmail.com        # Google Workspace; IONOS: smtp.ionos.de; M365: smtp.office365.com
export SMTP_PORT=587
export SMTP_USER=markus@llmreadiness.com
export SMTP_PASSWORD='app-passwort'    # bei Google: App-Passwort mit 2FA, nie das Kontopasswort
export SMTP_FROM_NAME="Markus Linder"
export SMTP_FROM_EMAIL=markus@llmreadiness.com
export SMTP_REPLY_TO=markus@llmreadiness.com

export OUTREACH_SENDER_NAME="Markus Linder"
export OUTREACH_SENDER_TITLE="Founder, LLM Readiness"
export OUTREACH_SENDER_COMPANY="LLM Readiness"
export OUTREACH_SENDER_SITE="https://llmreadiness.com"
export OUTREACH_SENDER_PHONE="+49 ..."
export OUTREACH_SENDER_ADDRESS="Straße 1, 12345 Stadt"
export OUTREACH_UNSUBSCRIBE_BASE="https://llmreadiness.com/unsubscribe"
export OUTREACH_UNSUBSCRIBE_SECRET="langer-zufallswert"
```

Vorlage: `outreach/.env.example`.

## Ablauf

Entwurf erzeugen (führt das Audit aus, schreibt `outreach/drafts/<domain>.<lang>.txt`):

```bash
agent-readiness outreach https://example.com --to ceo@example.com --name "Ms. Smith" --lang en --legal-basis b2b-allowed-jurisdiction
```

Entwurf lesen, bei Bedarf von Hand anpassen, dann senden:

```bash
agent-readiness outreach https://example.com --to ceo@example.com --name "Ms. Smith" --lang en --legal-basis b2b-allowed-jurisdiction --send
```

Jeder Vorgang landet in `outreach/log.csv` mit Zeitstempel, Empfänger, Rechtsgrundlage, Status und Message-ID.

## Abmeldeseite

Der Link `https://llmreadiness.com/unsubscribe?e=<mail>&t=<token>` muss in Lovable eine Seite haben, die die Adresse in eine Supabase-Tabelle `unsubscribes` schreibt. Der Token ist `sha256(SECRET + ":" + mail)[:16]`; die Seite kann ihn prüfen oder einfach jede Abmeldung akzeptieren. Die Tabelle regelmäßig in `suppression.txt` exportieren.

## Empfohlener Rhythmus

- Höchstens 20 Erstkontakte pro Tag und Postfach, auch nach dem Aufwärmen.
- Jede Mail vor dem Senden lesen. Der geratene Markenname ist nicht immer richtig, dann `--brand` setzen.
- Nach 5 Werktagen eine kurze Antwort im selben Thread, keine dritte Mail.
- Antwortquote unter 5 Prozent: Betreff und Zielgruppe ändern, nicht die Menge erhöhen.
