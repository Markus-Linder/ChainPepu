import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { listNotifications, markNotificationsRead } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";
import { Icon, type IconName } from "@/components/Icons";
import type { Notification } from "@/lib/types";

const ICON: Record<string, IconName> = { neue_kette: "chain", spende: "star", neuer_follower: "users", glied: "spark", moderation: "shield", antwort: "reply" };
const KEY: Record<string, string> = { new_chain: "notif_new_chain", link: "notif_link", donation: "notif_donation", follower: "notif_follower", reply: "notif_reply", reported: "notif_reported", blocked: "notif_blocked", auto_blocked: "notif_auto_blocked", approved: "notif_approved" };

export default function Notifications() {
  const { t, locale } = useT();
  const { profile, loading: authLoading } = useAuth();
  const { data, loading } = useAsync(() => listNotifications(), [profile?.id]);
  useEffect(() => { if (data?.some((n) => !n.read)) markNotificationsRead().catch(() => {}); }, [data]);
  if (authLoading) return <Loading />;
  if (!profile) return <Navigate to="/login?next=/notifications" replace />;
  // Translated when the notification carries parameters; older ones show their stored text.
  const text = (n: Notification) => {
    const key = n.params?.key && KEY[n.params.key];
    return key ? t(key, { actor: n.params?.actor ?? "", title: n.params?.title ?? "", stars: n.params?.stars ?? 0, share: n.params?.share ?? 0, reason: n.params?.reason ?? "" }) : n.message;
  };
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t("notif_title")}</h1>
      {loading ? <Loading /> : data && data.length === 0 ? <p className="muted">{t("notif_empty")}</p> : (
        <ul className="space-y-2">
          {data?.map((n) => (
            <li key={n.id} className={`card flex items-start gap-3 p-3 text-sm ${n.read ? "" : "border-[#7b61ff]/60"}`}>
              <span className="mt-0.5" style={n.type === "spende" ? { color: "var(--star)" } : undefined}><Icon name={ICON[n.type] ?? "spark"} size={18} filled={n.type === "spende"} /></span>
              <div className="flex-1">
                <p>{text(n)}</p>
                <p className="muted mt-1 text-xs">{new Date(n.created_at).toLocaleString(locale)}{n.chain_id && <> · <Link to={`/c/${n.chain_id}`} className="underline">{t("to_chain")}</Link></>}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
