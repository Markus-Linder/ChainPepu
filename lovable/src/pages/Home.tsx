import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ensureDailyChain, getMapEdges, getStats, listChains, listProfiles } from "@/lib/api";
import { secondsUntilMidnightUtc, themeForDay, todayKey } from "@/lib/events";
import { glieder, ketten, planeten } from "@/lib/format";
import { useAsync, Loading } from "@/lib/useAsync";
import { UniverseMap } from "@/components/UniverseMap";
import { ChainCard } from "@/components/ChainCard";
import { Countdown } from "@/components/Countdown";

export default function Home() {
  const { profile, loading: authLoading } = useAuth();
  const { data, loading } = useAsync(async () => {
    await ensureDailyChain().catch(() => {});
    const [users, chains, edges, stats] = await Promise.all([listProfiles(), listChains("hot", 200), getMapEdges(), getStats()]);
    return { users, chains, edges, stats };
  }, []);

  const linkCount = new Map<string, number>();
  for (const e of data?.edges ?? []) {
    linkCount.set(e.from_user, (linkCount.get(e.from_user) ?? 0) + 1);
    linkCount.set(e.to_user, (linkCount.get(e.to_user) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      {!profile && !authLoading && (
        <section className="card relative overflow-hidden p-8 text-center sm:p-12">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Jeder Mensch ist ein Planet.<br />
            <span className="bg-gradient-to-r from-[#7c5cff] to-[#ff5cc8] bg-clip-text text-transparent">Jede Idee ist eine Kette.</span>
          </h1>
          <p className="muted mx-auto mt-4 max-w-xl">Starte eine Kette. Andere hängen ihr Glied an. Die Kette wächst quer durch das Universum, und dein Name bleibt am Anfang. Kostenlos, für immer.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/registrieren" className="btn">Meinen Planeten erschaffen</Link>
            <Link to="/heute" className="btn btn-ghost">Heutiges Ereignis ansehen</Link>
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <h2 className="text-xl font-bold">Das Universum, live</h2>
          {data && <p className="muted text-sm">{planeten(data.stats.users)} · {ketten(data.stats.chains)} · {glieder(data.stats.links)}</p>}
        </div>
        <Link to="/heute" className="card flex items-center gap-3 px-4 py-2 text-sm hover:border-white/25">
          <span style={{ color: "var(--star)" }}>☀</span>
          <span><span className="font-semibold">Heute:</span> {themeForDay(todayKey())}</span>
          <span className="muted">· endet in <Countdown seconds={secondsUntilMidnightUtc()} /></span>
        </Link>
      </section>

      {loading || !data ? <Loading /> : (
        <UniverseMap
          planets={data.users.map((u) => ({ id: u.id, username: u.username, display_name: u.display_name, seed: u.planet_seed, skin: u.planet_skin, links: linkCount.get(u.id) ?? 0 }))}
          chains={data.chains.map((c) => ({ id: c.id, title: c.title, boost: c.boost, link_count: c.link_count, daily: Boolean(c.daily_day) }))}
          edges={data.edges}
        />
      )}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl font-bold">Heiße Ketten</h2>
          <Link to="/ketten" className="muted text-sm hover:text-white">Alle Ketten →</Link>
        </div>
        {data && data.chains.length === 0 ? <p className="muted">Noch keine Ketten. Sei der Ursprung der allerersten.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data?.chains.slice(0, 9).map((c) => <ChainCard key={c.id} chain={c} />)}</div>
        )}
      </section>
    </div>
  );
}
