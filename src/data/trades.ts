export interface Trade {
  slug: string;
  name: string;
  short: string;
  description: string;
  typicalProject: string;
  priceHint: string;
  checks: string[];
  faq: { q: string; a: string }[];
}

export const TRADES: Trade[] = [
  {
    slug: "badsanierung",
    name: "Badsanierung",
    short: "Bad",
    description: "Komplettsanierung, Teilsanierung, barrierefreier Umbau, Dusche statt Wanne.",
    typicalProject: "Komplettsanierung eines Bades mit 6 bis 8 m²",
    priceHint: "Komplettsanierung 6 bis 8 m²: 15.000 bis 35.000 €, je nach Ausstattung und Leitungsarbeiten.",
    checks: ["Sind Demontage und Entsorgung enthalten?", "Ist die Abdichtung nach DIN 18534 als eigene Position aufgeführt?", "Sind Fliesenformat, Verlegeart und Fugenbreite benannt?", "Wer koordiniert Sanitär, Elektrik und Fliesen?", "Sind Sanitärobjekte mit Hersteller und Modell angegeben oder nur als Pauschale?"],
    faq: [
      { q: "Was kostet eine Badsanierung 2026?", a: "Für ein Bad mit 6 bis 8 m² liegen Komplettsanierungen meist zwischen 15.000 und 35.000 €. Entscheidend sind Leitungsarbeiten, Fliesenqualität und Sanitärobjekte. Unter 12.000 € sollten Sie prüfen, ob Abdichtung, Elektrik und Entsorgung wirklich enthalten sind." },
      { q: "Welche Positionen fehlen in Bad-Angeboten am häufigsten?", a: "Abdichtung, Entsorgung, Elektrik (FI-Schutz, neue Leitungen), Malerarbeiten an Decke und Wänden außerhalb der Fliesenflächen sowie Silikonfugen als Wartungsfugen." },
    ],
  },
  {
    slug: "dach",
    name: "Dachsanierung",
    short: "Dach",
    description: "Neueindeckung, Dämmung, Dachfenster, Flachdachabdichtung, Rinnen und Spenglerarbeiten.",
    typicalProject: "Neueindeckung Satteldach 120 m² mit Aufsparrendämmung",
    priceHint: "Neueindeckung mit Dämmung: 180 bis 350 € pro m² Dachfläche.",
    checks: ["Ist das Gerüst enthalten und mit Standzeit angegeben?", "Welche Dämmstärke und welcher U-Wert werden erreicht (GEG)?", "Sind Unterspannbahn, Lattung und Konterlattung einzeln aufgeführt?", "Sind Entsorgungskosten für Altziegel und ggf. Asbest enthalten?", "Sind Spenglerarbeiten (Rinnen, Kehlen, Anschlüsse) mit Material benannt?"],
    faq: [
      { q: "Was kostet eine Dachsanierung pro m²?", a: "Mit Dämmung und Neueindeckung sind 180 bis 350 € pro m² üblich, ohne Dämmung 90 bis 160 € pro m². Gerüst, Entsorgung und Spenglerarbeiten kommen häufig als eigene Positionen hinzu." },
      { q: "Gibt es Förderung für die Dachdämmung?", a: "Ja, über die Bundesförderung für effiziente Gebäude (BEG) als Einzelmaßnahme, wenn die Dämmwerte eingehalten werden und ein Energieeffizienz-Experte eingebunden ist." },
    ],
  },
  {
    slug: "fenster",
    name: "Fenster und Türen",
    short: "Fenster",
    description: "Fenstertausch, Haustüren, Rollläden, Sonnenschutz, Einbruchschutz.",
    typicalProject: "Austausch von 10 Kunststofffenstern mit Dreifachverglasung",
    priceHint: "Kunststofffenster mit Dreifachverglasung inkl. Montage: 700 bis 1.400 € pro Fenster.",
    checks: ["Sind Uw-Wert und Verglasung (Ug) angegeben?", "Ist die Montage nach RAL-Montagerichtlinie beschrieben?", "Sind Fensterbänke innen und außen enthalten?", "Ist die Entsorgung der Altfenster enthalten?", "Sind Beiputzarbeiten und Malerarbeiten an den Laibungen enthalten?"],
    faq: [
      { q: "Was kostet ein neues Fenster mit Einbau?", a: "Kunststofffenster in Standardgröße mit Dreifachverglasung kosten inklusive Montage 700 bis 1.400 €, Holz-Alu-Fenster 1.200 bis 2.500 €. Große Elemente und Sonderformen liegen darüber." },
      { q: "Warum ist der Uw-Wert wichtig?", a: "Er entscheidet über Förderfähigkeit (BEG verlangt Uw ≤ 0,95 W/m²K) und über die Heizkostenersparnis. Fehlt er im Angebot, lassen Sie ihn nachtragen." },
    ],
  },
  {
    slug: "heizung",
    name: "Heizung und Sanitär",
    short: "Heizung",
    description: "Wärmepumpe, Gas-Brennwert, Fußbodenheizung, hydraulischer Abgleich, Sanitärinstallation.",
    typicalProject: "Einbau einer Luft-Wasser-Wärmepumpe im Einfamilienhaus",
    priceHint: "Luft-Wasser-Wärmepumpe inkl. Einbau: 25.000 bis 45.000 € vor Förderung.",
    checks: ["Ist eine Heizlastberechnung nach DIN EN 12831 enthalten?", "Ist der hydraulische Abgleich (Verfahren B) aufgeführt?", "Welche Heizleistung und welche JAZ werden zugesagt?", "Sind Pufferspeicher, Warmwasserbereitung und Elektroanschluss enthalten?", "Ist die Fördermittel-Beantragung (BEG) als Leistung enthalten?"],
    faq: [
      { q: "Was kostet eine Wärmepumpe 2026?", a: "Im Einfamilienhaus kosten Luft-Wasser-Wärmepumpen inklusive Einbau 25.000 bis 45.000 €. Die BEG-Förderung deckt 30 bis 70 % ab. Angebote ohne Heizlastberechnung sind unvollständig." },
      { q: "Was ist der hydraulische Abgleich?", a: "Die Einstellung aller Heizkörper oder Heizkreise auf den berechneten Bedarf. Er ist Fördervoraussetzung und muss im Angebot als Position stehen." },
    ],
  },
  {
    slug: "elektrik",
    name: "Elektroinstallation",
    short: "Elektrik",
    description: "Neuinstallation, Zählerschrank, Wallbox, Smart Home, E-Check.",
    typicalProject: "Komplette Elektroinstallation im Einfamilienhaus (Sanierung)",
    priceHint: "Komplettinstallation Einfamilienhaus: 12.000 bis 25.000 €, Wallbox inkl. Montage 1.500 bis 3.000 €.",
    checks: ["Ist der Zählerschrank nach aktueller TAB des Netzbetreibers enthalten?", "Sind Anzahl der Stromkreise, Steckdosen und Schalter aufgeführt?", "Sind Schlitz- und Stemmarbeiten sowie Verschließen enthalten?", "Ist die Anmeldung beim Netzbetreiber enthalten?", "Ist eine Abnahme mit Messprotokoll (VDE 0100-600) vorgesehen?"],
    faq: [
      { q: "Was kostet eine neue Elektroinstallation?", a: "Für ein Einfamilienhaus mit 140 m² sind 12.000 bis 25.000 € üblich, je nach Ausstattung. Smart-Home-Komponenten und Netzwerkverkabelung erhöhen den Preis deutlich." },
      { q: "Was kostet eine Wallbox mit Installation?", a: "1.500 bis 3.000 € inklusive 11-kW-Wallbox, Leitung, FI/LS und Anmeldung. Längere Leitungswege und Zählerschrank-Umbauten kosten extra." },
    ],
  },
  {
    slug: "maler",
    name: "Malerarbeiten",
    short: "Maler",
    description: "Innenanstrich, Fassade, Tapezieren, Spachteln, Lackieren, Schimmelsanierung.",
    typicalProject: "Innenanstrich einer 100-m²-Wohnung inklusive Decken",
    priceHint: "Innenanstrich: 8 bis 15 € pro m² Wandfläche, Fassade: 25 bis 60 € pro m² inkl. Gerüst.",
    checks: ["Wird nach Wandfläche oder Grundfläche abgerechnet?", "Sind Vorarbeiten (Spachteln, Grundieren, Abkleben) enthalten?", "Welche Farbe mit welcher Nassabriebklasse wird verwendet?", "Ist das Abdecken und Räumen enthalten?", "Beim Fassadenanstrich: Ist das Gerüst enthalten?"],
    faq: [
      { q: "Was kosten Malerarbeiten pro m²?", a: "Innenanstrich 8 bis 15 € pro m² Wandfläche (nicht Wohnfläche), Tapezieren mit Raufaser 12 bis 20 € pro m², Fassadenanstrich 25 bis 60 € pro m² inklusive Gerüst." },
      { q: "Warum sind Angebote so unterschiedlich?", a: "Oft wird einmal nach Wandfläche und einmal nach Grundfläche gerechnet. Ein Zimmer mit 20 m² Grundfläche hat rund 50 m² Wandfläche. Lassen Sie sich die Berechnungsgrundlage nennen." },
    ],
  },
  {
    slug: "fliesen",
    name: "Fliesenarbeiten",
    short: "Fliesen",
    description: "Fliesen in Bad, Küche, Flur, Terrasse, Großformate, Naturstein.",
    typicalProject: "Fliesen im Bad, Boden und Wände, 30 m²",
    priceHint: "Fliesenverlegung: 45 bis 90 € pro m² Arbeitslohn, Großformate und Diagonalverlegung teurer.",
    checks: ["Ist der Fliesenpreis vom Verlegepreis getrennt?", "Ist die Untergrundvorbereitung (Ausgleich, Grundierung) enthalten?", "Ist die Abdichtung im Nassbereich enthalten?", "Sind Fugen, Silikonfugen und Sockelleisten enthalten?", "Welches Fliesenformat liegt der Kalkulation zugrunde?"],
    faq: [
      { q: "Was kostet Fliesenlegen pro m²?", a: "Der Arbeitslohn liegt bei 45 bis 90 € pro m² für Standardformate. Großformate ab 60 × 120 cm, Mosaik und Naturstein kosten 90 bis 150 € pro m². Material kommt hinzu." },
      { q: "Was ist bei Großformaten zu beachten?", a: "Der Untergrund muss sehr eben sein. Fehlt im Angebot die Position Ausgleich oder Spachtelung, droht ein Nachtrag." },
    ],
  },
  {
    slug: "boden",
    name: "Bodenbeläge und Parkett",
    short: "Boden",
    description: "Parkett, Vinyl, Laminat, Teppich, Estrich-Vorbereitung, Fußleisten.",
    typicalProject: "Parkett in 80 m² Wohnfläche inklusive Sockelleisten",
    priceHint: "Parkett verlegt: 60 bis 140 € pro m² inkl. Material, Vinyl: 35 bis 70 € pro m².",
    checks: ["Ist die Untergrundvorbereitung (Schleifen, Spachteln, Grundieren) enthalten?", "Sind Sockelleisten und Übergangsprofile enthalten?", "Ist der Rückbau des alten Belags enthalten?", "Verklebt oder schwimmend verlegt?", "Welche Nutzungsklasse hat der Belag?"],
    faq: [
      { q: "Was kostet Parkett verlegen?", a: "Inklusive Material 60 bis 140 € pro m², je nach Holzart und Verlegeart. Vinyl kostet verlegt 35 bis 70 € pro m², Laminat 25 bis 50 € pro m²." },
      { q: "Warum ist die Untergrundvorbereitung so wichtig?", a: "Unebenheiten über 3 mm auf 2 m erfordern Spachtelung. Fehlt die Position, kommt sie als Nachtrag. Lassen Sie den Estrich vor Angebotsabgabe prüfen." },
    ],
  },
  {
    slug: "garten",
    name: "Garten- und Landschaftsbau",
    short: "Garten",
    description: "Terrasse, Pflasterarbeiten, Zaun, Rasen, Bepflanzung, Entwässerung.",
    typicalProject: "Terrasse 30 m² mit Betonplatten inklusive Unterbau",
    priceHint: "Pflasterarbeiten inkl. Unterbau: 80 bis 160 € pro m², Terrassenplatten 100 bis 200 € pro m².",
    checks: ["Ist der Unterbau (Aushub, Schotter, Splitt) mit Stärken angegeben?", "Ist die Entsorgung des Aushubs enthalten?", "Sind Randeinfassungen und Entwässerung enthalten?", "Welche Plattenstärke und welcher Hersteller?", "Ist die Maschinenstellung (Minibagger, Rüttelplatte) enthalten?"],
    faq: [
      { q: "Was kostet eine Terrasse pflastern?", a: "Inklusive Unterbau und Standardplatten 100 bis 200 € pro m². Feinsteinzeug und Naturstein liegen darüber. Aushubentsorgung kostet 30 bis 60 € pro m³." },
      { q: "Welche Unterbaustärke ist richtig?", a: "Für Terrassen mindestens 20 bis 30 cm Schotter plus 3 bis 5 cm Splitt. Weniger spart kurzfristig, führt aber zu Absenkungen." },
    ],
  },
  {
    slug: "photovoltaik",
    name: "Photovoltaik",
    short: "PV",
    description: "PV-Anlage, Speicher, Wallbox-Kopplung, Balkonkraftwerk, Anmeldung.",
    typicalProject: "PV-Anlage 10 kWp mit 10 kWh Speicher auf dem Einfamilienhaus",
    priceHint: "PV-Anlage ohne Speicher: 1.300 bis 1.900 € pro kWp, Speicher: 600 bis 1.000 € pro kWh.",
    checks: ["Sind Module, Wechselrichter und Speicher mit Hersteller, Typ und Garantie angegeben?", "Ist das Gerüst enthalten?", "Ist die Netzanmeldung und Inbetriebnahme enthalten?", "Ist der Zählerschrank-Umbau enthalten, falls nötig?", "Ist der Ertrag (kWh pro Jahr) plausibel berechnet?"],
    faq: [
      { q: "Was kostet eine PV-Anlage 2026?", a: "10 kWp ohne Speicher 13.000 bis 19.000 €, mit 10 kWh Speicher 19.000 bis 29.000 €. Auf PV-Anlagen für Wohngebäude entfällt seit 2023 die Mehrwertsteuer." },
      { q: "Worauf sollte ich bei Angeboten achten?", a: "Auf vollständige Komponentenlisten mit Garantiezeiten, auf enthaltenes Gerüst und Netzanmeldung sowie auf eine realistische Ertragsprognose von 900 bis 1.100 kWh pro kWp." },
    ],
  },
];

export const TRADE_BY_SLUG = Object.fromEntries(TRADES.map((t) => [t.slug, t])) as Record<string, Trade>;
export const TRADE_SLUGS = TRADES.map((t) => t.slug);
