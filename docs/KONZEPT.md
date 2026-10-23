# kistack.io – Produktkonzept für den US-Traffic

Stand: 23.10.2026

## 1. Befund: Warum kommen täglich 25–50 US-Besucher?

Die Besucher suchen mit hoher Wahrscheinlichkeit **nicht** nach KI-Abo-Management, sondern nach
**"KiStack" = KiCad-Skills für AI-Coding-Agents**:

| Projekt | Was es ist | Stand 23.10.2026 |
|---|---|---|
| `American-Embedded/KiStack` (GitHub) | "HUMAN WRITTEN bunch of skills for KiCad" – Skills für Schematic, PCB-Review, BOM, Exports, Gerber-Review; Install via `npx skills add American-Embedded/kistack` | 409 Stars, 27 Forks; +353 Stars seit 1.9., Peak am 3./4.9. (+88/+93 Stars pro Tag) |
| `Milind220/Ki-Stack` (GitHub) | "Deep KiCad skills for coding agents" (Claude Code, Codex, OpenCode), MIT | 23 Stars |
| kistacklab.com | Koreanischer ETF-Backtesting-Simulator | unrelated, aber Namensnachbar |

KiCad ist die weltweit meistgenutzte Open-Source-Elektronik-Design-Software, die Community sitzt stark in den USA.
Wer "kistack" googelt, landet auf kistack.io – und findet dort eine deutsche KI-Abo-Seite. Ergebnis: nahezu 100 % Absprung.

**Keines der beiden GitHub-Projekte hat eine eigene Website oder Domain.** Das ist die Lücke.

### So verifizierst du das in 5 Minuten (Google Search Console)
1. Leistung → Suchanfragen: Stehen dort "kistack", "ki stack", "kistack kicad", "kistack skills"?
2. Zeitraum: Beginnt der Traffic um den **3.–5. September 2026**? Das war der Star-Spike auf GitHub.
3. Seiten: Landen alle auf `/` (und nicht auf Blog-Artikeln)?
Wenn 1–3 zutreffen, ist die Hypothese bestätigt.

## 2. Zielgruppe

- Hardware-/Embedded-Ingenieure, Maker, Startup-Gründer mit Hardware-Produkt, Elektrotechnik-Studenten
- Nutzen bereits Claude Code, Codex CLI oder OpenCode und wollen damit **KiCad** bedienen
- Englischsprachig, US-lastig, technisch, skeptisch gegenüber Marketing-Claims
- Zahlungsbereit für Zeitersparnis (ein Board-Respin kostet schnell 1.000–10.000 USD)

### Dokumentierte Schmerzpunkte (EEVblog-Thread "Claude Code for PCB design", u. a.)
- Agents haben kein räumliches Gefühl für Layout-Qualität
- KiCad-S-Expression-Dateien sind fehleranfällig zu editieren
- Design-Intent (warum liegt Bauteil X dort) fehlt dem Agent komplett
- Es fehlt ein Verifikations-Loop (DRC/ERC/SPICE automatisch)
- Wunsch: **Design-Constraint-Dateien** (Regeln als Markdown), die man dem Agent gibt
- Wunsch: Assistenten, die **nachfragen** statt still zu raten
- Was heute schon gut funktioniert: BOM-Optimierung (JLCPCB Basic vs. Extended), Stock-Checks, Netlist-Review, Berechnungen (Impedanz), Footprint-Generierung, DRC-Loops

## 3. Produktoptionen

### Option A – "KiStack Hub" (Content + Lead-Magnet) · Aufwand: 1–2 Tage
Englische Seite auf kistack.io: *The AI agent stack for KiCad.*
- Vergleich aller KiCad-Agent-Skill-Packs (KiStack, Ki-Stack, kicad-happy, Copperhead, KiCad-MCP-Server) mit Install-Befehlen
- Ehrliche Sektion "Was funktioniert heute, was nicht"
- Lead-Magnet: **KiCad Agent Starter Kit** (kostenlos gegen E-Mail): CLAUDE.md-Template für Hardware-Projekte, Constraint-Datei-Template, Review-Checkliste, JLCPCB-BOM-Workflow
- Monetarisierung: Newsletter-Sponsoring, Affiliate (JLCPCB/PCBWay/Digikey-Programme), später Upsell
- Risiko: niedrig. Nutzen: Traffic wird sofort zu E-Mail-Liste statt Absprung.

### Option B – "KiStack Review" (SaaS, Hosted PCB-Review) · Aufwand: 4–8 Wochen
Upload `.kicad_pcb`/`.kicad_sch` → Server führt `kicad-cli` DRC/ERC, Layer-Renders, BOM-Check (JLCPCB-Parts-API) aus → LLM erzeugt strukturierten Review-Report mit Priorisierung und Rückfragen.
- Pricing-Idee: Free (3 Reviews/Monat), Pro 19 USD/Monat, Team 79 USD/Monat
- Differenzierung zu lokalen Skills: kein Setup, reproduzierbar, Report teilbar, Historie pro Board
- Risiko: mittel (LLM-Kosten, Qualität, Vertrauen in Upload von Designs). Bitte erst nach Option A validieren.

### Option C – "Constraint Files as a Service" (Nische, hohe Passung) · Aufwand: 2–4 Wochen
Genau der Wunsch aus der Community: ein Editor/Generator für maschinenlesbare Design-Regeln (Signalgruppen, Impedanzen, Keep-outs, Platzierungsregeln, Fab-Profile JLCPCB/PCBWay/OSH Park), exportiert als Markdown/JSON, die jeder Agent-Skill einlesen kann. Plus kuratierte Fab-Profile als Paid-Content.
- Monetarisierung: Einmalkauf 29–49 USD für Profile-Pack oder 9 USD/Monat
- Risiko: mittel, aber starke Differenzierung und direkt aus Nutzerbedarf abgeleitet.

## 4. Empfehlung und Roadmap

**Woche 1: Option A live schalten** (Landingpage liegt in `kistack/index.html` in diesem Repo).
- Als englische Startseite oder unter `kistack.io/kicad` ausliefern; Google-Intent für "kistack" bedienen
- Bestehende KI-Abo-Seite nach `/de` oder eigene Domain verschieben (sie zieht keinen US-Traffic)
- E-Mail-Formular anbinden (Beehiiv, Buttondown oder Resend), Starter-Kit als PDF/ZIP bauen
- Open Graph + Title auf "KiStack – AI agent skills for KiCad" setzen; GitHub-Projekte prominent verlinken
- Ziel-KPI: 15–25 % E-Mail-Conversion statt ~100 % Absprung → 5–10 Leads/Tag

**Woche 2–3: Kontakt zu American-Embedded (und Milind220).**
Transparent anbieten: Docs-/Landingpage-Hosting unter kistack.io, Verlinkung aus ihrem README. Das sichert Backlinks, Legitimität und entschärft das Namensrisiko (siehe 5). Bezahlte Kooperation oder Sponsoring ist möglich.

**Woche 3–6: Validierung Option B oder C.**
Im Newsletter eine Warteliste mit Preisanker testen. Wenn >5 % der Liste sich eintragen → bauen. Option C ist günstiger und näher am geäußerten Bedarf; Option B hat das größere Umsatzpotenzial.

## 5. Risiken

- **Name/Verwechslung:** "KiStack" ist der Projektname von American-Embedded (Custom-License). Nicht als deren offizielle Seite auftreten; klarer Disclaimer "independent, not affiliated"; Kooperation anstreben. Keine Markeneintragung ihrerseits gefunden, aber das kann sich ändern.
- **Traffic ist vielleicht flüchtig:** Der Star-Spike war Anfang September, seitdem 0–5 Stars/Tag. 25–50 Besucher/Tag kann also auch sinken. Darum schnell E-Mail-Liste aufbauen und mit eigenem Content ("kicad claude code", "kicad ai agent", "kicad mcp") zusätzlichen Suchtraffic holen.
- **Qualitätsanspruch der Zielgruppe:** Ingenieure reagieren allergisch auf "Spare 40 %"-Claims und erfundene Testimonials. Die Landingpage enthält bewusst nur belegbare Fakten.
- **Haftung:** Bei Option B klarstellen, dass Reviews Hinweise sind, keine Freigabe.

## 6. Was in diesem Repo liegt

- `kistack/index.html` – statische englische Landingpage (keine Abhängigkeiten, Dark Mode, mobil), Formular-Action ist ein Platzhalter
- `kistack/KONZEPT.md` – dieses Dokument

## Quellen
- https://github.com/American-Embedded/KiStack
- https://trendshift.io/repositories/206908
- https://github.com/Milind220/Ki-Stack
- https://github.com/aklofas/kicad-happy
- https://www.eevblog.com/forum/eda/claude-code-for-pcb-design/
- https://hackaday.com/2026/09/05/can-ai-now-design-pcbs-that-just-work/
- https://skillsmp.com/creators/american-embedded/kistack/skills-pcb
- https://www.kistacklab.com/
