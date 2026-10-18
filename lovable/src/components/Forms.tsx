import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { rememberInvite, useAuth } from "@/lib/auth";
import { messageOf, useT } from "@/lib/i18n";
import { addLink, addReply, boostChain, buySkin, convertEarnings, createCheckout, createInvite, demoAddStars, donateStars, followCreator, isFollowing, reportLink, requestPayout, startChain, unfollowCreator, uploadFrames, uploadImage, uploadVideo, type MediaFields } from "@/lib/api";
import { awaitVerdict, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, probeVideo } from "@/lib/moderation";
import type { Verdict } from "@/lib/types";

export function Notice({ error, ok, info }: { error?: string | null; ok?: string | null; info?: string | null }) {
  if (error) return <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p>;
  if (ok) return <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">{ok}</p>;
  if (info) return <p className="rounded-lg bg-white/10 px-3 py-2 text-sm"><span className="mr-2 inline-block animate-spin">◌</span>{info}</p>;
  return null;
}

/** Form helper: error, success, progress text and pending state. */
function useSubmit<T>(fn: (v: T, phase: (s: string) => void) => Promise<string | void>) {
  const { lang } = useT();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const run = async (v: T) => {
    setError(null); setOk(null); setInfo(null); setPending(true);
    try { const msg = await fn(v, setInfo); if (msg) setOk(msg); } catch (e) { setError(messageOf(lang, e)); } finally { setPending(false); setInfo(null); }
  };
  return { error, ok, info, pending, run };
}

const COLORS = ["#7c5cff", "#ff5cc8", "#ffd26b", "#50ffb4", "#5cc8ff", "#ff6b4a"];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const { t } = useT();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="muted text-xs">{t("color_of_link")}</span>
      {COLORS.map((col) => (
        <button key={col} type="button" onClick={() => onChange(col)} aria-label={col}
          className="h-6 w-6 rounded-full border-2" style={{ background: col, borderColor: value === col ? "white" : "transparent" }} />
      ))}
    </div>
  );
}

/** Picked media plus, for videos, the frames used by the safety check. */
type Media = { file: File; frames: Blob[] } | null;

function MediaPicker({ media, onChange }: { media: Media; onChange: (m: Media) => void }) {
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isVideo = media?.file.type.startsWith("video/");
  const pick = async (file: File | null) => {
    setError(null);
    if (!file) return onChange(null);
    if (file.type.startsWith("video/")) {
      if (file.size > MAX_VIDEO_BYTES) return setError(t("err_video_big"));
      setBusy(true);
      try { const { frames } = await probeVideo(file); onChange({ file, frames }); }
      catch (e) { setError((e as Error).message === "video_long" ? t("err_video_long", { n: MAX_VIDEO_SECONDS }) : t("err_video_read")); onChange(null); }
      finally { setBusy(false); }
    } else {
      if (file.size > MAX_IMAGE_BYTES) return setError(t("err_image_big"));
      onChange({ file, frames: [] });
    }
  };
  return (
    <div className="space-y-2">
      <label className="input flex cursor-pointer items-center gap-3 text-sm">
        <span className="muted">{busy ? t("checking_content") : media ? `${isVideo ? "🎬" : "🖼"} ${media.file.name}` : t("media_pick")}</span>
        <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => { void pick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        {media && <button type="button" className="muted ml-auto text-xs" onClick={() => onChange(null)}>{t("remove")}</button>}
      </label>
      {media && isVideo && <video src={URL.createObjectURL(media.file)} className="max-h-48 w-full rounded-lg bg-black" controls muted />}
      {media && !isVideo && <img src={URL.createObjectURL(media.file)} alt="" className="max-h-48 rounded-lg" />}
      <Notice error={error} />
    </div>
  );
}

async function uploadMedia(userId: string, media: Media): Promise<MediaFields> {
  if (!media) return { image_url: null, video_url: null, video_frames: null };
  if (media.file.type.startsWith("video/")) {
    const [video_url, video_frames] = await Promise.all([uploadVideo(userId, media.file), uploadFrames(userId, media.frames)]);
    return { image_url: null, video_url, video_frames };
  }
  return { image_url: await uploadImage(userId, media.file), video_url: null, video_frames: null };
}

/** Waits for the safety check and turns the verdict into a message for the author. */
async function verdictMessage(kind: "link" | "reply", id: number, t: (k: string, v?: Record<string, string | number>) => string, phase: (s: string) => void): Promise<string> {
  phase(t("checking_content"));
  const v: Verdict = await awaitVerdict(kind, id);
  if (v.status === "sichtbar") return kind === "link" ? t("published_ok") : t("reply_ok");
  if (v.status === "gesperrt") throw new Error(t(kind === "link" ? "blocked_reason" : "reply_blocked", { reason: v.note?.replace(/^[^:]*: /, "") ?? "" }));
  return t("still_checking");
}

export function RegisterForm({ invite, next }: { invite?: string; next?: string }) {
  const nav = useNavigate();
  const { t } = useT();
  const [f, setF] = useState({ display_name: "", username: "", email: "", password: "" });
  const [rules, setRules] = useState(false);
  const s = useSubmit(async () => {
    if (!rules) throw new Error("err_accept_rules");
    if (!/^[a-z0-9_]{3,20}$/.test(f.username)) throw new Error("err_username");
    if (f.password.length < 8) throw new Error("err_password");
    const { data: taken } = await supabase.from("profiles").select("id").eq("username", f.username).maybeSingle();
    if (taken) throw new Error("err_username_taken");
    if (invite) rememberInvite(invite);
    const { data, error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: { data: { username: f.username, display_name: f.display_name }, emailRedirectTo: window.location.origin + (next || "/") },
    });
    if (error) throw error;
    if (!data.session) return t("signup_pending");
    nav(next || `/p/${f.username}`);
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <input className="input" placeholder={t("display_name_ph")} maxLength={40} required value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} />
      <input className="input" placeholder={t("username_ph")} required value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} />
      <input className="input" type="email" placeholder={t("email")} required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input className="input" type="password" placeholder={t("password_ph")} minLength={8} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} className="mt-0.5" />
        <span className="muted">{t("accept_rules_1")} <Link to="/rules" target="_blank" className="underline">{t("rules")}</Link>: {t("accept_rules_2")}</span>
      </label>
      <Notice error={s.error} ok={s.ok} />
      <button className="btn w-full" disabled={s.pending}>{s.pending ? t("creating_planet") : t("create_planet")}</button>
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const nav = useNavigate();
  const { t } = useT();
  const [f, setF] = useState({ email: "", password: "" });
  const s = useSubmit(async () => {
    const { error } = await supabase.auth.signInWithPassword(f);
    if (error) throw new Error("err_login");
    nav(next || "/");
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <input className="input" type="email" placeholder={t("email")} required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input className="input" type="password" placeholder={t("password")} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
      <Notice error={s.error} />
      <button className="btn w-full" disabled={s.pending}>{s.pending ? t("moment") : t("login")}</button>
    </form>
  );
}

const TOPIC_DAYS = [1, 3, 7, 14];

export function StartChainForm({ topic: topicDefault = false }: { topic?: boolean }) {
  const nav = useNavigate();
  const { t } = useT();
  const { session } = useAuth();
  const [title, setTitle] = useState(""); const [text, setText] = useState("");
  const [color, setColor] = useState(COLORS[0]); const [media, setMedia] = useState<Media>(null);
  const [topic, setTopic] = useState(topicDefault); const [description, setDescription] = useState(""); const [days, setDays] = useState(3);
  const s = useSubmit(async (_: undefined, phase) => {
    if (!session) throw new Error("err_login_first");
    phase(t("uploading"));
    const files = await uploadMedia(session.user.id, media);
    const { chainId, linkId } = await startChain({ title: title.trim(), text: text.trim(), ...files, color, description: topic ? description.trim() : "", is_topic: topic, days });
    let notice: string | null = null;
    try { notice = linkId ? await verdictMessage("link", linkId, t, phase) : null; } catch (e) { notice = (e as Error).message; }
    nav(`/c/${chainId}`, { state: { notice } });
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <input className="input text-lg font-semibold" placeholder={t("chain_title_ph")} maxLength={80} minLength={2} required value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="card flex cursor-pointer items-start gap-3 p-3 text-sm" style={{ borderColor: topic ? "#ff5cc8" : undefined }}>
        <input type="checkbox" className="mt-1" checked={topic} onChange={(e) => setTopic(e.target.checked)} />
        <span><span className="font-semibold">✦ {t("topic_toggle")}</span><br /><span className="muted text-xs">{t("topic_hint")}</span></span>
      </label>
      {topic && (
        <>
          <textarea className="input min-h-20" placeholder={t("topic_desc_ph")} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="muted text-xs">{t("topic_days")}</span>
            {TOPIC_DAYS.map((d) => (
              <button key={d} type="button" onClick={() => setDays(d)} className={`btn btn-ghost text-xs ${days === d ? "border-white/60" : ""}`}>{t("n_days", { n: d })}</button>
            ))}
          </div>
        </>
      )}
      <textarea className="input min-h-28" placeholder={t("first_link_ph")} maxLength={500} required value={text} onChange={(e) => setText(e.target.value)} />
      <MediaPicker media={media} onChange={setMedia} />
      <ColorPicker value={color} onChange={setColor} />
      <Notice error={s.error} info={s.info} />
      <button className="btn w-full" disabled={s.pending}>{s.pending ? t("chain_sending") : topic ? t("start_topic") : t("send_chain")}</button>
    </form>
  );
}

export function AppendLinkForm({ chainId, onDone }: { chainId: number; onDone: () => void }) {
  const { t } = useT();
  const { session, refresh } = useAuth();
  const [text, setText] = useState(""); const [color, setColor] = useState(COLORS[0]); const [media, setMedia] = useState<Media>(null);
  const s = useSubmit(async (_: undefined, phase) => {
    if (!session) throw new Error("err_login_first");
    phase(t("uploading"));
    const files = await uploadMedia(session.user.id, media);
    const id = await addLink({ chain_id: chainId, text: text.trim(), ...files, color });
    setText(""); setMedia(null);
    try { return await verdictMessage("link", id, t, phase); } finally { await refresh(); onDone(); }
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <textarea className="input min-h-24" placeholder={t("your_link_ph")} maxLength={500} required value={text} onChange={(e) => setText(e.target.value)} />
      <MediaPicker media={media} onChange={setMedia} />
      <ColorPicker value={color} onChange={setColor} />
      <Notice error={s.error} ok={s.ok} info={s.info} />
      <button className="btn w-full" disabled={s.pending}>{s.pending ? t("attaching") : t("attach_link")}</button>
    </form>
  );
}

export function ReplyForm({ linkId, onDone, onCancel }: { linkId: number; onDone: () => void; onCancel: () => void }) {
  const { t } = useT();
  const { session } = useAuth();
  const [text, setText] = useState("");
  const s = useSubmit(async (_: undefined, phase) => {
    if (!session) throw new Error("err_login_first");
    const id = await addReply(linkId, text.trim());
    setText("");
    try { return await verdictMessage("reply", id, t, phase); } finally { onDone(); }
  });
  if (!session) return <p className="muted text-xs">{t("login_to_reply")}</p>;
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <textarea className="input min-h-16 text-sm" placeholder={t("write_reply")} maxLength={300} required autoFocus value={text} onChange={(e) => setText(e.target.value)} />
      <Notice error={s.error} ok={s.ok} info={s.info} />
      <div className="flex gap-2">
        <button className="btn text-xs" disabled={s.pending}>{s.pending ? t("moment") : t("send")}</button>
        <button type="button" className="btn btn-ghost text-xs" onClick={onCancel}>{t("cancel")}</button>
      </div>
    </form>
  );
}

export function BoostButton({ chainId, cost, onDone }: { chainId: number; cost: number; onDone: () => void }) {
  const { t } = useT();
  const { refresh } = useAuth();
  const s = useSubmit(async () => { await boostChain(chainId); await refresh(); onDone(); return t("boost_done"); });
  return (
    <div className="space-y-2">
      <button className="btn btn-ghost w-full" disabled={s.pending} onClick={() => s.run(undefined)}>
        {t("boost_chain")} <span style={{ color: "var(--star)" }}>★ {cost}</span>
      </button>
      <Notice error={s.error} ok={s.ok} />
    </div>
  );
}

export function InviteButton({ chainId }: { chainId: number }) {
  const { t } = useT();
  const { session } = useAuth();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const s = useSubmit(async () => {
    if (!session) throw new Error("err_login_first");
    setLink(`${window.location.origin}/invite/${await createInvite(chainId, session.user.id)}`);
  });
  return (
    <div className="space-y-2">
      {!link ? (
        <button type="button" className="btn w-full" disabled={s.pending} onClick={() => s.run(undefined)}>
          {s.pending ? t("creating_link") : t("invite_btn")}
        </button>
      ) : (
        <div className="space-y-2">
          <input className="input text-xs" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <div className="flex gap-2">
            <button type="button" className="btn flex-1 text-sm" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? t("copied") : t("copy_link")}
            </button>
            {"share" in navigator && (
              <button type="button" className="btn btn-ghost flex-1 text-sm" onClick={() => navigator.share({ url: link, title: t("share_title") }).catch(() => {})}>{t("share")}</button>
            )}
          </div>
          <p className="muted text-xs">{t("invite_hint")}</p>
        </div>
      )}
      <Notice error={s.error} />
    </div>
  );
}

export function BuySkinButton({ skin, price, owned, name }: { skin: string; price: number; owned: boolean; name: string }) {
  const { t } = useT();
  const { refresh } = useAuth();
  const s = useSubmit(async () => { await buySkin(skin); await refresh(); return t("skin_applied", { name }); });
  return (
    <div className="space-y-2">
      <button className={`btn w-full text-sm ${owned ? "btn-ghost" : ""}`} disabled={s.pending || owned} onClick={() => s.run(undefined)}>
        {owned ? t("active") : price === 0 ? t("apply") : <>{t("apply_for")} <span style={{ color: "var(--star)" }}>★ {price}</span></>}
      </button>
      <Notice error={s.error} ok={s.ok} />
    </div>
  );
}

export function BuyStarsButton({ packId, label, price, demo }: { packId: string; label: string; price: string; demo: boolean }) {
  const { t } = useT();
  const { refresh } = useAuth();
  const s = useSubmit(async () => {
    if (demo) { await demoAddStars(packId); await refresh(); return t("demo_stars_added"); }
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
  const { t } = useT();
  const { session } = useAuth();
  const [following, setFollowing] = useState<boolean | null>(null);
  useEffect(() => { if (session) isFollowing(session.user.id, creatorId).then(setFollowing); }, [session, creatorId]);
  const s = useSubmit(async () => {
    if (!session) throw new Error("err_login_first");
    if (following) await unfollowCreator(creatorId); else await followCreator(creatorId);
    setFollowing(!following); onChange?.();
  });
  if (!session || session.user.id === creatorId) return null;
  return (
    <div>
      <button className={`btn text-sm ${following ? "btn-ghost" : ""}`} disabled={s.pending || following === null} onClick={() => s.run(undefined)}>
        {following ? t("following") : t("follow")}
      </button>
      <Notice error={s.error} />
    </div>
  );
}

const DONATION_AMOUNTS = [10, 25, 50, 100];

export function DonateForm({ chainId, creatorName, share, onDone }: { chainId: number; creatorName: string; share: number; onDone: () => void }) {
  const { t } = useT();
  const { profile, refresh } = useAuth();
  const [amount, setAmount] = useState(25);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const stars = custom ? Number(custom) : amount;
  const s = useSubmit(async () => {
    if (!Number.isInteger(stars) || stars < 1) throw new Error("err_amount");
    await donateStars(chainId, stars, message.trim());
    setMessage(""); setCustom(""); await refresh(); onDone();
    return t("donate_thanks", { name: creatorName, n: Math.floor((stars * share) / 100) });
  });
  if (!profile) return <p className="muted text-sm">{t("login_to_donate")}</p>;
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <div className="flex flex-wrap gap-2">
        {DONATION_AMOUNTS.map((a) => (
          <button key={a} type="button" onClick={() => { setAmount(a); setCustom(""); }}
            className={`btn btn-ghost text-sm ${!custom && amount === a ? "border-white/50" : ""}`}>★ {a}</button>
        ))}
        <input className="input w-24 text-sm" type="number" min={1} placeholder="★" value={custom} onChange={(e) => setCustom(e.target.value)} />
      </div>
      <input className="input text-sm" placeholder={t("donate_msg_ph")} maxLength={200} value={message} onChange={(e) => setMessage(e.target.value)} />
      <p className="muted text-xs">{t("donate_split", { share, name: creatorName, platform: 100 - share, stars: profile.stars })}</p>
      <Notice error={s.error} ok={s.ok} />
      <button className="btn w-full text-sm" disabled={s.pending}>{s.pending ? t("donate_sending") : t("donate_btn", { n: stars || 0 })}</button>
    </form>
  );
}

export function ReportButton({ linkId }: { linkId: number }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const s = useSubmit(async () => { await reportLink(linkId, reason.trim() || t("report_default")); setOpen(false); return t("report_thanks"); });
  if (s.ok) return <span className="text-xs text-emerald-200">{s.ok}</span>;
  if (!open) return <button type="button" className="muted text-xs hover:text-white" onClick={() => setOpen(true)}>{t("report")}</button>;
  return (
    <form className="flex flex-wrap items-center justify-end gap-2" onSubmit={(e) => { e.preventDefault(); s.run(undefined); }}>
      <input className="input w-56 text-xs" placeholder={t("report_reason_ph")} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      <button className="btn text-xs" disabled={s.pending}>{t("send")}</button>
      <button type="button" className="btn btn-ghost text-xs" onClick={() => setOpen(false)}>{t("cancel")}</button>
      {s.error && <span className="w-full text-right text-xs text-red-200">{s.error}</span>}
    </form>
  );
}

export function money(cents: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function EarningsPanel({ min, cents, share }: { min: number; cents: number; share: number }) {
  const { t, locale } = useT();
  const { profile, refresh } = useAuth();
  const [conv, setConv] = useState("");
  const payout = useSubmit(async () => { await requestPayout(); await refresh(); return t("payout_requested"); });
  const convert = useSubmit(async () => { await convertEarnings(Number(conv)); setConv(""); await refresh(); return t("converted"); });
  if (!profile) return null;
  return (
    <div className="card space-y-3 p-4">
      <h2 className="font-semibold">{t("earnings")}</h2>
      <p className="text-2xl font-extrabold" style={{ color: "var(--star)" }}>★ {profile.earned_stars} <span className="muted text-sm font-normal">≈ {money(profile.earned_stars * cents, locale)}</span></p>
      <p className="muted text-xs">{t("earnings_text", { share, min, money: money(min * cents, locale) })}</p>
      <button className="btn w-full text-sm" disabled={payout.pending || profile.earned_stars < min} onClick={() => payout.run(undefined)}>{t("request_payout")}</button>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); convert.run(undefined); }}>
        <input className="input text-sm" type="number" min={1} max={profile.earned_stars} placeholder={t("use_stars_ph")} value={conv} onChange={(e) => setConv(e.target.value)} />
        <button className="btn btn-ghost text-sm" disabled={convert.pending || !conv}>{t("convert")}</button>
      </form>
      <Notice error={payout.error || convert.error} ok={payout.ok || convert.ok} />
    </div>
  );
}
