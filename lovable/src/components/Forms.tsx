import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { rememberInvite, useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { addLinkWithMedia, boostChain, buySkin, convertEarnings, createCheckout, createInvite, demoAddStars, donateStars, followCreator, isFollowing, reportLink, requestPayout, startChainWithMedia, unfollowCreator, uploadMedia } from "@/lib/api";
import { useEffect } from "react";

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

function MediaPicker({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const isVideo = file?.type.startsWith("video/");
  return (
    <div className="space-y-2">
      <label className="input flex cursor-pointer items-center gap-3 text-sm">
        <span className="muted">{file ? `${isVideo ? "🎬" : "🖼"} ${file.name}` : "Optional: Bild (max. 8 MB) oder Video (max. 100 MB) auswählen"}</span>
        <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        {file && <button type="button" className="muted ml-auto text-xs" onClick={() => onChange(null)}>entfernen</button>}
      </label>
      {file && isVideo && <video src={URL.createObjectURL(file)} className="max-h-48 w-full rounded-lg bg-black" controls muted />}
    </div>
  );
}

export function RegisterForm({ invite, next }: { invite?: string; next?: string }) {
  const nav = useNavigate();
  const [f, setF] = useState({ display_name: "", username: "", email: "", password: "" });
  const [rules, setRules] = useState(false);
  const s = useSubmit(async () => {
    if (!rules) throw new Error("Bitte bestätige die Regeln von ChainPepu.");
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
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} className="mt-0.5" />
        <span className="muted">Ich akzeptiere die <Link to="/regeln" target="_blank" className="underline">Regeln</Link>: keine Gewalt, kein Hass, keine Belästigung, keine illegalen Inhalte.</span>
      </label>
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
    const media = await uploadMedia(session.user.id, file);
    const id = await startChainWithMedia({ title: title.trim(), text: text.trim(), ...media, color });
    nav(`/c/${id}`);
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <input className="input text-lg font-semibold" placeholder="Titel der Kette, z. B. „Zeig dein Frühstück“" maxLength={80} minLength={2} required value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input min-h-28" placeholder="Dein erstes Glied. Ein Satz, ein Gedanke, eine Frage, ein Aufruf…" maxLength={500} required value={text} onChange={(e) => setText(e.target.value)} />
      <MediaPicker file={file} onChange={setFile} />
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
    const media = await uploadMedia(session.user.id, file);
    await addLinkWithMedia({ chain_id: chainId, text: text.trim(), ...media, color });
    setText(""); setFile(null); await refresh(); onDone();
    return "Dein Glied hängt jetzt an der Kette.";
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <textarea className="input min-h-24" placeholder="Dein Glied an dieser Kette…" maxLength={500} required value={text} onChange={(e) => setText(e.target.value)} />
      <MediaPicker file={file} onChange={setFile} />
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

export function FollowButton({ creatorId, onChange }: { creatorId: string; onChange?: () => void }) {
  const { session } = useAuth();
  const [following, setFollowing] = useState<boolean | null>(null);
  useEffect(() => { if (session) isFollowing(session.user.id, creatorId).then(setFollowing); }, [session, creatorId]);
  const s = useSubmit(async () => {
    if (!session) throw new Error("Bitte zuerst anmelden.");
    if (following) await unfollowCreator(creatorId); else await followCreator(creatorId);
    setFollowing(!following); onChange?.();
  });
  if (!session || session.user.id === creatorId) return null;
  return (
    <div>
      <button className={`btn text-sm ${following ? "btn-ghost" : ""}`} disabled={s.pending || following === null} onClick={() => s.run(undefined)}>
        {following ? "✓ Du folgst" : "+ Folgen"}
      </button>
      <Notice error={s.error} />
    </div>
  );
}

const DONATION_AMOUNTS = [10, 25, 50, 100];

export function DonateForm({ chainId, creatorName, share, onDone }: { chainId: number; creatorName: string; share: number; onDone: () => void }) {
  const { profile, refresh } = useAuth();
  const [amount, setAmount] = useState(25);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const stars = custom ? Number(custom) : amount;
  const s = useSubmit(async () => {
    if (!Number.isInteger(stars) || stars < 1) throw new Error("Bitte einen gültigen Betrag wählen.");
    await donateStars(chainId, stars, message.trim());
    setMessage(""); setCustom(""); await refresh(); onDone();
    return `Danke! ${creatorName} erhält ${Math.floor((stars * share) / 100)} Sterne.`;
  });
  if (!profile) return <p className="muted text-sm">Melde dich an, um zu spenden.</p>;
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <div className="flex flex-wrap gap-2">
        {DONATION_AMOUNTS.map((a) => (
          <button key={a} type="button" onClick={() => { setAmount(a); setCustom(""); }}
            className={`btn btn-ghost text-sm ${!custom && amount === a ? "border-white/50" : ""}`}>★ {a}</button>
        ))}
        <input className="input w-24 text-sm" type="number" min={1} placeholder="Betrag" value={custom} onChange={(e) => setCustom(e.target.value)} />
      </div>
      <input className="input text-sm" placeholder="Optional: Nachricht an den Creator" maxLength={200} value={message} onChange={(e) => setMessage(e.target.value)} />
      <p className="muted text-xs">{share} % gehen an {creatorName}, {100 - share} % an die Plattform. Du hast ★ {profile.stars}.</p>
      <Notice error={s.error} ok={s.ok} />
      <button className="btn w-full text-sm" disabled={s.pending}>{s.pending ? "Wird gesendet…" : `★ ${stars || 0} spenden`}</button>
    </form>
  );
}

export function ReportButton({ linkId }: { linkId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const s = useSubmit(async () => { await reportLink(linkId, reason.trim() || "Regelverstoß"); setOpen(false); return "Danke, wir prüfen das."; });
  if (s.ok) return <span className="text-xs text-emerald-200">{s.ok}</span>;
  if (!open) return <button type="button" className="muted text-xs hover:text-white" onClick={() => setOpen(true)}>Melden</button>;
  return (
    <form className="flex flex-wrap items-center justify-end gap-2" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <input className="input w-56 text-xs" placeholder="Grund (z. B. Hass, Spam, Gewalt)" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      <button className="btn text-xs" disabled={s.pending}>Senden</button>
      <button type="button" className="btn btn-ghost text-xs" onClick={() => setOpen(false)}>Abbrechen</button>
      {s.error && <span className="w-full text-right text-xs text-red-200">{s.error}</span>}
    </form>
  );
}

export function EarningsPanel({ min, cents, share }: { min: number; cents: number; share: number }) {
  const { profile, refresh } = useAuth();
  const [conv, setConv] = useState("");
  const payout = useSubmit(async () => { await requestPayout(); await refresh(); return "Auszahlung angefordert. Du bekommst eine Nachricht, sobald sie überwiesen ist."; });
  const convert = useSubmit(async () => { await convertEarnings(Number(conv)); setConv(""); await refresh(); return "Umgewandelt."; });
  if (!profile) return null;
  const euro = ((profile.earned_stars * cents) / 100).toFixed(2).replace(".", ",");
  return (
    <div className="card space-y-3 p-4">
      <h2 className="font-semibold">Deine Einnahmen</h2>
      <p className="text-2xl font-extrabold" style={{ color: "var(--star)" }}>★ {profile.earned_stars} <span className="muted text-sm font-normal">≈ {euro} €</span></p>
      <p className="muted text-xs">Von jeder Spende bekommst du {share} %. Auszahlung ab ★ {min} ({((min * cents) / 100).toFixed(2).replace(".", ",")} €). Oder du nutzt die Sterne selbst.</p>
      <div className="flex gap-2">
        <button className="btn flex-1 text-sm" disabled={payout.pending || profile.earned_stars < min} onClick={() => payout.run(undefined)}>Auszahlung anfordern</button>
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); convert.run(undefined); }}>
        <input className="input text-sm" type="number" min={1} max={profile.earned_stars} placeholder="Sterne selbst nutzen" value={conv} onChange={(e) => setConv(e.target.value)} />
        <button className="btn btn-ghost text-sm" disabled={convert.pending || !conv}>Umwandeln</button>
      </form>
      <Notice error={payout.error || convert.error} ok={payout.ok || convert.ok} />
    </div>
  );
}
