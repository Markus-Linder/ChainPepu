import { Link } from "react-router-dom";
import { CheckCircle2, Euro, ShieldCheck, Target } from "lucide-react";
import { SEO, faqJsonLd } from "@/components/layout/SEO";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PRICES } from "@/data/legal";

const FAQ = [
  { q: "Was unterscheidet diese Anfragen von MyHammer oder Check24?", a: "Jeder Kunde hat bereits ein konkretes Angebot prüfen lassen oder ein Leistungsverzeichnis erstellt. Er kennt die Marktspanne, weiß, was er will, und steht kurz vor der Vergabe. Sie erhalten den Prüfkontext mit und kalkulieren auf denselben Umfang wie der Wettbewerb." },
  { q: "Wie viele Betriebe erhalten eine Anfrage?", a: "Maximal drei. Sie sehen vor dem Kauf, wie viele Betriebe die Anfrage bereits angenommen haben." },
  { q: "Was kostet eine Anfrage?", a: `${PRICES.leadEUR} € zzgl. MwSt. pro angenommener Anfrage, für Mitglieder ${PRICES.leadMemberEUR} €. Keine Grundgebühr, keine Provision auf den Auftrag.` },
  { q: "Was bringt die Mitgliedschaft?", a: `Für ${PRICES.membershipEUR} € pro Monat erhalten Sie günstigere Anfragen, ein verifiziertes Profil mit Badge, Vorrang bei neuen Anfragen in Ihrer Region und Statistiken. Monatlich kündbar.` },
  { q: "Kann ich die Region eingrenzen?", a: "Ja, über PLZ-Gebiete (zweistellig) und Gewerke. Sie sehen nur passende Anfragen." },
];

export default function FuerBetriebe() {
  return (
    <>
      <SEO title="Für Handwerksbetriebe: Anfragen von Kunden mit Angebot in der Hand" description={`Qualifizierte Kundenanfragen: Der Kunde hat bereits ein Angebot prüfen lassen und steht vor der Vergabe. Max. 3 Betriebe pro Anfrage, ${PRICES.leadEUR} € pro Anfrage, keine Grundgebühr.`} path="/fuer-betriebe" jsonLd={faqJsonLd(FAQ)} />
      <PageHeader eyebrow="Für Betriebe" title="Anfragen von Kunden, die wirklich beauftragen" lead="Unsere Kunden haben bereits ein Angebot prüfen lassen oder ein Leistungsverzeichnis erstellt. Sie wissen, was sie wollen und was es kostet. Sie bekommen eine vergleichbare Anfrage und maximal zwei Mitbewerber.">
        <div className="flex flex-wrap gap-3"><Button asChild size="lg" variant="accent"><Link to="/betriebe/login?tab=register">Kostenlos registrieren</Link></Button><Button asChild size="lg" variant="outline"><Link to="/betriebe/login">Anmelden</Link></Button></div>
      </PageHeader>
      <section className="container py-14 grid gap-6 md:grid-cols-3">
        {[
          { icon: Target, t: "Vorqualifiziert", d: "Jede Anfrage enthält Gewerk, Region, Leistungsumfang, Zeitrahmen und, wenn vorhanden, die Höhe des bereits vorliegenden Angebots." },
          { icon: Euro, t: "Faire Kosten", d: `${PRICES.leadEUR} € pro Anfrage, Mitglieder ${PRICES.leadMemberEUR} €. Keine Grundgebühr, keine Provision. Sie zahlen nur, wenn Sie eine Anfrage aktiv annehmen.` },
          { icon: ShieldCheck, t: "Maximal 3 Betriebe", d: "Keine Anruflawine beim Kunden, keine Preisschlacht mit zehn Wettbewerbern. Sie sehen vorher, wie viele Betriebe schon dabei sind." },
        ].map((x) => <Card key={x.t}><CardContent className="p-6"><x.icon className="h-8 w-8 text-primary" /><h2 className="mt-4 text-lg font-semibold">{x.t}</h2><p className="mt-2 text-sm text-muted-foreground">{x.d}</p></CardContent></Card>)}
      </section>
      <section className="container pb-14">
        <div className="grid gap-6 md:grid-cols-2">
          <Card><CardContent className="p-6"><div className="text-sm font-semibold text-primary">Ohne Mitgliedschaft</div><div className="mt-1 text-3xl font-extrabold">{PRICES.leadEUR} € <span className="text-base font-normal text-muted-foreground">pro Anfrage</span></div><ul className="mt-4 space-y-2 text-sm">{["Kostenlose Registrierung", "Anfragen nach Gewerk und Region", "Zahlung pro Anfrage per Karte oder SEPA", "Rechnung automatisch per E-Mail"].map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" />{x}</li>)}</ul></CardContent></Card>
          <Card className="border-primary"><CardContent className="p-6"><div className="text-sm font-semibold text-primary">Mitgliedschaft</div><div className="mt-1 text-3xl font-extrabold">{PRICES.membershipEUR} € <span className="text-base font-normal text-muted-foreground">pro Monat</span></div><ul className="mt-4 space-y-2 text-sm">{[`Anfragen für ${PRICES.leadMemberEUR} € statt ${PRICES.leadEUR} €`, "Verifiziertes Profil mit Badge", "Vorrang bei neuen Anfragen in Ihrer Region", "Statistiken und Auswertungen", "Monatlich kündbar"].map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" />{x}</li>)}</ul></CardContent></Card>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Alle Betriebspreise zzgl. gesetzlicher Mehrwertsteuer.</p>
      </section>
      <section className="container pb-20 max-w-3xl"><h2 className="text-2xl font-bold">Häufige Fragen</h2><div className="mt-4 divide-y rounded-lg border">{FAQ.map((f) => <details key={f.q} className="p-5"><summary className="cursor-pointer font-semibold">{f.q}</summary><p className="mt-2 text-sm text-muted-foreground">{f.a}</p></details>)}</div></section>
    </>
  );
}
