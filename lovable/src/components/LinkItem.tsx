import { useState } from "react";
import { Link } from "react-router-dom";
import type { LinkRow, Reply } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Planet } from "./Planet";
import { ReplyForm, ReportButton } from "./Forms";

export function StatusBadge({ status }: { status: LinkRow["status"] }) {
  const { t } = useT();
  if (status === "sichtbar") return null;
  const cls = status === "gesperrt" ? "bg-red-500/20 text-red-200" : status === "pruefung" ? "bg-sky-500/20 text-sky-200" : "bg-yellow-500/20 text-yellow-200";
  const label = status === "gesperrt" ? t("status_blocked") : status === "pruefung" ? t("status_pending") : t("status_reported");
  return <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${cls}`}>{label}</span>;
}

/** One link of a chain, with the conversation (replies) underneath. */
export function LinkItem({ link, isOrigin, replies = [], onChanged }: { link: LinkRow; isOrigin: boolean; replies?: Reply[]; onChanged?: () => void }) {
  const { t } = useT();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const p = link.profiles;
  const hidden = link.status !== "sichtbar";
  const visibleReplies = showAll ? replies : replies.slice(-3);
  return (
    <li className="relative pl-14">
      <span className="absolute left-5 top-7 h-[calc(100%+1rem)] w-0.5 bg-white/10" aria-hidden />
      <Link to={`/p/${p.username}`} className="absolute left-0 top-0">
        <Planet seed={p.planet_seed} skin={p.planet_skin} size={42} title={p.display_name} />
      </Link>
      <div className={`card p-4 ${hidden ? "opacity-70" : ""}`} style={{ borderLeft: `4px solid ${link.color}` }}>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
          <Link to={`/p/${p.username}`} className="font-semibold hover:underline">{p.display_name}</Link>
          <span className="muted">@{p.username}</span>
          {isOrigin && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">{t("origin_badge")}</span>}
          <StatusBadge status={link.status} />
          <span className="muted ml-auto">#{link.position}</span>
        </div>
        <p className="whitespace-pre-wrap">{link.text}</p>
        {link.status === "gesperrt" && link.moderation_note && <p className="mt-1 text-xs text-red-200">{link.moderation_note.replace(/^[^:]*: /, "")}</p>}
        {link.video_url && <video src={link.video_url} controls playsInline preload="metadata" className="mt-3 max-h-[28rem] w-full rounded-lg bg-black" />}
        {link.image_url && <img src={link.image_url} alt="" className="mt-3 max-h-96 rounded-lg object-cover" loading="lazy" />}

        {!hidden && (
          <div className="mt-3 space-y-2 border-t border-white/10 pt-2">
            {replies.length > 3 && !showAll && (
              <button type="button" className="muted text-xs hover:text-white" onClick={() => setShowAll(true)}>{t("n_replies", { n: replies.length })} ↓</button>
            )}
            {visibleReplies.map((r) => (
              <div key={r.id} className={`flex items-start gap-2 text-sm ${r.status !== "sichtbar" ? "opacity-60" : ""}`}>
                <Link to={`/p/${r.profiles.username}`} className="mt-0.5 shrink-0"><Planet seed={r.profiles.planet_seed} skin={r.profiles.planet_skin} size={22} title={r.profiles.display_name} /></Link>
                <div className="min-w-0 flex-1 rounded-lg bg-white/5 px-3 py-1.5">
                  <span className="mr-2 text-xs font-semibold">{r.profiles.display_name}</span>
                  <StatusBadge status={r.status} />
                  <p className="whitespace-pre-wrap break-words">{r.text}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between gap-2">
              {profile ? (
                open ? null : <button type="button" className="muted text-xs hover:text-white" onClick={() => setOpen(true)}>💬 {t("reply")}</button>
              ) : <span className="muted text-xs">{t("login_to_reply")}</span>}
              {profile && profile.id !== link.user_id && <ReportButton linkId={link.id} />}
            </div>
            {open && <ReplyForm linkId={link.id} onDone={() => { onChanged?.(); }} onCancel={() => setOpen(false)} />}
          </div>
        )}
      </div>
    </li>
  );
}
