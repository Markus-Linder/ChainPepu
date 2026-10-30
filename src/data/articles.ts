export interface Article { slug: string; title: string; excerpt: string; date: string; sections: { h: string; p: string[] }[] }

export const ARTICLES: Article[] = [
  {
    slug: "handwerker-angebot-pruefen-checkliste",
    title: "Handwerker-Angebot prüfen: Die 12-Punkte-Checkliste",
    excerpt: "Woran Sie in fünf Minuten erkennen, ob ein Angebot vollständig, transparent und fair kalkuliert ist.",
    date: "2026-10-01",
    sections: [
      { h: "1. Vollständige Absenderangaben", p: ["Firma, Rechtsform, Anschrift, Handelsregister oder Handwerksrolle, Steuernummer. Fehlt das, fehlt im Streitfall der Vertragspartner."] },
      { h: "2. Einheitspreise statt Pauschalen", p: ["Pauschalen sind nur dann fair, wenn der Umfang exakt beschrieben ist. Verlangen Sie Mengen und Einheitspreise für alle Hauptpositionen. So erkennen Sie Nachträge sofort."] },
      { h: "3. Vorarbeiten und Entsorgung", p: ["Demontage, Schutzmaßnahmen, Entsorgung inklusive Deponiegebühren und Container. Diese Positionen fehlen am häufigsten und tauchen später als Nachtrag auf."] },
      { h: "4. Untergrund und Anschlussarbeiten", p: ["Ausgleich, Spachtelung, Grundierung, Beiputz, Malerarbeiten an Laibungen. Wer macht das, und steht es im Angebot?"] },
      { h: "5. Material mit Hersteller und Typ", p: ["\"Fliesen Standard\" ist kein Angebot. Verlangen Sie Hersteller, Serie, Format, Qualitätsstufe. Sonst entscheidet der Betrieb, was Standard ist."] },
      { h: "6. Normen und Nachweise", p: ["Abdichtung nach DIN 18534, Elektrik mit Messprotokoll, Heizung mit Heizlastberechnung und hydraulischem Abgleich. Fehlen die Begriffe, fehlt oft die Leistung."] },
      { h: "7. Gerüst und Baustelleneinrichtung", p: ["Bei Dach, Fassade und PV: Ist das Gerüst enthalten, mit welcher Standzeit? Verlängerungen kosten pro Woche."] },
      { h: "8. Ausführungszeitraum", p: ["Beginn, Dauer, Fertigstellung. Ohne Termin keine Verzugsfolgen."] },
      { h: "9. Zahlungsplan", p: ["Abschläge nach Baufortschritt sind üblich. Mehr als 30 % Anzahlung vor Baubeginn sind nicht üblich. Schlusszahlung erst nach Abnahme."] },
      { h: "10. Gewährleistung", p: ["Bei Bauleistungen gilt gesetzlich 5 Jahre (BGB) oder 4 Jahre (VOB/B). Steht VOB/B im Angebot, gelten andere Regeln. Fragen Sie nach."] },
      { h: "11. Nachtragsregel und Stundenlohn", p: ["Wie werden Zusatzleistungen abgerechnet? Stundensätze für Geselle und Meister sollten genannt sein."] },
      { h: "12. Bindefrist", p: ["Wie lange gilt das Angebot? Ohne Bindefrist kann der Preis bis zur Beauftragung steigen."] },
    ],
  },
  {
    slug: "pauschalangebot-oder-einheitspreise",
    title: "Pauschalangebot oder Einheitspreise: Was ist für Sie besser?",
    excerpt: "Pauschalen klingen sicher, verschieben aber oft das Risiko zum Kunden. Wann welcher Vertragstyp passt.",
    date: "2026-10-05",
    sections: [
      { h: "Was ein Pauschalpreis wirklich bedeutet", p: ["Ein Pauschalpreis deckt den beschriebenen Leistungsumfang ab, nicht mehr. Alles, was nicht beschrieben ist, ist ein Nachtrag. Je dünner die Beschreibung, desto teurer die Pauschale am Ende."] },
      { h: "Wann Einheitspreise besser sind", p: ["Bei Sanierungen im Bestand, wenn Mengen unsicher sind (Putz, Estrich, Leitungen). Sie zahlen, was tatsächlich verbaut wird, und sehen jede Abweichung."] },
      { h: "Wann eine Pauschale passt", p: ["Bei klar definierten Standardleistungen mit vollständigem Leistungsverzeichnis, zum Beispiel ein Fenstertausch mit bekannten Maßen oder eine PV-Anlage mit fester Komponentenliste."] },
      { h: "Der Mittelweg", p: ["Pauschale für die Kernleistung, Einheitspreise für Unwägbarkeiten (Mehrmengen, Zusatzarbeiten) mit vorab vereinbarten Preisen. So haben beide Seiten Sicherheit."] },
    ],
  },
  {
    slug: "nachtraege-vermeiden",
    title: "Nachträge vermeiden: Die 8 häufigsten Kostenfallen beim Handwerker",
    excerpt: "Warum aus 20.000 € am Ende 27.000 € werden und wie Sie das mit dem Angebot verhindern.",
    date: "2026-10-10",
    sections: [
      { h: "Entsorgung nach Aufwand", p: ["Container, Deponie, Sondermüll. Lassen Sie die Entsorgung als feste Position mit Menge ausweisen."] },
      { h: "Untergrund schlechter als gedacht", p: ["Unebener Estrich, feuchte Wände, maroder Putz. Vereinbaren Sie Einheitspreise für Ausgleich und Sanierung vorab."] },
      { h: "Stemmarbeiten und Schlitze", p: ["Bei Elektrik und Sanitär oft nicht enthalten. Fragen Sie: Wer schlitzt, wer verschließt, wer verputzt?"] },
      { h: "Gerüststandzeit", p: ["Enthalten sind oft 4 Wochen. Dauert es länger, kostet jede Woche extra."] },
      { h: "Materialwechsel", p: ["Wenn das Material im Angebot nicht genau benannt ist, kann der Wunsch nach einer bestimmten Fliese zum Aufpreis führen."] },
      { h: "Anfahrten", p: ["Mehrfache Anfahrten wegen Lieferverzug oder Koordination mit anderen Gewerken werden gern berechnet."] },
      { h: "Anmeldungen und Gebühren", p: ["Netzbetreiber, Schornsteinfeger, Bauamt. Klären Sie, wer das übernimmt und wer zahlt."] },
      { h: "Kleinmaterial und Verbrauchsstoffe", p: ["Schrauben, Dübel, Silikon, Kleber: als Prozentsatz oder Pauschale, aber ausgewiesen."] },
    ],
  },
  {
    slug: "angebote-vergleichbar-machen",
    title: "Drei Angebote, drei Welten: So machen Sie Handwerker-Angebote vergleichbar",
    excerpt: "Der billigste Preis ist selten der günstigste. Wie Sie Angebote auf denselben Leistungsumfang bringen.",
    date: "2026-10-14",
    sections: [
      { h: "Das Problem", p: ["Betrieb A kalkuliert mit Entsorgung, Betrieb B ohne, Betrieb C schreibt eine Pauschale. Die Preise unterscheiden sich um 40 %, die Leistung auch."] },
      { h: "Schritt 1: Gemeinsames Leistungsverzeichnis", p: ["Beschreiben Sie Ihr Vorhaben einmal vollständig und schicken Sie allen Betrieben dieselbe Liste. Profiangebot erstellt sie aus Ihrer Sprachbeschreibung."] },
      { h: "Schritt 2: Positionen zuordnen", p: ["Legen Sie die Angebote nebeneinander und ordnen Sie jede Position zu. Fehlende Positionen markieren und mit Richtwert ergänzen."] },
      { h: "Schritt 3: Normalisierter Gesamtpreis", p: ["Erst der Preis für den gleichen Umfang ist vergleichbar. Oft dreht sich die Reihenfolge."] },
      { h: "Schritt 4: Qualität und Bedingungen", p: ["Material, Garantien, Termine, Zahlungsplan, Referenzen. Ein 5 % teureres Angebot mit klaren Bedingungen ist meist das günstigere."] },
    ],
  },
  {
    slug: "handwerkerkosten-2026",
    title: "Handwerkerkosten 2026: Stundensätze und Richtwerte nach Gewerk",
    excerpt: "Was Gesellen- und Meisterstunden kosten, wie regionale Unterschiede wirken und welche Spannen normal sind.",
    date: "2026-10-18",
    sections: [
      { h: "Stundensätze 2026", p: ["Je nach Gewerk und Region liegen Verrechnungssätze zwischen 55 und 95 € pro Gesellenstunde netto, Meisterstunden bei 75 bis 120 €. Der Stundensatz enthält Lohn, Lohnnebenkosten, Fahrzeug, Werkzeug, Verwaltung und Gewinn."] },
      { h: "Regionale Unterschiede", p: ["München, Stuttgart, Frankfurt und Hamburg liegen 10 bis 25 % über dem Bundesschnitt, ländliche Regionen in Ostdeutschland teils 15 % darunter."] },
      { h: "Warum Spannen, keine Punktwerte", p: ["Zugänglichkeit der Baustelle, Bestandszustand, Materialwahl und Auftragsgröße verändern den Preis legitim. Deshalb arbeitet Profiangebot mit Spannen aus Richtwerten und echten Angeboten."] },
      { h: "Richtwerte je Gewerk", p: ["Die aktuellen Spannen für Bad, Dach, Fenster, Heizung, Elektrik, Maler, Fliesen, Boden, Garten und Photovoltaik finden Sie auf den jeweiligen Gewerke-Seiten."] },
    ],
  },
  {
    slug: "foerderung-sanierung-2026",
    title: "Förderung bei Sanierung 2026: Was im Angebot stehen muss, damit Sie Geld bekommen",
    excerpt: "BEG, KfW, BAFA: Viele Förderungen scheitern an fehlenden Angaben im Angebot. Diese Punkte müssen drinstehen.",
    date: "2026-10-22",
    sections: [
      { h: "Grundregel: Erst Antrag, dann Auftrag", p: ["Bei der Bundesförderung für effiziente Gebäude (BEG) muss der Antrag vor Vertragsabschluss gestellt sein. Ein Angebot mit aufschiebender Bedingung ist zulässig, eine Beauftragung vor Antrag nicht."] },
      { h: "Technische Mindestanforderungen im Angebot", p: ["Fenster: Uw-Wert. Dämmung: Dämmstärke und Lambda-Wert, erreichter U-Wert. Wärmepumpe: Jahresarbeitszahl, Heizlastberechnung, hydraulischer Abgleich. Fehlen die Werte, lassen Sie das Angebot ergänzen."] },
      { h: "Energieeffizienz-Experte", p: ["Für die meisten Gebäudehüllen-Maßnahmen ist ein gelisteter Experte Pflicht. Klären Sie, ob der Betrieb ihn stellt oder Sie ihn beauftragen."] },
      { h: "Förderfähige und nicht förderfähige Kosten trennen", p: ["Lassen Sie das Angebot so gliedern, dass förderfähige Positionen separat ausgewiesen sind. Das spart beim Verwendungsnachweis Zeit und Geld."] },
    ],
  },
];

export const ARTICLE_BY_SLUG = Object.fromEntries(ARTICLES.map((a) => [a.slug, a])) as Record<string, Article>;
