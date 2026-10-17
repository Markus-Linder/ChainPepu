import Link from "next/link";
import { notFound } from "next/navigation";
import { Planet } from "@/components/Planet";
import { ChainCard } from "@/components/ChainCard";
import { getUserByUsername, listChainsByOrigin, listChainsJoined, listLinksByUser } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { SKINS } from "@/lib/planet";

export const dynamic = "force-dynamic";

export default async function PlanetPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = getUserByUsername(username.toLowerCase());
  if (!user) notFound();
  const me = await currentUser();
  const mine = me?.id === user.id;
  const started = listChainsByOrigin(user.id);
  const joined = listChainsJoined(user.id);
  const recent = listLinksByUser(user.id, 10);
  const totalReach = started.reduce((s, c) => s + c.link_count, 0);

  return (
    <div className="space-y-8">
      <section className="card flex flex-col items-center gap-6 p-8 sm:flex-row sm:items-start">
        <Planet seed={user.planet_seed} skin={user.planet_skin} size={160} title={user.display_name} />
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-extrabold">{user.display_name}</h1>
          <p className="muted">@{user.username} · Skin: {SKINS[user.planet_skin]?.name ?? user.planet_skin}</p>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <Stat n={started.length} label="Ketten gestartet" />
            <Stat n={totalReach} label="Glieder in eigenen Ketten" />
            <Stat n={joined.length} label="Ketten mitgebaut" />
          </div>
          {mine && (
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Link href="/neu" className="btn">+ Kette starten</Link>
              <Link href="/shop" className="btn btn-ghost">Planet gestalten · ★ {user.stars}</Link>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Ketten, die hier ihren Ursprung haben</h2>
        {started.length === 0 ? <p className="muted">Noch keine. {mine && <Link href="/neu" className="underline">Die erste starten?</Link>}</p> : (
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
              <Link href={`/c/${l.chain_id}`} className="muted text-xs hover:underline">in „{l.chain_title}“ · #{l.position}</Link>
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
  return (
    <div>
      <div className="text-2xl font-bold">{n}</div>
      <div className="muted text-xs">{label}</div>
    </div>
  );
}
