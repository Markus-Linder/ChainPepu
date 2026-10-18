import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { listReportedLinks, moderateLink } from "@/lib/api";
import { useAsync, Loading } from "@/lib/useAsync";

export default function Moderation() {
  const { profile, loading: authLoading } = useAuth();
  const { data, loading, reload } = useAsync(() => (profile?.is_moderator ? listReportedLinks() : Promise.resolve([])), [profile?.id]);
  if (authLoading) return <Loading />;
  if (!profile) return <Navigate to="/login?next=/moderation" replace />;
  if (!profile.is_moderator) return <p className="muted py-10 text-center">Nur für Moderation.</p>;
  const act = async (id: number, status: "sichtbar" | "gesperrt") => { await moderateLink(id, status); reload(); };
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Moderation</h1>
      <p className="muted text-sm">Gemeldete und gesperrte Glieder. Freigeben löscht die Meldungen, Sperren informiert den Autor.</p>
      {loading ? <Loading /> : data && data.length === 0 ? <p className="muted">Alles ruhig. Nichts zu prüfen.</p> : (
        <ul className="space-y-3">
          {data?.map((l) => (
            <li key={l.id} className="card space-y-2 p-4 text-sm" style={{ borderLeft: `4px solid ${l.color}` }}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${l.status === "gesperrt" ? "bg-red-500/20 text-red-200" : "bg-yellow-500/20 text-yellow-200"}`}>{l.status}</span>
                <span>@{l.profiles.username}</span>
                <Link to={`/c/${l.chain_id}`} className="muted underline">„{l.chains?.title}“ #{l.position}</Link>
                <span className="muted ml-auto">{l.report_count} Meldungen</span>
              </div>
              <p className="whitespace-pre-wrap">{l.text}</p>
              {l.video_url && <video src={l.video_url} controls className="max-h-64 rounded-lg bg-black" />}
              {l.image_url && <img src={l.image_url} alt="" className="max-h-64 rounded-lg" />}
              {l.reports.length > 0 && <ul className="muted text-xs">{l.reports.map((r, i) => <li key={i}>• {r.reason}</li>)}</ul>}
              <div className="flex gap-2">
                <button className="btn text-xs" onClick={() => act(l.id, "sichtbar")}>Freigeben</button>
                {l.status !== "gesperrt" && <button className="btn btn-ghost text-xs" onClick={() => act(l.id, "gesperrt")}>Sperren</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
