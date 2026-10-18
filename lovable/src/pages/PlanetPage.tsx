import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getCreatorStats, getPayoutSettings, getProfileByUsername, listChainsByOrigin, listChainsJoined, listLinksByUser, listPayouts } from "@/lib/api";
import { SKINS } from "@/lib/planet";
import { useAsync, Loading } from "@/lib/useAsync";
import { Planet } from "@/components/Planet";
import { ChainCard } from "@/components/ChainCard";
import { EarningsPanel, FollowButton } from "@/components/Forms";
import NotFound from "./NotFound";

export default function PlanetPage() {
  const username = String(useParams().username);
  const { profile: me } = useAuth();
  const { data, loading, reload } = useAsync(async () => {
    const user = await getProfileByUsername(username);
    if (!user) return null;
    const mine = me?.id === user.id;
    const [started, joined, recent, creator, settings, payouts] = await Promise.all([
      listChainsByOrigin(user.id), listChainsJoined(user.id), listLinksByUser(user.id, 10), getCreatorStats(user.id), getPayoutSettings(), mine ? listPayouts() : Promise.resolve([]),
    ]);
    return { user, started, joined, recent, creator, settings, payouts };
  }, [username, me?.stars, me?.planet_skin, me?.earned_stars]);
  if (loading) return <Loading />;
  if (!data) return <NotFound />;
  const { user, started, joined, recent, creator, settings, payouts } = data;
  const mine = me?.id === user.id;
  const totalReach = started.reduce((s, c) => s + c.link_count, 0);

  return (
    <div className="space-y-8">
      <section className="card flex flex-col items-center gap-6 p-8 sm:flex-row sm:items-start">
        <Planet seed={user.planet_seed} skin={user.planet_skin} size={160} title={user.display_name} />
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold">{user.display_name}</h1>
          <p className="muted">@{user.username} · Skin: {SKINS[user.planet_skin]?.name ?? user.planet_skin}</p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
            <Stat n={creator.follower_count} label="Follower" />
            <Stat n={started.length} label="Ketten gestartet" />
            <Stat n={totalReach} label="Glieder in eigenen Ketten" />
            <Stat n={creator.donated_total} label="Sterne erhalten" />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <FollowButton creatorId={user.id} onChange={reload} />
            {mine && <Link to="/neu" className="btn">+ Kette starten</Link>}
            {mine && <Link to="/shop" className="btn btn-ghost">Planet gestalten · ★ {me!.stars}</Link>}
          </div>
        </div>
      </section>

      {mine && (
        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <EarningsPanel min={settings.min} cents={settings.cents} share={settings.share} />
          <div className="card p-4">
            <h2 className="mb-2 font-semibold">Auszahlungen</h2>
            {payouts.length === 0 ? <p className="muted text-sm">Noch keine.</p> : (
              <ul className="space-y-1 text-sm">
                {payouts.map((p) => <li key={p.id} className="flex justify-between"><span>{new Date(p.created_at).toLocaleDateString("de-DE")} · ★ {p.stars}</span><span className="muted">{(p.cents / 100).toFixed(2).replace(".", ",")} € · {p.status}</span></li>)}
              </ul>
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xl font-bold">Ketten, die hier ihren Ursprung haben</h2>
        {started.length === 0 ? <p className="muted">Noch keine. {mine && <Link to="/neu" className="underline">Die erste starten?</Link>}</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{started.map((c) => <ChainCard key={c.id} chain={c} />)}</div>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-xl font-bold">Mitgebaute Ketten</h2>
        {joined.length === 0 ? <p className="muted">Noch keine.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{joined.map((c) => <ChainCard key={c.id} chain={c} />)}</div>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-xl font-bold">Letzte Glieder</h2>
        <ul className="space-y-2">
          {recent.map((l) => (
            <li key={l.id} className="card p-3 text-sm" style={{ borderLeft: `4px solid ${l.color}` }}>
              <Link to={`/c/${l.chain_id}`} className="muted text-xs hover:underline">in „{l.chains?.title}“ · #{l.position}{l.video_url ? " · 🎬" : ""}</Link>
              <p className="mt-1 line-clamp-3">{l.text}</p>
            </li>
          ))}
          {recent.length === 0 && <p className="muted">Noch still hier.</p>}
        </ul>
      </section>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return <div><div className="text-2xl font-bold">{n}</div><div className="muted text-xs">{label}</div></div>;
}
