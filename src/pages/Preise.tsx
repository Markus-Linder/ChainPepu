import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/layout/SEO";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PRICES } from "@/data/legal";

const eur = (n: number) => n.toFixed(2).replace(".", ",") + " €";

export default function Preise() {
  return (
    <>
      <SEO title="Preise" description="Angebots-Check kostenlos, vollständiger Prüfbericht 9,99 €. Für Betriebe: Anfragen ab 39 €, Mitgliedschaft 59 € pro Monat." path="/preise" />
      <PageHeader eyebrow="Preise" title="Transparent und ohne Abo für Kunden" lead="Der Angebots-Check, das Leistungsverzeichnis und der Vergleich sind kostenlos. Nur der vollständige Prüfbericht kostet einmalig 9,99 €." />
      <section className="container py-12 grid gap-6 md:grid-cols-3">
        <Card><CardContent className="p-6"><div className="text-sm font-semibold text-primary">Für Kunden</div><div className="mt-2 text-3xl font-extrabold">0 €</div><div className="text-muted-foreground text-sm">Angebots-Check, Leistungsverzeichnis, Vergleich, Vergleichsangebote</div><ul className="mt-4 space-y-2 text-sm">{["Score und Preisurteil", "Die 2 wichtigsten fehlenden Positionen", "Wichtigstes Risiko", "Leistungsverzeichnis per Sprache", "Vergleich mehrerer Angebote", "Bis zu 3 Gegenangebote"].map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" />{x}</li>)}</ul><Button asChild className="mt-6 w-full"><Link to="/angebot-pruefen">Kostenlos starten</Link></Button></CardContent></Card>
        <Card className="border-accent"><CardContent className="p-6"><div className="text-sm font-semibold text-accent">Vollständiger Prüfbericht</div><div className="mt-2 text-3xl font-extrabold">{eur(PRICES.premiumReportEUR)}</div><div className="text-muted-foreground text-sm">einmalig pro Angebot, inkl. MwSt.</div><ul className="mt-4 space-y-2 text-sm">{["Alle Positionen mit Bewertung und Richtwert", "Alle fehlenden Leistungen mit Kostenschätzung", "Marktspanne für den Gesamtumfang", "Risiken und formale Prüfung", "Konkrete Rückfragen an den Betrieb", "Verhandlungstipps mit Einsparpotenzial", "PDF-Export"].map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" />{x}</li>)}</ul><Button asChild variant="accent" className="mt-6 w-full"><Link to="/angebot-pruefen">Angebot prüfen</Link></Button></CardContent></Card>
        <Card><CardContent className="p-6"><div className="text-sm font-semibold text-primary">Für Betriebe</div><div className="mt-2 text-3xl font-extrabold">{PRICES.leadEUR} €</div><div className="text-muted-foreground text-sm">pro angenommener Anfrage, zzgl. MwSt. · Mitglieder {PRICES.leadMemberEUR} €</div><ul className="mt-4 space-y-2 text-sm">{["Kunde hat bereits ein Angebot oder ein Leistungsverzeichnis", "Maximal 3 Betriebe pro Anfrage", "Keine Grundgebühr, keine Provision", `Mitgliedschaft ${PRICES.membershipEUR} €/Monat: Vorrang, verifiziertes Profil, Statistiken`].map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" />{x}</li>)}</ul><Button asChild variant="outline" className="mt-6 w-full"><Link to="/fuer-betriebe">Mehr für Betriebe</Link></Button></CardContent></Card>
      </section>
      <section className="container pb-16 text-sm text-muted-foreground max-w-3xl"><p>Kundenpreise verstehen sich inklusive der gesetzlichen Mehrwertsteuer. Betriebspreise zuzüglich Mehrwertsteuer. Zahlung über Stripe. Für digitale Inhalte, die sofort bereitgestellt werden, erlischt das Widerrufsrecht mit Beginn der Ausführung, siehe <Link to="/widerruf" className="underline">Widerrufsbelehrung</Link>.</p></section>
    </>
  );
}
