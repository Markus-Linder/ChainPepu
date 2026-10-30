import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileSearch, ListChecks, Scale, ShieldCheck, Upload, Zap } from "lucide-react";
import { SEO, ORG_JSONLD, faqJsonLd } from "@/components/layout/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TRADES } from "@/data/trades";
import { publicStats } from "@/lib/api";
import { PRICES } from "@/data/legal";

const FAQ = [
  { q: "Ist die Prüfung wirklich kostenlos?", a: "Ja. Der Angebots-Check mit Gesamtbewertung, Preisurteil und den wichtigsten Risiken ist kostenlos. Den vollständigen Prüfbericht mit allen Positionen, Kostenschätzungen für fehlende Leistungen, Rückfragen und Verhandlungstipps gibt es für einmalig 9,99 €." },
  { q: "Wie funktioniert die Prüfung?", a: "Sie laden das Angebot als PDF oder Foto hoch. Eine KI, trainiert auf Baukostenkennwerte und tausende Angebotsstrukturen, liest jede Position, vergleicht Preise mit Richtwerten und echten Angeboten aus unserer Datenbank und prüft Vollständigkeit, Nachtragsrisiken und formale Punkte." },
  { q: "Was passiert mit meinem Angebot?", a: "Es wird verschlüsselt in der EU gespeichert und nur für Ihre Auswertung genutzt. Einzelpreise fließen anonymisiert, ohne Firmennamen oder Ihre Daten, in unsere Preisdatenbank ein. Sie können die Löschung jederzeit per E-Mail verlangen." },
  { q: "Bekomme ich Werbung oder Anrufe?", a: "Nein. Betriebe erhalten Ihre Kontaktdaten nur, wenn Sie das ausdrücklich freigeben, und dann maximal drei Betriebe." },
  { q: "Ersetzt der Bericht einen Sachverständigen?", a: "Nein. Der Bericht ist eine fundierte Orientierung und Vorbereitung für das Gespräch mit dem Betrieb. Er ist keine Rechtsberatung und kein Gutachten. Bei großen Bauvorhaben empfehlen wir zusätzlich einen unabhängigen Sachverständigen." },
];

export default function Home() {
  const { data: stats } = useQuery({ queryKey: ["public-stats"], queryFn: publicStats, staleTime: 60_000 });
  return (
    <>
      <SEO
        title="Handwerker-Angebot prüfen lassen: kostenlos in 2 Minuten | Profiangebot"
        description="Laden Sie Ihr Handwerker-Angebot hoch und erhalten Sie sofort eine unabhängige KI-Prüfung: fehlende Positionen, Nachtragsrisiken, Preisvergleich mit Richtwerten. Kostenlos. Auf Wunsch bis zu 3 Gegenangebote."
        path="/"
        jsonLd={[ORG_JSONLD, faqJsonLd(FAQ), { "@context": "https://schema.org", "@type": "WebSite", name: "Profiangebot", url: "https://profiangebot.de" }]}
      />
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-secondary/70 to-background">
        <div className="container grid gap-10 py-16 md:grid-cols-2 md:py-24 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" /> Unabhängig. Keine Provision vom Handwerker.
            </div>
            <h1 className="mt-5 text-4xl md:text-5xl font-extrabold leading-tight">Ist Ihr Handwerker-Angebot zu teuer oder lückenhaft?</h1>
            <p className="mt-5 text-lg text-muted-foreground">Angebot hochladen, in 2 Minuten wissen, was fehlt, was zu teuer ist und welche Nachträge drohen. Danach auf Wunsch bis zu drei Vergleichsangebote von geprüften Betrieben.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="accent"><Link to="/angebot-pruefen"><Upload /> Angebot jetzt prüfen, kostenlos</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/leistungsverzeichnis">Noch kein Angebot? Anfrage erstellen</Link></Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>PDF oder Foto</span><span>Alle Gewerke</span><span>Daten in der EU</span><span>Kein Konto nötig</span>
            </div>
          </div>
          <Card className="shadow-xl">
            <CardContent className="p-6">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Beispiel-Ergebnis</div>
              <div className="mt-3 flex items-center gap-4">
                <div className="text-5xl font-extrabold text-warning">61</div>
                <div>
                  <div className="font-semibold">Badsanierung, 24.800 €</div>
                  <div className="text-sm text-muted-foreground">Preisniveau: erhöht (Markt 18.000 bis 26.000 €)</div>
                </div>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex gap-2"><span className="text-destructive font-bold">!</span> Abdichtung nach DIN 18534 fehlt als Position (Nachtragsrisiko 800 bis 1.400 €)</li>
                <li className="flex gap-2"><span className="text-destructive font-bold">!</span> Entsorgung nur "nach Aufwand" angegeben</li>
                <li className="flex gap-2"><span className="text-warning font-bold">!</span> Fliesen als Pauschale ohne Format und m²-Preis</li>
                <li className="flex gap-2"><span className="text-success font-bold">✓</span> Gewährleistung und Zahlungsplan vorhanden</li>
              </ul>
              <div className="mt-5 rounded-md bg-secondary p-3 text-sm"><strong>Einsparpotenzial:</strong> ca. 2.600 € durch Nachverhandlung und Klärung von 3 Positionen</div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="text-3xl font-extrabold text-center">So funktioniert es</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Upload, t: "1. Hochladen", d: "Angebot als PDF oder Foto hochladen, Gewerk wählen. Kein Konto, keine App." },
            { icon: FileSearch, t: "2. Prüfung lesen", d: "In etwa 2 Minuten: Score, Preisurteil, fehlende Positionen, Risiken, formale Mängel. Vollständiger Bericht optional für 9,99 €." },
            { icon: Scale, t: "3. Vergleichen und verhandeln", d: "Rückfragen an den Betrieb mitnehmen, weitere Angebote vergleichen oder kostenlos bis zu drei Gegenangebote anfordern." },
          ].map((s) => (
            <Card key={s.t}><CardContent className="p-6"><s.icon className="h-8 w-8 text-primary" /><h3 className="mt-4 text-lg font-semibold">{s.t}</h3><p className="mt-2 text-sm text-muted-foreground">{s.d}</p></CardContent></Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/40">
        <div className="container py-14 grid gap-8 md:grid-cols-3">
          <div><div className="text-4xl font-extrabold text-primary">{(stats?.benchmarks ?? 0) > 500 ? stats!.benchmarks.toLocaleString("de-DE") : "500+"}</div><div className="text-sm text-muted-foreground">Preis-Datenpunkte aus Richtwerten und echten Angeboten, wächst mit jedem Upload</div></div>
          <div><div className="text-4xl font-extrabold text-primary">{TRADES.length}</div><div className="text-sm text-muted-foreground">Gewerke mit spezialisierten Prüf-Checklisten, von Bad bis Photovoltaik</div></div>
          <div><div className="text-4xl font-extrabold text-primary">max. 3</div><div className="text-sm text-muted-foreground">Betriebe pro Anfrage. Keine Anruflawine, Sie behalten die Kontrolle</div></div>
        </div>
      </section>

      <section className="container py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl font-extrabold">Was wir prüfen</h2>
          <Link to="/gewerke" className="text-sm font-semibold text-primary hover:underline">Alle Gewerke <ArrowRight className="inline h-4 w-4" /></Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Vollständigkeit", "Fehlen Demontage, Entsorgung, Gerüst, Abdichtung, Anmeldungen oder Anschlussarbeiten? Jede fehlende Position ist ein späterer Nachtrag."],
            ["Preisniveau", "Jede Position gegen Richtwerte 2026 und anonymisierte Preise aus echten Angeboten derselben Kategorie. Als Spanne, nicht als Punktwert."],
            ["Transparenz", "Pauschalen ohne Mengen, fehlende Einheitspreise, unklare Materialangaben. Das sind die Stellen, an denen später gestritten wird."],
            ["Formales", "Bindefrist, Zahlungsplan, Gewährleistung, Ausführungszeitraum, Nachtragsregel, Mehrwertsteuer. Was fehlt, lassen Sie ergänzen."],
            ["Rückfragen", "Fertige Fragen für das Gespräch mit dem Betrieb, so formuliert, dass Sie souverän auftreten."],
            ["Verhandlung", "Wo ist realistisch Spielraum, wo nicht? Mit geschätztem Einsparpotenzial in Euro."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-lg border p-5"><div className="flex items-center gap-2 font-semibold"><ListChecks className="h-5 w-5 text-primary" />{t}</div><p className="mt-2 text-sm text-muted-foreground">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="container pb-16">
        <div className="rounded-2xl bg-primary text-primary-foreground p-8 md:p-12 grid gap-6 md:grid-cols-2 items-center">
          <div>
            <h2 className="text-3xl font-extrabold">Noch kein Angebot? Erstellen Sie eine Anfrage wie vom Profi.</h2>
            <p className="mt-3 text-primary-foreground/85">Beschreiben Sie Ihr Vorhaben per Sprache oder Text. Wir erstellen daraus ein Leistungsverzeichnis, mit dem alle Betriebe das Gleiche kalkulieren. Endlich vergleichbare Angebote.</p>
          </div>
          <div className="flex md:justify-end"><Button asChild size="lg" variant="accent"><Link to="/leistungsverzeichnis"><Zap /> Anfrage erstellen, kostenlos</Link></Button></div>
        </div>
      </section>

      <section className="container pb-20">
        <h2 className="text-3xl font-extrabold">Häufige Fragen</h2>
        <div className="mt-6 divide-y rounded-lg border">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer font-semibold list-none flex justify-between">{f.q}<span className="text-muted-foreground group-open:rotate-45 transition">+</span></summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Vollständiger Prüfbericht: einmalig {PRICES.premiumReportEUR.toFixed(2).replace(".", ",")} € inkl. MwSt. Für Betriebe: Anfragen ab {PRICES.leadMemberEUR} €, Mitgliedschaft {PRICES.membershipEUR} € pro Monat. <Link to="/preise" className="underline">Alle Preise</Link></p>
      </section>
    </>
  );
}
