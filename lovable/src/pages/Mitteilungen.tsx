import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { listNotifications, markNotificationsRead } from "@/lib/api";
import { useAsync, Loading } from "@/lib/useAsync";

const ICON: Record<string, string> = { neue_kette: "🔗", spende: "★", neuer_follower: "👋", glied: "➕", moderation: "🛡" };

export default function Mitteilungen() {
  const { profile, loading: authLoading } = useAuth();
  const { data, loading } = useAsync(() => listNotifications(), [profile?.id]);
  useEffect(() => { if (data?.some((n) => !n.read)) markNotificationsRead().catch(() => {}); }, [data]);
  if (authLoading) return <Loading />;
  if (!profile) return <Navigate to="/login?next=/mitteilungen" replace />;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Mitteilungen</h1>
      {loading ? <Loading /> : data && data.length === 0 ? <p className="muted">Noch nichts. Folge Creators, dann erfährst du hier, wenn sie neue Ketten starten.</p> : (
        <ul className="space-y-2">
          {data?.map((n) => (
            <li key={n.id} className={`card flex items-start gap-3 p-3 text-sm ${n.read ? "" : "border-[#7c5cff]/60"}`}>
              <span className="text-lg" style={n.type === "spende" ? { color: "var(--star)" } : undefined}>{ICON[n.type] ?? "•"}</span>
              <div className="flex-1">
                <p>{n.message}</p>
                <p className="muted mt-1 text-xs">{new Date(n.created_at).toLocaleString("de-DE")}{n.chain_id && <> · <Link to={`/c/${n.chain_id}`} className="underline">Zur Kette</Link></>}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
