import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ensureDailyChain, getChain, getLinks, listReplies } from "@/lib/api";
import { secondsUntilMidnightUtc, themeForDay, todayKey } from "@/lib/events";
import { useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";
import { Countdown } from "@/components/Countdown";
import { AppendLinkForm, InviteButton } from "@/components/Forms";
import { LinkItem } from "@/components/LinkItem";
import { Icon } from "@/components/Icons";

export default function Today() {
  const { t, lang } = useT();
  const { profile } = useAuth();
  const { data, loading, reload } = useAsync(async () => {
    const id = await ensureDailyChain();
    const [chain, links, replies] = await Promise.all([getChain(id), getLinks(id), listReplies(id)]);
    return { id, chain: chain!, links, replies };
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="card card-glow p-6 text-center" style={{ "--glow": "rgba(242,196,109,.35)" } as React.CSSProperties}>
        <p className="kicker" style={{ color: "var(--star)" }}><Icon name="sun" size={14} /> {t("event_kicker", { date: todayKey() })}</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{themeForDay(todayKey(), lang)}</h1>
        <p className="muted mt-2 text-sm">{t("event_text_1")} <Countdown seconds={secondsUntilMidnightUtc()} />. {t("event_text_2")}</p>
        {data && <p className="mt-3 text-sm">{t("links_of_planets", { links: t("n_links", { n: data.chain.link_count }), planets: t("n_planets", { n: data.chain.user_count }) })}</p>}
      </section>
      {loading || !data ? <Loading /> : (
        <>
          <div className="card p-4">
            {profile ? <AppendLinkForm chainId={data.id} onDone={reload} /> : (
              <p className="muted text-sm">
                <Link to="/signup?next=/today" className="btn mr-2">{t("join_create")}</Link>
                {t("join_or")} <Link to="/login?next=/today" className="underline">{t("join_login")}</Link> {t("join_to_add")}
              </p>
            )}
          </div>
          {profile && <div className="card p-4"><InviteButton chainId={data.id} /></div>}
          <ol className="space-y-4">
            {[...data.links].reverse().map((l) => <LinkItem key={l.id} link={l} isOrigin={false} replies={data.replies.filter((r) => r.link_id === l.id)} onChanged={reload} />)}
          </ol>
        </>
      )}
    </div>
  );
}
