import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getChain, getLinks } from "@/lib/api";
import { glieder, planeten } from "@/lib/format";
import { BOOST_COST, BOOST_LEVEL_DESC } from "@/lib/shop";
import { useAsync, Loading } from "@/lib/useAsync";
import { AppendLinkForm, BoostButton, InviteButton } from "@/components/Forms";
import { LinkItem } from "@/components/LinkItem";
import NotFound from "./NotFound";

export default function Kette() {
  const id = Number(useParams().id);
  const { profile } = useAuth();
  const { data, loading, reload } = useAsync(async () => {
    const chain = await getChain(id);
    return chain ? { chain, links: await getLinks(id) } : null;
  }, [id]);
  if (loading) return <Loading />;
  if (!data) return <NotFound />;
  const { chain, links } = data;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-6">
          <p className="muted text-xs uppercase tracking-wide">{chain.daily_day ? `Tages-Ereignis · ${chain.daily_day}` : "Kette"}</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{chain.title}</h1>
          <p className="muted mt-1 text-sm">
            {glieder(chain.link_count)} · {planeten(chain.user_count)}
            {chain.origin_username && <> · Ursprung: <Link to={`/p/${chain.origin_username}`} className="underline">{chain.origin_display_name}</Link></>}
            {chain.boost > 0 && <> · ⚡ Boost ×{chain.boost}</>}
          </p>
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
