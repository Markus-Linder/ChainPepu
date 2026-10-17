import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { rememberInvite, useAuth } from "@/lib/auth";
import { addLink, boostChain, buySkin, createCheckout, createInvite, demoAddStars, startChain, uploadImage } from "@/lib/api";

export function Notice({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (error) return <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p>;
  if (ok) return <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">{ok}</p>;
  return null;
}

/** Kleiner Helfer für Formulare: Fehler, Erfolg, Ladezustand. */
function useSubmit<T>(fn: (v: T) => Promise<string | void>) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const run = async (v: T) => {
    setError(null); setOk(null); setPending(true);
    try { const msg = await fn(v); if (msg) setOk(msg); } catch (e) { setError((e as Error).message); } finally { setPending(false); }
  };
  return { error, ok, pending, run };
}

const COLORS = ["#7c5cff", "#ff5cc8", "#ffd26b", "#50ffb4", "#5cc8ff", "#ff6b4a"];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="muted text-xs">Farbe deines Glieds</span>
      {COLORS.map((col) => (
        <button key={col} type="button" onClick={() => onChange(col)} aria-label={col}
          className="h-6 w-6 rounded-full border-2" style={{ background: col, borderColor: value === col ? "white" : "transparent" }} />
      ))}
    </div>
  );
}

function ImagePicker({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  return (
    <label className="input flex cursor-pointer items-center gap-3 text-sm">
      <span className="muted">{file ? file.name : "Optional: Bild auswählen (max. 8 MB)"}</span>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      {file && <button type="button" className="muted ml-auto text-xs" onClick={() => onChange(null)}>entfernen</button>}
    </label>
  );
}

export function RegisterForm({ invite, next }: { invite?: string; next?: string }) {
  const nav = useNavigate();
  const [f, setF] = useState({ display_name: "", username: "", email: "", password: "" });
  const s = useSubmit(async () => {
    if (!/^[a-z0-9_]{3,20}$/.test(f.username)) throw new Error("Nutzername: 3 bis 20 Zeichen, nur Kleinbuchstaben, Zahlen, Unterstrich.");
    if (f.password.length < 8) throw new Error("Das Passwort braucht mindestens 8 Zeichen.");
    const { data: taken } = await supabase.from("profiles").select("id").eq("username", f.username).maybeSingle();
    if (taken) throw new Error("Dieser Nutzername ist schon vergeben.");
    if (invite) rememberInvite(invite);
    const { data, error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: { data: { username: f.username, display_name: f.display_name }, emailRedirectTo: window.location.origin + (next || "/") },
    });
    if (error) throw error;
    if (!data.session) return "Fast geschafft: Bitte bestätige deine E-Mail-Adresse, dann geht es los.";
    nav(next || `/p/${f.username}`);
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <input className="input" placeholder="Wie sollen dich alle nennen?" maxLength={40} required value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} />
      <input className="input" placeholder="nutzername (nur a-z, 0-9, _)" required value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} />
      <input className="input" type="email" placeholder="E-Mail" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input className="input" type="password" placeholder="Passwort (mind. 8 Zeichen)" minLength={8} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      <Notice error={s.error} ok={s.ok} />
      <button className="btn w-full" disabled={s.pending}>{s.pending ? "Planet entsteht…" : "Meinen Planeten erschaffen"}</button>
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const nav = useNavigate();
  const [f, setF] = useState({ email: "", password: "" });
  const s = useSubmit(async () => {
    const { error } = await supabase.auth.signInWithPassword(f);
    if (error) throw new Error("E-Mail oder Passwort stimmt nicht.");
    nav(next || "/");
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <input className="input" type="email" placeholder="E-Mail" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input className="input" type="password" placeholder="Passwort" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      <Notice error={s.error} />
      <button className="btn w-full" disabled={s.pending}>{s.pending ? "Moment…" : "Anmelden"}</button>
    </form>
  );
}

export function StartChainForm() {
  const nav = useNavigate();
  const { session } = useAuth();
  const [title, setTitle] = useState(""); const [text, setText] = useState("");
  const [color, setColor] = useState(COLORS[0]); const [file, setFile] = useState<File | null>(null);
  const s = useSubmit(async () => {
    if (!session) throw new Error("Bitte zuerst anmelden.");
    const image_url = file ? await uploadImage(session.user.id, file) : null;
    const id = await startChain({ title: title.trim(), text: text.trim(), image_url, color });
    nav(`/c/${id}`);
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <input className="input text-lg font-semibold" placeholder="Titel der Kette, z. B. „Zeig dein Frühstück“" maxLength={80} minLength={2} required value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input min-h-28" placeholder="Dein erstes Glied. Ein Satz, ein Gedanke, eine Frage, ein Aufruf…" maxLength={500} required value={text} onChange={(e) => setText(e.target.value)} />
      <ImagePicker file={file} onChange={setFile} />
      <ColorPicker value={color} onChange={setColor} />
      <Notice error={s.error} />
      <button className="btn w-full" disabled={s.pending}>{s.pending ? "Kette entsteht…" : "Kette ins Universum schicken"}</button>
    </form>
  );
}

export function AppendLinkForm({ chainId, onDone }: { chainId: number; onDone: () => void }) {
  const { session, refresh } = useAuth();
  const [text, setText] = useState(""); const [color, setColor] = useState(COLORS[0]); const [file, setFile] = useState<File | null>(null);
  const s = useSubmit(async () => {
    if (!session) throw new Error("Bitte zuerst anmelden.");
    const image_url = file ? await uploadImage(session.user.id, file) : null;
    await addLink({ chain_id: chainId, text: text.trim(), image_url, color });
    setText(""); setFile(null); await refresh(); onDone();
    return "Dein Glied hängt jetzt an der Kette.";
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <textarea className="input min-h-24" placeholder="Dein Glied an dieser Kette…" maxLength={500} required value={text} onChange={(e) => setText(e.target.value)} />
      <ImagePicker file={file} onChange={setFile} />
      <ColorPicker value={color} onChange={setColor} />
      <Notice error={s.error} ok={s.ok} />
      <button className="btn w-full" disabled={s.pending}>{s.pending ? "Wird angehängt…" : "Glied anhängen"}</button>
    </form>
  );
}

export function BoostButton({ chainId, cost, onDone }: { chainId: number; cost: number; onDone: () => void }) {
  const { refresh } = useAuth();
  const s = useSubmit(async () => { await boostChain(chainId); await refresh(); onDone(); return "Deine Kette leuchtet jetzt heller."; });
  return (
    <div className="space-y-2">
      <button className="btn btn-ghost w-full" disabled={s.pending} onClick={() => s.run(undefined)}>
        ⚡ Kette boosten <span style={{ color: "var(--star)" }}>★ {cost}</span>
      </button>
      <Notice error={s.error} ok={s.ok} />
    </div>
  );
}

export function InviteButton({ chainId }: { chainId: number }) {
  const { session } = useAuth();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const s = useSubmit(async () => {
    if (!session) throw new Error("Bitte zuerst anmelden.");
    setLink(`${window.location.origin}/einladung/${await createInvite(chainId, session.user.id)}`);
  });
  return (
    <div className="space-y-2">
      {!link ? (
        <button type="button" className="btn w-full" disabled={s.pending} onClick={() => s.run(undefined)}>
          {s.pending ? "Link entsteht…" : "Jemanden als nächstes Glied einladen"}
        </button>
      ) : (
        <div className="space-y-2">
          <input className="input text-xs" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <div className="flex gap-2">
            <button type="button" className="btn flex-1 text-sm" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? "Kopiert ✓" : "Link kopieren"}
            </button>
            {"share" in navigator && (
              <button type="button" className="btn btn-ghost flex-1 text-sm" onClick={() => navigator.share({ url: link, title: "Häng dich an meine Kette" }).catch(() => {})}>Teilen</button>
            )}
          </div>
          <p className="muted text-xs">Wer über diesen Link einen Planeten erstellt, landet direkt in dieser Kette. Du bekommst 10 Sterne.</p>
        </div>
      )}
      <Notice error={s.error} />
    </div>
  );
}

export function BuySkinButton({ skin, price, owned, name }: { skin: string; price: number; owned: boolean; name: string }) {
  const { refresh } = useAuth();
  const s = useSubmit(async () => { await buySkin(skin); await refresh(); return `Dein Planet trägt jetzt den Skin „${name}“.`; });
  return (
    <div className="space-y-2">
      <button className={`btn w-full text-sm ${owned ? "btn-ghost" : ""}`} disabled={s.pending || owned} onClick={() => s.run(undefined)}>
        {owned ? "Aktiv" : price === 0 ? "Anlegen" : <>Anlegen für <span style={{ color: "var(--star)" }}>★ {price}</span></>}
      </button>
      <Notice error={s.error} ok={s.ok} />
    </div>
  );
}

export function BuyStarsButton({ packId, label, price, demo }: { packId: string; label: string; price: string; demo: boolean }) {
  const { refresh } = useAuth();
  const s = useSubmit(async () => {
    if (demo) { await demoAddStars(packId); await refresh(); return "Demo-Modus: Sterne gutgeschrieben. Mit Stripe läuft hier eine echte Zahlung."; }
    window.location.href = await createCheckout(packId);
  });
  return (
    <div className="space-y-2">
      <button className="btn w-full text-sm" disabled={s.pending} onClick={() => s.run(undefined)}>{label} · {price}</button>
      <Notice error={s.error} ok={s.ok} />
    </div>
  );
}
