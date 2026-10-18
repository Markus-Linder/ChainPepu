import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getChain, getLinks, getPayoutSettings, listDonations } from "@/lib/api";
import { glieder, planeten } from "@/lib/format";
import { BOOST_COST, BOOST_LEVEL_DESC } from "@/lib/shop";
import { useAsync, Loading } from "@/lib/useAsync";
import { AppendLinkForm, BoostButton, DonateForm, FollowButton, InviteButton } from "@/components/Forms";
import { LinkItem } from "@/components/LinkItem";
import { ChainPlayer } from "@/components/ChainPlayer";
import NotFound from "./NotFound";

export default function Kette() {
  const id = Number(useParams().id);
  const { profile } = useAuth();
  const [playing, setPlaying] = useState(false);
  const { data, loading, reload } = useAsync(async () => {
    const chain = await getChain(id);
    if (!chain) return null;
    const [links, donations, settings] = await Promise.all([getLinks(id), listDonations(id), getPayoutSettings()]);
    return { chain, links, donations, settings };
  }, [id]);
  if (loading) return <Loading />;
  if (!data) return <NotFound />;
  const { chain, links, donations, settings } = data;
  const visible = links.filter((l) => l.status === "sichtbar");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {playing && <ChainPlayer title={chain.title} links={visible} onClose={() => setPlaying(false)} />}
      <div>
        <div className="mb-6">
          <p className="muted text-xs uppercase tracking-wide">{chain.daily_day ? `Tages-Ereignis · ${chain.daily_day}` : "Kette"}</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{chain.title}</h1>
          <p className="muted mt-1 text-sm">
            {glieder(chain.link_count)} · {planeten(chain.user_count)}
            {chain.origin_username && <> · Ursprung: <Link to={`/p/${chain.origin_username}`} className="underline">{chain.origin_display_name}</Link></>}
            {chain.boost > 0 && <> · ⚡ Boost ×{chain.boost}</>}
            {chain.donated_stars > 0 && <> · <span style={{ color: "var(--star)" }}>★ {chain.donated_stars} gespendet</span></>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn text-sm" onClick={() => setPlaying(true)} disabled={visible.length === 0}>▶ Ganze Kette ansehen</button>
            {chain.origin_user_id && <FollowButton creatorId={chain.origin_user_id} />}
          </div>
        </div>
        <ol className="space-y-4">
          {links.map((l) => <LinkItem key={l.id} link={l} isOrigin={l.user_id === chain.origin_user_id && l.position === 1} />)}
        </ol>
        <div className="card mt-6 p-4">
          <h2 className="mb-3 font-semibold">Dein Glied anhängen</h2>
          {profile ? <AppendLinkForm chainId={chain.id} onDone={reload} /> : (
            <p className="muted text-sm">
              <Link to={`/registrieren?next=/c/${chain.id}`} className="btn mr-2">Planet erschaffen</Link>
              oder <Link to={`/login?next=/c/${chain.id}`} className="underline">anmelden</Link>, um mitzumachen.
            </p>
          )}
        </div>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        {chain.origin_user_id && chain.origin_display_name && (
          <div className="card p-4">
            <h2 className="mb-2 font-semibold">{chain.origin_display_name} unterstützen</h2>
            <DonateForm chainId={chain.id} creatorName={chain.origin_display_name} share={settings.share} onDone={reload} />
            {donations.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-white/10 pt-3 text-xs">
                {donations.slice(0, 5).map((d) => (
                  <li key={d.id}><span style={{ color: "var(--star)" }}>★ {d.stars}</span> von <Link to={`/p/${d.profiles.username}`} className="underline">{d.profiles.display_name}</Link>{d.message && <span className="muted"> · „{d.message}“</span>}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">Kette weitertragen</h2>
          {profile ? <InviteButton chainId={chain.id} /> : <p className="muted text-sm">Melde dich an, um Einladungslinks zu erzeugen.</p>}
        </div>
        {profile && (
          <div className="card p-4">
            <h2 className="mb-2 font-semibold">Heller leuchten</h2>
            <p className="muted mb-3 text-xs">{BOOST_LEVEL_DESC}</p>
            <BoostButton chainId={chain.id} cost={BOOST_COST} onDone={reload} />
          </div>
        )}
        <div className="card p-4 text-sm">
          <h2 className="mb-2 font-semibold">Link zur Kette</h2>
          <code className="block break-all text-xs">{window.location.origin}/c/{chain.id}</code>
        </div>
      </aside>
    </div>
  );
}
