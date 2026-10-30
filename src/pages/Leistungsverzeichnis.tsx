import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Camera, Mic, MicOff, Sparkles, X } from "lucide-react";
import { SEO } from "@/components/layout/SEO";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { TradeSelect } from "@/components/TradeSelect";
import { generateLv } from "@/lib/api";

type SpeechRecognitionCtor = new () => {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void;
};

function getRecognition(): SpeechRecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

async function compressImage(file: File): Promise<{ data: string; media_type: string; preview: string }> {
  const bitmap = await createImageBitmap(file);
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  return { data: dataUrl.split(",")[1], media_type: "image/jpeg", preview: dataUrl };
}

export default function Leistungsverzeichnis() {
  const navigate = useNavigate();
  const [trade, setTrade] = useState("badsanierung");
  const [plz, setPlz] = useState("");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<{ data: string; media_type: string; preview: string }[]>([]);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const supported = !!getRecognition();

  useEffect(() => () => recRef.current?.stop(), []);

  const toggleMic = () => {
    const Ctor = getRecognition();
    if (!Ctor) return toast.error("Spracheingabe wird von diesem Browser nicht unterstützt. Bitte Chrome, Edge oder Safari verwenden oder Text eingeben.");
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "de-DE";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let chunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) chunk += e.results[i][0].transcript + " ";
      if (chunk) setText((t) => (t ? t + " " : "") + chunk.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); toast.error("Spracheingabe abgebrochen."); };
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 6 - photos.length);
    try {
      const out = await Promise.all(list.map(compressImage));
      setPhotos((p) => [...p, ...out]);
    } catch {
      toast.error("Ein Foto konnte nicht gelesen werden.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 20) return toast.error("Bitte beschreiben Sie Ihr Vorhaben etwas genauer (mindestens 20 Zeichen).");
    setBusy(true);
    try {
      const res = await generateLv({ trade, description: text.trim(), plz: plz || undefined, photos: photos.map(({ data, media_type }) => ({ data, media_type })) });
      navigate(`/leistungsverzeichnis/${res.id}?t=${res.token}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
      setBusy(false);
    }
  };

  return (
    <>
      <SEO title="Anfrage erstellen: Leistungsverzeichnis per Sprache" description="Beschreiben Sie Ihr Bauvorhaben per Sprache oder Text. Die KI erstellt ein Leistungsverzeichnis, mit dem Handwerker vergleichbar kalkulieren. Kostenlos." path="/leistungsverzeichnis" />
      <PageHeader eyebrow="Anfrage wie vom Profi" title="Vorhaben beschreiben, Leistungsverzeichnis erhalten" lead="Sprechen oder tippen Sie, was gemacht werden soll. Wir strukturieren daraus Positionen mit Mengen und Einheiten, ergänzen vergessene Nebenleistungen und machen Ihre Angebote endlich vergleichbar." />
      <section className="container py-10 grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            {busy ? (
              <div className="py-12 text-center"><Spinner className="mx-auto h-10 w-10" /><h2 className="mt-5 text-xl font-semibold">Leistungsverzeichnis wird erstellt</h2><p className="text-sm text-muted-foreground mt-2">Etwa 20 bis 60 Sekunden.</p></div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="trade">Gewerk</Label><TradeSelect value={trade} onChange={setTrade} /></div>
                  <div><Label htmlFor="plz">PLZ</Label><Input id="plz" inputMode="numeric" pattern="\d{5}" value={plz} onChange={(e) => setPlz(e.target.value)} placeholder="74579" /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between"><Label htmlFor="desc">Was soll gemacht werden?</Label>{supported && <Button type="button" size="sm" variant={listening ? "destructive" : "secondary"} onClick={toggleMic}>{listening ? <><MicOff /> Aufnahme stoppen</> : <><Mic /> Diktieren</>}</Button>}</div>
                  <Textarea id="desc" className="mt-1 min-h-[180px]" value={text} onChange={(e) => setText(e.target.value)} placeholder={"Beispiel: Unser Bad ist etwa 7 Quadratmeter, Baujahr 1985. Wir wollen die Wanne raus und eine bodengleiche Dusche rein, neue Fliesen bis zur Decke, neues WC, Waschtisch mit Unterschrank, Handtuchheizkörper. Leitungen sind alt und sollen erneuert werden. Fenster bleibt."} />
                  {listening && <div className="mt-1 text-xs text-destructive animate-pulse">Aufnahme läuft, sprechen Sie einfach. Pausen sind kein Problem.</div>}
                </div>
                <div>
                  <Label>Fotos (optional, max. 6)</Label>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {photos.map((p, i) => <div key={i} className="relative"><img src={p.preview} alt="" className="h-20 w-20 rounded-md object-cover border" /><button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute -right-2 -top-2 rounded-full bg-background border p-0.5"><X className="h-3 w-3" /></button></div>)}
                    {photos.length < 6 && <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-md border border-dashed hover:bg-muted"><Camera className="h-6 w-6 text-muted-foreground" /><input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} /></label>}
                  </div>
                </div>
                <Button type="submit" size="lg" variant="accent"><Sparkles /> Leistungsverzeichnis erstellen</Button>
              </form>
            )}
          </CardContent>
        </Card>
        <aside className="space-y-4">
          <div className="rounded-lg border p-5"><div className="font-semibold">Warum ein Leistungsverzeichnis?</div><p className="mt-2 text-sm text-muted-foreground">Drei Betriebe, drei verschiedene Angebote: Einer rechnet die Entsorgung ein, einer nicht, der dritte schreibt eine Pauschale. Mit einem gemeinsamen Leistungsverzeichnis kalkulieren alle dasselbe. Erst dann ist der Preisvergleich fair.</p></div>
          <div className="rounded-lg border p-5"><div className="font-semibold">Das erhalten Sie</div><ul className="mt-2 text-sm text-muted-foreground list-disc pl-4 space-y-1"><li>Positionen mit Mengen und Einheiten</li><li>Häufig vergessene Nebenleistungen</li><li>Annahmen, die Sie bestätigen sollten</li><li>Fragen, die Sie vor der Anfrage klären sollten</li><li>Grobe Kostenspanne</li><li>Auf Wunsch: bis zu 3 Angebote von geprüften Betrieben</li></ul></div>
        </aside>
      </section>
    </>
  );
}
