import { Link } from "react-router-dom";
import { ShieldCheck, Zap, FileCheck, Bot, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_META } from "@/lib/categories";

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-mono font-semibold">redteamly</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/login">
              <Button size="sm">Kostenlos testen</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border bg-secondary px-4 py-1.5 text-xs font-medium text-secondary-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" />
          OWASP LLM Top 10 · EU AI Act
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          Testet eure KI-Assistenten, bevor Angreifer es tun.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          redteamly schickt automatisierte Prompt-Injection- und Jailbreak-Tests gegen euren
          eigenen Chatbot, bewertet jede Antwort und liefert einen prüffähigen Report – in Minuten,
          nicht Wochen.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/login">
            <Button size="lg" className="gap-2">
              Ersten Scan starten <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#how">
            <Button size="lg" variant="outline">So funktioniert es</Button>
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Nur für eure eigenen Systeme · keine Kreditkarte für den Demo-Scan
        </p>
      </section>

      {/* How */}
      <section id="how" className="border-y bg-secondary/40 py-16">
        <div className="container">
          <h2 className="mb-10 text-center text-2xl font-bold">In drei Schritten geprüft</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Bot, title: "1. Ziel verbinden", body: "Euren Assistenten per URL eintragen oder sofort mit einer Demo-Konfiguration testen." },
              { icon: Zap, title: "2. Scan läuft automatisch", body: "redteamly sendet die Testfälle und bewertet jede Antwort mit einem Judge-Modell." },
              { icon: FileCheck, title: "3. Report & Score", body: "Ihr bekommt einen Sicherheits-Score, Schwachstellen nach Schweregrad und die Compliance-Zuordnung." },
            ].map((s) => (
              <Card key={s.title}>
                <CardContent className="pt-6">
                  <s.icon className="mb-3 h-7 w-7 text-primary" />
                  <h3 className="mb-1 font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section className="container py-16">
        <h2 className="mb-3 text-center text-2xl font-bold">Was getestet wird</h2>
        <p className="mx-auto mb-10 max-w-xl text-center text-sm text-muted-foreground">
          Jede Kategorie ist den OWASP-LLM-Top-10 und den relevanten Artikeln des EU AI Act zugeordnet.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <div key={key} className="rounded-lg border p-4">
              <div className="mb-1 flex items-center gap-2 font-medium">
                <Check className="h-4 w-4 text-primary" /> {meta.label}
              </div>
              <p className="text-sm text-muted-foreground">{meta.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t bg-secondary/40 py-16">
        <div className="container">
          <h2 className="mb-10 text-center text-2xl font-bold">Einfache Preise</h2>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold">Starter</h3>
                <p className="mt-1 text-3xl font-bold">€49<span className="text-base font-normal text-muted-foreground">/Monat</span></p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> 1 Ziel</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Wöchentliche Scans</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> PDF-Report</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-primary">
              <CardContent className="pt-6">
                <h3 className="font-semibold">Business</h3>
                <p className="mt-1 text-3xl font-bold">€199<span className="text-base font-normal text-muted-foreground">/Monat</span></p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> 10 Ziele</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> Tägliche Scans + voller Testumfang</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary" /> EU-AI-Act-Report, API-Zugang</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Preise sind Platzhalter – Zahlungsabwicklung (z. B. Stripe) wird separat angebunden.
          </p>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>redteamly · Testet nur Systeme, für die ihr autorisiert seid.</p>
        </div>
      </footer>
    </div>
  );
}
