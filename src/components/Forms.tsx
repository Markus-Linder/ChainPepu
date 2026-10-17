"use client";

import { useActionState, useState, useTransition } from "react";
import {
  appendLinkAction,
  boostChainAction,
  buySkinAction,
  buyStarsAction,
  createInviteAction,
  loginAction,
  registerAction,
  startChainAction,
  type ActionState,
} from "@/lib/actions";

function Notice({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error) return <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{state.error}</p>;
  if (state.ok) return <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">{state.ok}</p>;
  return null;
}

const COLORS = ["#7c5cff", "#ff5cc8", "#ffd26b", "#50ffb4", "#5cc8ff", "#ff6b4a"];

function ColorPicker({ name }: { name: string }) {
  const [c, setC] = useState(COLORS[0]);
  return (
    <div className="flex items-center gap-2">
      <span className="muted text-xs">Farbe deines Glieds</span>
      {COLORS.map((col) => (
        <button key={col} type="button" onClick={() => setC(col)} aria-label={col}
          className="h-6 w-6 rounded-full border-2" style={{ background: col, borderColor: c === col ? "white" : "transparent" }} />
      ))}
      <input type="hidden" name={name} value={c} />
    </div>
  );
}

export function RegisterForm({ invite, next }: { invite?: string; next?: string }) {
  const [state, action, pending] = useActionState(registerAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="invite" value={invite ?? ""} />
      <input type="hidden" name="next" value={next ?? ""} />
      <input className="input" name="display_name" placeholder="Wie sollen dich alle nennen?" maxLength={40} required />
      <input className="input" name="username" placeholder="nutzername (nur a-z, 0-9, _)" pattern="[a-z0-9_]{3,20}" required />
      <input className="input" name="password" type="password" placeholder="Passwort (mind. 8 Zeichen)" minLength={8} required />
      <Notice state={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Planet entsteht…" : "Meinen Planeten erschaffen"}</button>
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next ?? ""} />
      <input className="input" name="username" placeholder="nutzername" required />
      <input className="input" name="password" type="password" placeholder="Passwort" required />
      <Notice state={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Moment…" : "Anmelden"}</button>
    </form>
  );
}

export function StartChainForm() {
  const [state, action, pending] = useActionState(startChainAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input className="input text-lg font-semibold" name="title" placeholder="Titel der Kette, z. B. „Zeig dein Frühstück“" maxLength={80} required />
      <textarea className="input min-h-28" name="text" placeholder="Dein erstes Glied. Ein Satz, ein Gedanke, eine Frage, ein Aufruf…" maxLength={500} required />
      <input className="input" name="image_url" placeholder="Optional: Bild-Link (https://…)" />
      <ColorPicker name="color" />
      <Notice state={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Kette entsteht…" : "Kette ins Universum schicken"}</button>
    </form>
  );
}

export function AppendLinkForm({ chainId }: { chainId: number }) {
  const [state, action, pending] = useActionState(appendLinkAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="chain_id" value={chainId} />
      <textarea className="input min-h-24" name="text" placeholder="Dein Glied an dieser Kette…" maxLength={500} required />
      <input className="input" name="image_url" placeholder="Optional: Bild-Link (https://…)" />
      <ColorPicker name="color" />
      <Notice state={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Wird angehängt…" : "Glied anhängen"}</button>
    </form>
  );
}

export function BoostForm({ chainId, cost }: { chainId: number; cost: number }) {
  const [state, action, pending] = useActionState(boostChainAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="chain_id" value={chainId} />
      <button className="btn btn-ghost w-full" disabled={pending}>
        ⚡ Kette boosten <span style={{ color: "var(--star)" }}>★ {cost}</span>
      </button>
      <Notice state={state} />
    </form>
  );
}

export function InviteButton({ chainId, appUrl }: { chainId: number; appUrl: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      {!link ? (
        <button type="button" className="btn w-full" disabled={pending}
          onClick={() => start(async () => setLink(`${appUrl}/einladung/${await createInviteAction(chainId)}`))}>
          {pending ? "Link entsteht…" : "Jemanden als nächstes Glied einladen"}
        </button>
      ) : (
        <div className="space-y-2">
          <input className="input text-xs" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <div className="flex gap-2">
            <button type="button" className="btn flex-1 text-sm"
              onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? "Kopiert ✓" : "Link kopieren"}
            </button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button type="button" className="btn btn-ghost flex-1 text-sm" onClick={() => navigator.share({ url: link, title: "Häng dich an meine Kette" }).catch(() => {})}>
                Teilen
              </button>
            )}
          </div>
          <p className="muted text-xs">Wer über diesen Link einen Planeten erstellt, landet direkt in dieser Kette. Du bekommst 10 Sterne.</p>
        </div>
      )}
    </div>
  );
}

export function BuySkinForm({ skin, price, owned }: { skin: string; price: number; owned: boolean }) {
  const [state, action, pending] = useActionState(buySkinAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="skin" value={skin} />
      <button className={`btn w-full text-sm ${owned ? "btn-ghost" : ""}`} disabled={pending || owned}>
        {owned ? "Aktiv" : price === 0 ? "Anlegen" : <>Anlegen für <span style={{ color: "var(--star)" }}>★ {price}</span></>}
      </button>
      <Notice state={state} />
    </form>
  );
}

export function BuyStarsForm({ packId, label, price }: { packId: string; label: string; price: string }) {
  const [state, action, pending] = useActionState(buyStarsAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="pack" value={packId} />
      <button className="btn w-full text-sm" disabled={pending}>{label} · {price}</button>
      <Notice state={state} />
    </form>
  );
}
