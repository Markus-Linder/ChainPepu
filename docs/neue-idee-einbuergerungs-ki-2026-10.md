# Analyse 3: Ein komplett neues Online-Produkt (Stand 30.10.2026)

Vorgabe: keine Kopie eines US-Modells, sondern etwas, das es noch nirgends gibt. Rein online, Kern durch KI gelöst, belegbare Nachfrage, klares Erlösmodell.

## Vorgehen

Ich habe zwölf eigene Konzeptideen entwickelt und jede per Recherche darauf geprüft, ob sie schon besetzt ist. Zehn davon existieren bereits oder haben zu wenig Nachfrage. Zwei sind echte Lücken. Eine davon empfehle ich.

### Geprüft und bereits besetzt (seit 2025 entstanden)

| Idee | Wer es schon macht |
|---|---|
| KI-Assistent für Betriebsräte | betriebsrat.ai (W.A.F.), BetriebsratsBot |
| KI-Prüfung von Immobilienkauf-Unterlagen (Teilungserklärung, WEG-Protokolle) | Kaufscan, immocheck.io, ImmoFitCheck |
| KI-Check von Handwerkerangeboten | cleverbauen24, QuoteCheck, HA Check, Baupreischeck |
| KI-Check von Tierarztrechnungen | AskmyPets |
| KI-Elterngeldantrag | ElterngeldAI, elterngeld.ai, einfach-elterngeld.de |
| KI-Todesfall-Bürokratie | Beistand im Todesfall, Memoresa, appproject |
| Monitoring von Ratsinformationssystemen für Bauträger | NeoSearch (250 Kommunen) |
| Haushalts-Fördermittel-Finder | co2online FördermittelCheck (nur Energie), Förderbase (nur B2B) |

### Echte Lücken, aber schwach

- **KI-Anruf-Agent für Verbraucher** (ruft Praxen und Behörden an, wartet in der Warteschleife): In den USA existieren Genspark, HoldForMe, AI Haggler, Google Agentic Calls. In DACH kein Anbieter. Aber: § 201 StGB verbietet Aufzeichnung ohne Einwilligung, der EU AI Act verlangt Offenlegung, Praxen werden sich wehren. Hohes Konfliktpotenzial.
- **KI-Rentenkonto-Check:** Kein Anbieter. Aber die Deutsche Rentenversicherung macht Kontenklärung kostenlos, Zahlungsbereitschaft fraglich.
- **KI-Werkstattrechnungs-Check:** Kein Anbieter. Aber der ADAC prüft für Mitglieder kostenlos.

---

## Empfehlung: KI-Einbürgerungsassistent (Arbeitstitel "Pass.ai")

### Die Lücke

Es gibt keinen einzigen KI-Assistenten für den deutschen Einbürgerungsantrag. Weder auf Deutsch noch auf Englisch, weder als App noch als Web-Dienst. Was existiert: Apps für den Einbürgerungstest (reine Quiz-Apps), ein nicht-KI-basierter Formular-Wizard (civitas), Anwälte mit Pauschalen von 2.000 Euro, und PDF-Checklisten der Städte, die sich von Stadt zu Stadt unterscheiden.

### Die Nachfrage (amtliche Zahlen)

| Kennzahl | Wert | Quelle |
|---|---|---|
| Einbürgerungsanträge 2025 | 467.400 | Statistisches Bundesamt |
| Einbürgerungen 2025 | 333.343 (Rekord, plus 14 %) | Statistisches Bundesamt |
| Erfolgsquote erledigter Verfahren | ca. 90 % | Statistisches Bundesamt |
| Unbearbeitete Anträge Münster | über 5.000 bei 1.331 Neuanträgen pro Jahr | Stadt Münster |
| Untätigkeitsklagen Berlin 2025 | 1.931 (2024: 64) | Senat Berlin |
| Bearbeitungszeit München | 18 Monate und länger | Stadt München |
| Bearbeitungszeit Hohenlohekreis | ca. 13 Monate | Landkreis |
| Gebühr pro erwachsenem Antragsteller | 255 € | Stadt Münster |

Auslöser: Die Reform des Staatsangehörigkeitsrechts 2024 senkte die Mindestaufenthaltsdauer von acht auf fünf Jahre. Die Antragszahlen haben sich in vielen Städten verdoppelt. Die Behörden nennen als Verzögerungsgründe ausdrücklich die Unvollständigkeit eingereichter Unterlagen und wiederholte Nachforderungen (dpa-Städteumfrage, Stadtrat Nürnberg Februar 2026, Stadt Speyer).

### Warum KI das Problem löst

1. **Die Anforderungen unterscheiden sich je Kommune.** Münster, Berlin, München und 400 weitere Einbürgerungsbehörden haben eigene Checklisten. Ein Mensch kann das nicht pflegen, eine KI mit Quellenanbindung schon.
2. **Die Zielgruppe spricht 50 Sprachen.** Türkisch, Arabisch, Ukrainisch, Russisch, Englisch, Polnisch, Rumänisch. Das ist die natürliche Stärke von Sprachmodellen.
3. **Unvollständige Anträge sind der Hauptgrund für Verzögerungen.** Ein vorgeprüfter, vollständiger Antrag spart dem Antragsteller Monate und der Behörde Arbeit. Das ist ein Verkaufsargument für beide Seiten.
4. **Das Verfahren ist regelbasiert.** Aufenthaltsdauer, Sprachniveau (B1, bei Turbo-Einbürgerung C1), Lebensunterhalt, Straffreiheit, Einbürgerungstest, Loyalitätserklärung. Perfekt für einen geführten Dialog.

### Produkt

1. **Quick-Check (kostenlos, Lead-Magnet):** Fünf Fragen, Antwort in der Sprache des Nutzers: Bin ich berechtigt, ab wann, über welchen Weg (regulär fünf Jahre, drei Jahre bei besonderer Integration, Ehegatten, Kinder).
2. **Dokumenten-Assistent (bezahlt):** Persönliche Checkliste exakt für die zuständige Behörde, Upload jedes Dokuments mit KI-Prüfung (Pass gültig, Sprachzertifikat anerkannt, Einkommensnachweise lückenlos, Mietvertrag, Rentenversicherungsverlauf), Hinweis auf fehlende oder abgelaufene Nachweise.
3. **Antragsgenerator:** Füllt das amtliche Formular (Bundesverwaltungsamt EB oder Landesformular) und die Erklärungen aus, erzeugt ein unterschriftsreifes Paket in der richtigen Reihenfolge, plus Anschreiben.
4. **Verfahrens-Tracker:** Fristen, Status, Vorlage für Sachstandsanfrage nach drei Monaten, Hinweis auf das Recht zur Untätigkeitsklage nach § 75 VwGO mit generiertem Klageentwurf (Klage ist ohne Anwalt möglich).
5. **Test-Vorbereitung:** Einbürgerungstest und B1-Vorbereitung als Zusatzmodul.

### Erlösmodell

- **Einzelantrag:** 79 bis 149 € einmalig (Referenz: Anwaltspauschale 2.000 €, behördliche Gebühr 255 €).
- **Familienpaket:** 199 €.
- **Untätigkeitsklage-Modul:** 49 €.
- **B2B:** Arbeitgeber zahlen für ausländische Fachkräfte als Benefit (Relocation-Abteilungen, Kliniken, IT-Firmen, Pflegeheime), Integrationskursträger und Migrationsberatungsstellen als Lizenz. 49 bis 299 € pro Monat.

Rechenbeispiel: 1 % der jährlichen Antragsteller (4.700 Personen) à 99 € ergibt 465.000 € Jahresumsatz allein aus B2C. Marketing-Kosten sind niedrig, weil die Zielgruppe in klar identifizierbaren Communities (Facebook-Gruppen, Reddit r/germany, Telegram-Gruppen nach Herkunftsland, Integrationskurse) sitzt und Suchbegriffe wie "Einbürgerung Unterlagen Berlin" hohes Volumen haben.

### Erweiterung mit derselben Engine

Niederlassungserlaubnis, Verlängerung des Aufenthaltstitels, Familiennachzug, Anerkennung ausländischer Berufsabschlüsse, Blaue Karte. Dieselbe Zielgruppe, dieselbe Dokumentenlogik, dieselben Behörden. Später Österreich und Schweiz.

### Rechtliche Leitplanken

- **Rechtsdienstleistungsgesetz:** Dokumentengenerator in eigener Sache nach BGH-Urteil Smartlaw (I ZR 113/20) zulässig. Keine Einzelfall-Rechtsberatung, keine Vertretung gegenüber der Behörde, kein Erfolgsversprechen. Für Härtefälle Weitervermittlung an Anwälte (Affiliate-Erlös).
- **DSGVO:** Pässe, Einkommensnachweise, Strafregister sind hochsensibel. EU-Hosting, Verschlüsselung, Löschung nach Abschluss, keine Trainingsnutzung.
- **Aktualität:** Checklisten jeder Behörde quellenbasiert pflegen und mit Datum anzeigen. Rechtsänderungen (etwa die Abschaffung der Turbo-Einbürgerung 2025) sofort nachziehen.
- **Keine Garantie:** Deutlich kommunizieren, dass die Behörde entscheidet.

### Risiken

- **Behörden digitalisieren selbst.** Berlin hat bereits einen Online-Antrag mit Quick-Check. Gegenmaßnahme: Das Produkt sitzt vor dem Behördenportal (Vorbereitung, Dokumente, Mehrsprachigkeit) und ist bundesweit, nicht nur für eine Stadt.
- **Politische Änderungen.** Das Staatsangehörigkeitsrecht ist politisch umkämpft. Die Antragszahlen bleiben aber auf Jahre hoch, weil der Rückstau abgearbeitet werden muss.
- **Vertrauen.** Die Zielgruppe ist vorsichtig gegenüber Betrug. Transparente Preise, Impressum, Bewertungen, Partnerschaften mit Beratungsstellen.

### MVP in 4 Wochen

1. **Woche 1:** Next.js-App, mehrsprachig (DE, EN, TR, AR, UK, RU), Quick-Check mit Regelwerk nach StAG, Wissensbasis aus den Checklisten der 30 größten Einbürgerungsbehörden (decken über die Hälfte der Anträge ab).
2. **Woche 2:** Dokumenten-Upload mit OCR und KI-Prüfung, persönliche Checkliste je Behörde, Stripe-Checkout.
3. **Woche 3:** Antragsgenerator für Formular EB und die drei größten Länderformulare, PDF-Paket, Sachstandsanfrage- und Untätigkeitsklage-Vorlagen.
4. **Woche 4:** SEO-Landingpages je Stadt und Sprache, Launch in fünf Communities, Gespräche mit zwei Arbeitgebern und einem Integrationskursträger für B2B.

Messgrößen: Quick-Check-Starts, Conversion zu Kauf, Anteil vollständig eingereichter Anträge nach Nutzer-Rückmeldung, B2B-Pipeline.

---

## Quellen

- Statistisches Bundesamt über Einbürgerungen und Anträge 2025: https://ms-aktuell.de/welt/einbuergerungen-deutschland-2025-rekordhoch/ , https://www.statistik-berlin-brandenburg.de/presse/2026/67-einbuergerungen-2025
- Rückstau Münster: https://ms-aktuell.de/muenster/einbuergerungsstau-in-muenster-waechst-ueber/
- Untätigkeitsklagen Berlin: https://pardok.parlament-berlin.de/starweb/adis/citat/VT/19/SchrAnfr/S19-26331.pdf
- München Bearbeitungszeit: https://stadt.muenchen.de/news/einbuergerung-bearbeitungszeit.html
- Hessen überlastet: https://www.hessenschau.de/gesellschaft/einbuergerung-in-hessen-behoerden-sind-mit-antragsflut-ueberfordert-v1,einbuergerungen-106.html
- Unvollständige Unterlagen als Verzögerungsgrund: https://www.t-online.de/nachrichten/deutschland/innenpolitik/id_100431960/deutschland-ueber-200000-antraege-auf-einbuergerungen-stehen-offen-.html , https://spd-stadtratsfraktion.nuernberg.de/wp-content/uploads/aahmlib_20260210_Transparenz_Auslaenderwese_Einbuergerung.pdf
- Checkliste Münster 2026 (Gebühr 255 €): https://www.stadt-muenster.de/fileadmin/user_upload/stadt-muenster/33_buergerservice/pdf/Checkliste_-_Einzureichende_Unterlagen_und_Hinweise_2026-04.pdf
- Berlin Online-Antrag: https://service.berlin.de/dienstleistung/318998/
- Einziger Formular-Wizard (nicht KI): https://einbuergerungsservice.de/ratgeber/einbuergerungsantrag-formular-ausfuellen
- Anwaltskosten und Untätigkeitsklage: https://www.anwalt.org/untaetigkeitsklage-einbuergerung/ , https://passexperten.de/ratgeber/untaetigkeitsklage-einbuergerung/
- BGH Smartlaw: https://www.lto.de/recht/juristen/b/bgh-urteil-izr11320-vertragsgenerator-smartlaw-keine-unzulaessige-rechtsdienstleistung-rak-hamburg-rdg-legal-tech
- Besetzte Ideen: https://betriebsrat.ai/ , https://kaufscan.com/en/ , https://cleverbauen24.de/quickcheck , https://www.elterngeld-ki.de/ , https://neosearch.neobim.ai/
- US-Anruf-Agenten: https://aihaggler.com/ , https://www.genspark.ai/tools/ai-phone-call
