import { useCallback, useEffect, useState } from "react";
import type { LinkRow } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { Planet } from "./Planet";

/** Full-screen player: shows the whole chain link by link, videos play automatically. */
export function ChainPlayer({ title, links, onClose }: { title: string; links: LinkRow[]; onClose: () => void }) {
  const { t } = useT();
  const [i, setI] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const next = useCallback(() => setI((v) => Math.min(links.length - 1, v + 1)), [links.length]);
  const prev = useCallback(() => setI((v) => Math.max(0, v - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [next, prev, onClose]);

  useEffect(() => {
    if (links[i]?.video_url) return;
    const timer = setTimeout(() => { if (i < links.length - 1) next(); }, 6000);
    return () => clearTimeout(timer);
  }, [i, links, next]);

  if (links.length === 0) return null;
  const l = links[i];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white"
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touchX === null) return; const d = e.changedTouches[0].clientX - touchX; if (d < -50) next(); else if (d > 50) prev(); setTouchX(null); }}>
      <div className="flex gap-1 p-3">
        {links.map((x, k) => <div key={x.id} className="h-1 flex-1 rounded-full" style={{ background: k <= i ? l.color : "rgba(255,255,255,.25)" }} />)}
      </div>
      <div className="flex items-center gap-3 px-4">
        <Planet seed={l.profiles.planet_seed} skin={l.profiles.planet_skin} size={36} />
        <div className="text-sm"><span className="font-semibold">{l.profiles.display_name}</span> <span className="opacity-60">@{l.profiles.username} · #{l.position}</span></div>
        <div className="ml-auto truncate text-xs opacity-60">{title}</div>
        <button onClick={onClose} aria-label={t("close")} className="ml-2 rounded-full bg-white/10 px-3 py-1 text-sm">✕</button>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        {l.video_url ? (
          <video key={l.id} src={l.video_url} className="max-h-full max-w-full rounded-xl" autoPlay playsInline controls onEnded={() => { if (i < links.length - 1) next(); }} />
        ) : l.image_url ? (
          <img key={l.id} src={l.image_url} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
        ) : (
          <p className="max-w-xl text-center text-2xl font-semibold leading-snug sm:text-3xl" style={{ textShadow: `0 0 30px ${l.color}` }}>{l.text}</p>
        )}
        <button onClick={prev} aria-label={t("back")} className="absolute inset-y-0 left-0 w-1/4" />
        <button onClick={next} aria-label={t("next")} className="absolute inset-y-0 right-0 w-1/4" />
      </div>
      {(l.video_url || l.image_url) && <p className="px-6 pb-4 text-center text-sm opacity-90">{l.text}</p>}
      <div className="flex items-center justify-between px-4 pb-4 text-xs opacity-60">
        <span>{i + 1} / {links.length}</span>
        <span>{t("player_hint")}</span>
      </div>
    </div>
  );
}
