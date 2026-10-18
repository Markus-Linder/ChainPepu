import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { donateStars, listStream } from "@/lib/api";
import { displayTitle } from "@/lib/events";
import { messageOf, useT } from "@/lib/i18n";
import type { LinkRow } from "@/lib/types";
import { Planet } from "@/components/Planet";
import { ReplyForm } from "@/components/Forms";
import { EmbedPlayer } from "@/components/EmbedPlayer";
import { Icon } from "@/components/Icons";

/** The stream: swipe through the universe one link at a time. Videos play when in view. */
export default function Stream() {
  const { t } = useT();
  const [items, setItems] = useState<LinkRow[]>([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const before = items.length ? items[items.length - 1].created_at : null;
      const next = await listStream(before, 10);
      setItems((cur) => [...cur, ...next.filter((n) => !cur.some((c) => c.id === n.id))]);
      if (next.length < 10) setDone(true);
    } catch { setDone(true); } finally { setLoading(false); }
  }, [items, loading, done]);

  useEffect(() => { if (items.length === 0) void loadMore(); }, [items.length, loadMore]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) void loadMore(); }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  return (
    <div className="-mx-4 -my-6 h-[calc(100dvh-7.5rem)] snap-y snap-mandatory overflow-y-auto sm:mx-auto sm:max-w-md sm:rounded-3xl sm:border sm:border-white/10">
      {items.map((l) => <StreamCard key={l.id} link={l} />)}
      <div ref={sentinel} className="snap-start flex h-24 items-center justify-center text-sm">
        {loading ? <span className="muted">{t("loading")}</span> : done && items.length === 0 ? <span className="muted">{t("stream_empty")}</span> : null}
      </div>
    </div>
  );
}

function StreamCard({ link }: { link: LinkRow }) {
  const { t, lang } = useT();
  const { profile, refresh } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [reply, setReply] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const p = link.profiles;
  const chainTitle = link.chains ? displayTitle({ title: link.chains.title, daily_day: link.chains.daily_day }, lang) : "";

  // Autoplay only while visible.
  useEffect(() => {
    const el = ref.current, v = video.current;
    if (!el || !v) return;
    const io = new IntersectionObserver((e) => { if (e[0].intersectionRatio > 0.6) v.play().catch(() => {}); else v.pause(); }, { threshold: [0, 0.6] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const star = async () => {
    if (!profile) { setMsg(t("login_to_donate")); return; }
    setBusy(true); setMsg(null);
    try { await donateStars(link.chain_id, 10, ""); await refresh(); setMsg(t("stream_sent")); }
    catch (e) { setMsg(messageOf(lang, e)); } finally { setBusy(false); }
  };
  const share = () => {
    const url = `${window.location.origin}/c/${link.chain_id}`;
    if (navigator.share) navigator.share({ url, title: chainTitle }).catch(() => {});
    else navigator.clipboard.writeText(url).then(() => setMsg(t("copied")));
  };

  return (
    <div ref={ref} className="relative flex h-full snap-start flex-col justify-end overflow-hidden bg-black" style={{ minHeight: "100%" }}>
      <div className="absolute inset-0">
        {link.video_url ? (
          <video ref={video} src={link.video_url} className="h-full w-full object-contain" loop muted playsInline preload="metadata" onClick={(e) => { const v = e.currentTarget; v.muted = !v.muted; }} />
        ) : link.image_url ? (
          <img src={link.image_url} alt="" className="h-full w-full object-contain" />
        ) : link.embed_url ? (
          <div className="flex h-full items-center justify-center p-4"><div className="w-full"><EmbedPlayer url={link.embed_url} /></div></div>
        ) : (
          <div className="flex h-full items-center justify-center p-8" style={{ background: `radial-gradient(60% 60% at 50% 40%, ${link.color}55, #06050d)` }}>
            <p className="text-center text-2xl font-semibold leading-snug sm:text-3xl" style={{ textShadow: `0 0 30px ${link.color}` }}>{link.text}</p>
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      <div className="relative flex items-end gap-3 p-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Link to={`/p/${p.username}`} className="flex items-center gap-2">
            <Planet seed={p.planet_seed} skin={p.planet_skin} level={p.level} size={34} />
            <span className="text-sm font-semibold">{p.display_name}</span>
            {p.level && p.level > 1 && <span className="rounded-full bg-white/10 px-1.5 text-[10px]">{t("level_short", { n: p.level })}</span>}
          </Link>
          <Link to={`/c/${link.chain_id}`} className="block text-sm"><span className="muted">{link.chains?.is_topic ? "✦ " : ""}{t("chain")}:</span> <span className="font-semibold underline">{chainTitle}</span> <span className="muted">#{link.position}</span></Link>
          {(link.video_url || link.image_url || link.embed_url) && <p className="line-clamp-3 text-sm">{link.text}</p>}
          {msg && <p className="text-xs text-emerald-200">{msg}</p>}
          {reply && <div className="rounded-xl bg-black/60 p-2 backdrop-blur"><ReplyForm linkId={link.id} onDone={() => setReply(false)} onCancel={() => setReply(false)} /></div>}
        </div>
        <div className="flex shrink-0 flex-col items-center gap-4 text-center text-[10px]">
          <button onClick={star} disabled={busy} className="flex flex-col items-center gap-1" style={{ color: "var(--star)" }}><span className="rounded-full bg-white/10 p-3"><Icon name="star" size={22} filled /></span>{t("stream_star")}</button>
          <button onClick={() => setReply((v) => !v)} className="flex flex-col items-center gap-1"><span className="rounded-full bg-white/10 p-3"><Icon name="reply" size={22} /></span>{t("reply")}</button>
          <Link to={`/new?from=${link.id}`} className="flex flex-col items-center gap-1"><span className="rounded-full bg-white/10 p-3 text-lg leading-none">⑂</span>{t("branch")}</Link>
          <button onClick={share} className="flex flex-col items-center gap-1"><span className="rounded-full bg-white/10 p-3"><Icon name="comet" size={22} /></span>{t("share")}</button>
        </div>
      </div>
    </div>
  );
}
