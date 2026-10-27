import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppShell from "@/components/AppShell";

export default function NewScan() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<"http" | "anthropic_demo">("anthropic_demo");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    "Du bist der Kundensupport-Assistent von ExampleShop. Sei hilfsbereit, bleib beim Thema und gib keine vertraulichen Infos preis.",
  );
  const [pack, setPack] = useState<"quick" | "full">("quick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Nicht angemeldet.");

      const { data: target, error: tErr } = await supabase
        .from("targets")
        .insert({
          user_id: uid,
          name: name || (kind === "anthropic_demo" ? "Demo-Assistent" : "Mein Assistent"),
          description,
          kind,
          endpoint: kind === "http" ? endpoint : "",
          system_prompt: kind === "anthropic_demo" ? systemPrompt : null,
          auth_header: kind === "http" && authHeader ? authHeader : null,
        })
        .select()
        .single();
      if (tErr) throw tErr;

      const { data: scan, error: sErr } = await supabase
        .from("scans")
        .insert({ user_id: uid, target_id: target.id, pack, status: "queued" })
        .select()
        .single();
      if (sErr) throw sErr;

      // Fire the edge function (don't await the whole scan; the detail page streams progress).
      supabase.functions.invoke("run-redteam", { body: { scanId: scan.id } }).catch(() => {});

      navigate(`/app/scan/${scan.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-bold">Neuer Scan</h1>
      <form onSubmit={start} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ziel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setKind("anthropic_demo")}
                className={`rounded-lg border p-3 text-left text-sm ${kind === "anthropic_demo" ? "border-primary bg-secondary" : ""}`}
              >
                <div className="font-medium">Demo-Assistent</div>
                <div className="text-xs text-muted-foreground">Sofort testen mit System-Prompt</div>
              </button>
              <button
                type="button"
                onClick={() => setKind("http")}
                className={`rounded-lg border p-3 text-left text-sm ${kind === "http" ? "border-primary bg-secondary" : ""}`}
              >
                <div className="font-medium">Eigener Endpoint</div>
                <div className="text-xs text-muted-foreground">Euer echter Chatbot per HTTP</div>
              </button>
            </div>

            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Support-Bot Produktion" className="input" />
            </Field>
            <Field label="Zweck des Assistenten (hilft dem Bewerter)">
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="z. B. Kundensupport für einen Online-Shop" className="input" />
            </Field>

            {kind === "http" ? (
              <>
                <Field label="HTTP-Endpoint (POST, erwartet { message } → Textantwort)">
                  <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://api.euerservice.de/chat" className="input" required />
                </Field>
                <Field label="Authorization-Header (optional)">
                  <input value={authHeader} onChange={(e) => setAuthHeader(e.target.value)} placeholder="Bearer …" className="input" />
                </Field>
              </>
            ) : (
              <Field label="System-Prompt eures Assistenten">
                <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={4} className="input" />
              </Field>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Umfang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setPack("quick")} className={`rounded-lg border p-3 text-left text-sm ${pack === "quick" ? "border-primary bg-secondary" : ""}`}>
                <div className="font-medium">Quick</div>
                <div className="text-xs text-muted-foreground">Kerntests, ~1 Min.</div>
              </button>
              <button type="button" onClick={() => setPack("full")} className={`rounded-lg border p-3 text-left text-sm ${pack === "full" ? "border-primary bg-secondary" : ""}`}>
                <div className="font-medium">Full</div>
                <div className="text-xs text-muted-foreground">Voller Testumfang</div>
              </button>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Starte…" : "Scan starten"}
        </Button>
      </form>

      <style>{`.input{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.875rem}`}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
