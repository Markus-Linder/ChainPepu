import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { listNotifications, markNotificationsRead } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";
import { Icon, type IconName } from "@/components/Icons";
import type { Notification } from "@/lib/types";
import { useState } from "react";
import { disablePush, enablePush, isPushEnabled, pushSupported } from "@/lib/push";

function PushToggle({ userId }: { userId: string }) {
  const { t } = useT();
  const [on, setOn] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { isPushEnabled().then(setOn); }, []);
  if (!pushSupported()) return <p className="muted text-xs">{t("push_unsupported")}</p>;
  const toggle = async () => {
    setMsg(null);
    if (on) { await disablePush(); setOn(false); return; }
    const r = await enablePush(userId);
    if (r === "ok") { setOn(true); setMsg(t("push_enabled")); } else if (r === "denied") setMsg(t("push_denied"));
  };
  return (
    <div className="card flex flex-wrap items-center gap-3 p-3 text-sm">
      <Icon name="bell" size={18} />
      <span className="flex-1">{on ? t("push_enabled") : t("push_text")}</span>
      <button className={`btn text-xs ${on ? "btn-ghost" : ""}`} onClick={toggle} disabled={on === null}>{on ? t("push_disable") : t("push_enable")}</button>
      {msg && <span className="muted w-full text-xs">{msg}</span>}
    </div>
  );
}

const ICON: Record<string, IconName> = { neue_kette: "chain", spende: "star", neuer_follower: "users", glied: "spark", moderation: "shield", antwort: "reply", duell: "swords" };
const KEY: Record<string, string> = {
  new_chain: "notif_new_chain", link: "notif_link", donation: "notif_donation", follower: "notif_follower", reply: "notif_reply",
  reported: "notif_reported", blocked: "notif_blocked", auto_blocked: "notif_auto_blocked", approved: "notif_approved",
  duel_challenge: "notif_duel_challenge", duel_accepted: "notif_duel_accepted", duel_declined: "notif_duel_declined",
  duel_won: "notif_duel_won", duel_lost: "notif_duel_lost", duel_draw: "notif_duel_draw", invite_milestone: "notif_invite_milestone",
  weekly_won: "notif_weekly_won", tournament_round: "notif_tournament_round", tournament_won: "notif_tournament_won",
  payout_paid: "notif_payout_paid", payout_rejected: "notif_payout_rejected",
};

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
      <PushToggle userId={profile.id} />
      {loading ? <Loading /> : data && data.length === 0 ? <p className="muted">{t("notif_empty")}</p> : (
        <ul className="space-y-2">
          {data?.map((n) => (
            <li key={n.id} className={`card flex items-start gap-3 p-3 text-sm ${n.read ? "" : "border-[#7b61ff]/60"}`}>
              <span className="mt-0.5" style={n.type === "spende" ? { color: "var(--star)" } : undefined}><Icon name={ICON[n.type] ?? "spark"} size={18} filled={n.type === "spende"} /></span>
              <div className="flex-1">
                <p>{text(n)}</p>
                <p className="muted mt-1 text-xs">
                  {new Date(n.created_at).toLocaleString(locale)}
                  {n.params?.duel ? <> · <Link to={`/duel/${n.params.duel}`} className="underline">{t("to_duel")}</Link></> : n.chain_id && <> · <Link to={`/c/${n.chain_id}`} className="underline">{t("to_chain")}</Link></>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
