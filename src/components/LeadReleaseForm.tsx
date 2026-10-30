import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { releaseLead } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2 } from "lucide-react";

interface Props {
  quoteId?: string;
  projectId?: string;
  token: string;
  defaultPlz?: string | null;
  defaultCity?: string | null;
  onDone?: () => void;
  released?: boolean;
}

export function LeadReleaseForm({ quoteId, projectId, token, defaultPlz, defaultCity, onDone, released }: Props) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", plz: defaultPlz ?? "", city: defaultCity ?? "", timeframe: "in den nächsten 3 Monaten", preferred_contact: "phone", consent: false });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(!!released);

  if (done) {
    return (
      <div className="rounded-lg border border-success/40 bg-success/5 p-5 flex gap-3">
        <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
        <div>
          <div className="font-semibold">Anfrage aktiv</div>
          <p className="text-sm text-muted-foreground">Bis zu drei geprüfte Betriebe aus Ihrer Region können sich jetzt melden. Sie entscheiden, mit wem Sie sprechen. Sie können die Betriebe jederzeit per E-Mail an kontakt@profiangebot.de stoppen lassen.</p>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consent) return toast.error("Bitte stimmen Sie der Weitergabe Ihrer Kontaktdaten zu.");
    setBusy(true);
    try {
      await releaseLead({ quote_id: quoteId, project_id: projectId, token, ...form });
      setDone(true);
      toast.success("Ihre Anfrage ist aktiv. Betriebe aus Ihrer Region wurden informiert.");
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h3 className="text-lg font-semibold">Bis zu 3 Vergleichsangebote erhalten, kostenlos</h3>
        <p className="text-sm text-muted-foreground">Geprüfte Betriebe aus Ihrer Region erhalten Ihr Vorhaben (ohne Ihre Kontaktdaten). Erst wenn ein Betrieb die Anfrage annimmt, bekommt er Ihre Daten. Maximal drei Betriebe.</p>
      </div>
      <div>
        <Label htmlFor="lr-name">Name</Label>
        <Input id="lr-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="lr-email">E-Mail</Label>
        <Input id="lr-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="lr-phone">Telefon (empfohlen)</Label>
        <Input id="lr-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor="lr-plz">PLZ</Label>
          <Input id="lr-plz" required pattern="\d{5}" inputMode="numeric" value={form.plz} onChange={(e) => setForm({ ...form, plz: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="lr-city">Ort</Label>
          <Input id="lr-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
      </div>
      <div>
        <Label htmlFor="lr-time">Zeitrahmen</Label>
        <select id="lr-time" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.timeframe} onChange={(e) => setForm({ ...form, timeframe: e.target.value })}>
          <option>so schnell wie möglich</option>
          <option>in den nächsten 3 Monaten</option>
          <option>in 3 bis 6 Monaten</option>
          <option>noch offen</option>
        </select>
      </div>
      <div>
        <Label htmlFor="lr-contact">Bevorzugter Kontakt</Label>
        <select id="lr-contact" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.preferred_contact} onChange={(e) => setForm({ ...form, preferred_contact: e.target.value })}>
          <option value="phone">Telefon</option>
          <option value="email">E-Mail</option>
        </select>
      </div>
      <label className="sm:col-span-2 flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
        <span>Ich bin einverstanden, dass Profiangebot meine Kontaktdaten an bis zu drei Handwerksbetriebe weitergibt, die sich zu meinem Vorhaben melden dürfen. Diese Einwilligung kann ich jederzeit widerrufen. <a href="/datenschutz" className="underline" target="_blank" rel="noreferrer">Datenschutz</a></span>
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={busy} variant="accent">{busy ? <Spinner className="text-white" /> : "Vergleichsangebote anfordern"}</Button>
      </div>
    </form>
  );
}
