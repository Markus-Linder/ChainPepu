import Link from "next/link";
import { UniverseMap } from "@/components/UniverseMap";
import { ChainCard } from "@/components/ChainCard";
import { Countdown } from "@/components/Countdown";
import { getDailyChain, getMapEdges, listChains, listUsers, getStats } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { ensureDailyChain } from "@/lib/actions";
import { secondsUntilMidnightUtc, themeForDay, todayKey } from "@/lib/events";
import { glieder, ketten, planeten } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser();
  await ensureDailyChain();
  const daily = getDailyChain(todayKey());
  const users = listUsers();
  const chains = listChains({ limit: 200 });
  const edges = getMapEdges();
  const stats = getStats();
  const linkCount = new Map<number, number>();
  for (const e of edges) {
    linkCount.set(e.from_user, (linkCount.get(e.from_user) ?? 0) + 1);
    linkCount.set(e.to_user, (linkCount.get(e.to_user) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      {!user && (
        <section className="card relative overflow-hidden p-8 text-center sm:p-12">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Jeder Mensch ist ein Planet.<br />
            <span className="bg-gradient-to-r from-[#7c5cff] to-[#ff5cc8] bg-clip-text text-transparent">Jede Idee ist eine Kette.</span>
          </h1>
          <p className="muted mx-auto mt-4 max-w-xl">
            Starte eine Kette. Andere hängen ihr Glied an. Die Kette wächst quer durch das Universum, und dein Name bleibt am Anfang. Kostenlos, für immer.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/registrieren" className="btn">Meinen Planeten erschaffen</Link>
            <Link href="/heute" className="btn btn-ghost">Heutiges Ereignis ansehen</Link>
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <h2 className="text-xl font-bold">Das Universum, live</h2>
          <p className="muted text-sm">{planeten(stats.users)} · {ketten(stats.chains)} · {glieder(stats.links)}</p>
        </div>
        {daily && (
          <Link href="/heute" className="card flex items-center gap-3 px-4 py-2 text-sm hover:border-white/25">
            <span style={{ color: "var(--star)" }}>☀</span>
            <span><span className="font-semibold">Heute:</span> {themeForDay(todayKey())}</span>
            <span className="muted">· endet in <Countdown seconds={secondsUntilMidnightUtc()} /></span>
          </Link>
        )}
      </section>

      <UniverseMap
        planets={users.map((u) => ({ id: u.id, username: u.username, display_name: u.display_name, seed: u.planet_seed, skin: u.planet_skin, links: linkCount.get(u.id) ?? 0 }))}
        chains={chains.map((c) => ({ id: c.id, title: c.title, boost: c.boost, link_count: c.link_count, daily: Boolean(c.daily_day) }))}
        edges={edges}
      />

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl font-bold">Heiße Ketten</h2>
          <Link href="/ketten" className="muted text-sm hover:text-white">Alle Ketten →</Link>
        </div>
        {chains.length === 0 ? (
          <p className="muted">Noch keine Ketten. Sei der Ursprung der allerersten.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chains.slice(0, 9).map((c) => <ChainCard key={c.id} chain={c} />)}
          </div>
        )}
      </section>
    </div>
  );
}
