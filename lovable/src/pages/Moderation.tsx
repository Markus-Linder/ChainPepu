import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { listPendingReplies, listReportedLinks, moderateLink, moderateReply } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";

const STATUS_CLASS: Record<string, string> = { gesperrt: "bg-red-500/20 text-red-200", gemeldet: "bg-yellow-500/20 text-yellow-200", pruefung: "bg-sky-500/20 text-sky-200", sichtbar: "bg-emerald-500/20 text-emerald-200" };

export default function Moderation() {
  const { t } = useT();
  const { profile, loading: authLoading } = useAuth();
  const { data, loading, reload } = useAsync(async () => profile?.is_moderator ? { links: await listReportedLinks(), replies: await listPendingReplies() } : { links: [], replies: [] }, [profile?.id]);
  if (authLoading) return <Loading />;
  if (!profile) return <Navigate to="/login?next=/moderation" replace />;
  if (!profile.is_moderator) return <p className="muted py-10 text-center">{t("mod_only")}</p>;
  const actLink = async (id: number, status: "sichtbar" | "gesperrt") => { await moderateLink(id, status); reload(); };
  const actReply = async (id: number, status: "sichtbar" | "gesperrt") => { await moderateReply(id, status); reload(); };
  const empty = data && data.links.length === 0 && data.replies.length === 0;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">{t("mod_title")}</h1>
      <p className="muted text-sm">{t("mod_text")}</p>
      {loading ? <Loading /> : empty ? <p className="muted">{t("mod_quiet")}</p> : (
        <>
          <ul className="space-y-3">
            {data?.links.map((l) => (
              <li key={l.id} className="card space-y-2 p-4 text-sm" style={{ borderLeft: `4px solid ${l.color}` }}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 ${STATUS_CLASS[l.status]}`}>{t(`status_${l.status}`)}</span>
                  <span>@{l.profiles.username}</span>
                  <Link to={`/c/${l.chain_id}`} className="muted underline">“{l.chains?.title}” #{l.position}</Link>
                  <span className="muted ml-auto">{t("n_reports", { n: l.report_count })}</span>
                </div>
                <p className="whitespace-pre-wrap">{l.text}</p>
                {l.moderation_note && <p className="muted text-xs">{t("mod_note")} {l.moderation_note}</p>}
                {l.video_url && <video src={l.video_url} controls className="max-h-64 rounded-lg bg-black" />}
                {l.image_url && <img src={l.image_url} alt="" className="max-h-64 rounded-lg" />}
                {l.video_frames && l.video_frames.length > 0 && <div className="flex gap-1">{l.video_frames.map((f) => <img key={f} src={f} alt="" className="h-16 rounded" />)}</div>}
                {l.reports.length > 0 && <ul className="muted text-xs">{l.reports.map((r, i) => <li key={i}>• {r.reason}</li>)}</ul>}
                <div className="flex gap-2">
                  {l.status !== "sichtbar" && <button className="btn text-xs" onClick={() => actLink(l.id, "sichtbar")}>{t("approve")}</button>}
                  {l.status !== "gesperrt" && <button className="btn btn-ghost text-xs" onClick={() => actLink(l.id, "gesperrt")}>{t("block")}</button>}
                </div>
              </li>
            ))}
          </ul>
          {data && data.replies.length > 0 && (
            <>
              <h2 className="pt-4 text-lg font-bold">{t("mod_replies")}</h2>
              <ul className="space-y-2">
                {data.replies.map((r) => (
                  <li key={r.id} className="card space-y-2 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 ${STATUS_CLASS[r.status]}`}>{t(`status_${r.status}`)}</span>
                      <span>@{r.profiles.username}</span>
                      <Link to={`/c/${r.chain_id}`} className="muted underline">“{r.chains?.title}”</Link>
                    </div>
                    <p className="whitespace-pre-wrap">{r.text}</p>
                    {r.moderation_note && <p className="muted text-xs">{t("mod_note")} {r.moderation_note}</p>}
                    <div className="flex gap-2">
                      {r.status !== "sichtbar" && <button className="btn text-xs" onClick={() => actReply(r.id, "sichtbar")}>{t("approve")}</button>}
                      {r.status !== "gesperrt" && <button className="btn btn-ghost text-xs" onClick={() => actReply(r.id, "gesperrt")}>{t("block")}</button>}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
