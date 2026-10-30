import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FileUp, Lock, ShieldCheck } from "lucide-react";
import { SEO } from "@/components/layout/SEO";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TradeSelect } from "@/components/TradeSelect";
import { analyzeQuote } from "@/lib/api";
import { useMyQuotes } from "@/hooks/useMyQuotes";
import { TRADE_BY_SLUG } from "@/data/trades";

const STEPS = ["Datei wird übertragen", "Positionen werden erkannt", "Preise werden mit Richtwerten verglichen", "Vollständigkeit und Risiken werden geprüft", "Bericht wird erstellt"];

export default function AngebotPruefen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { add } = useMyQuotes();
  const [trade, setTrade] = useState(params.get("gewerk") && TRADE_BY_SLUG[params.get("gewerk")!] ? params.get("gewerk")! : "badsanierung");
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [plz, setPlz] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    const ok = ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(f.type);
    if (!ok) return toast.error("Bitte PDF, JPG, PNG oder WebP hochladen. HEIC-Fotos bitte vorher als JPG exportieren.");
    if (f.size > 20 * 1024 * 1024) return toast.error("Maximal 20 MB.");
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Bitte zuerst ein Angebot auswählen.");
    setBusy(true);
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 9000);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("trade", trade);
      if (email) fd.append("email", email);
      if (plz) fd.append("plz", plz);
      if (title) fd.append("project_title", title);
      const res = await analyzeQuote(fd);
      add({ id: res.id, token: res.token, name: title || file.name, trade, createdAt: new Date().toISOString(), score: res.score });
      navigate(`/bericht/${res.id}?t=${res.token}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Die Prüfung ist fehlgeschlagen.");
    } finally {
      clearInterval(timer);
      setBusy(false);
    }
  };

  return (
    <>
      <SEO title="Handwerker-Angebot prüfen lassen, kostenlos" description="Angebot als PDF oder Foto hochladen. Die KI prüft Positionen, Preise, fehlende Leistungen und Nachtragsrisiken. Ergebnis in 2 Minuten, ohne Konto." path="/angebot-pruefen" />
      <PageHeader eyebrow="Angebots-Check" title="Angebot hochladen und prüfen lassen" lead="PDF oder Foto, alle Gewerke. Sie erhalten Score, Preisurteil, fehlende Positionen und Risiken. Kostenlos und ohne Konto." />
      <section className="container py-10 grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            {busy ? (
              <div className="py-10 text-center">
                <div className="mx-auto h-14 w-14 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <h2 className="mt-6 text-xl font-semibold">Ihr Angebot wird geprüft</h2>
                <p className="mt-2 text-sm text-muted-foreground">Das dauert je nach Umfang 30 bis 90 Sekunden. Bitte Seite nicht schließen.</p>
                <div className="mx-auto mt-6 max-w-md"><Progress value={((step + 1) / STEPS.length) * 100} /><div className="mt-2 text-sm font-medium">{STEPS[step]}</div></div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-6">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}
                  onClick={() => inputRef.current?.click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${drag ? "border-primary bg-secondary" : "border-input hover:bg-muted/50"}`}
                >
                  <FileUp className="mx-auto h-10 w-10 text-primary" />
                  <div className="mt-3 font-semibold">{file ? file.name : "Angebot hierher ziehen oder klicken"}</div>
                  <div className="text-sm text-muted-foreground">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB, ${file.type}` : "PDF, JPG, PNG oder WebP, max. 20 MB. Mehrseitige Angebote bitte als PDF."}</div>
                  <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="trade">Gewerk</Label><TradeSelect value={trade} onChange={setTrade} /></div>
                  <div><Label htmlFor="title">Vorhaben (optional)</Label><Input id="title" placeholder="z.B. Bad komplett, 7 m²" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                  <div><Label htmlFor="plz">PLZ (für regionale Preise)</Label><Input id="plz" inputMode="numeric" pattern="\d{5}" placeholder="74579" value={plz} onChange={(e) => setPlz(e.target.value)} /></div>
                  <div><Label htmlFor="email">E-Mail (optional, für den Berichtslink)</Label><Input id="email" type="email" placeholder="sie@beispiel.de" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                </div>
                <Button type="submit" size="lg" variant="accent" className="w-full sm:w-auto" disabled={!file}>Jetzt kostenlos prüfen</Button>
                <p className="text-xs text-muted-foreground">Mit dem Upload stimmen Sie der Verarbeitung des Dokuments zur Erstellung Ihres Berichts zu. Einzelpreise fließen anonymisiert in unsere Preisdatenbank ein. <a href="/datenschutz" className="underline">Datenschutz</a></p>
              </form>
            )}
          </CardContent>
        </Card>
        <aside className="space-y-4">
          <div className="rounded-lg border p-5"><div className="flex items-center gap-2 font-semibold"><Lock className="h-5 w-5 text-primary" />Sicher</div><p className="mt-2 text-sm text-muted-foreground">Verschlüsselte Übertragung, Speicherung in der EU, Zugriff nur über Ihren persönlichen Link.</p></div>
          <div className="rounded-lg border p-5"><div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-primary" />Unabhängig</div><p className="mt-2 text-sm text-muted-foreground">Wir erhalten keine Provision vom Betrieb, dessen Angebot Sie prüfen. Betriebe zahlen nur, wenn Sie selbst Vergleichsangebote anfordern.</p></div>
          <div className="rounded-lg border p-5"><div className="font-semibold">Tipp: Beste Ergebnisse</div><ul className="mt-2 text-sm text-muted-foreground list-disc pl-4 space-y-1"><li>Komplettes Angebot inkl. aller Seiten und AGB-Hinweise</li><li>Bei Fotos: gerade, gut belichtet, eine Seite pro Bild als PDF zusammenfassen</li><li>PLZ angeben für regionale Preisspannen</li></ul></div>
        </aside>
      </section>
    </>
  );
}
