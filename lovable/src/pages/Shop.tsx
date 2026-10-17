import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { isDemoMode } from "@/lib/api";
import { SKINS } from "@/lib/planet";
import { STAR_PACKS } from "@/lib/shop";
import { useAsync, Loading } from "@/lib/useAsync";
import { Planet } from "@/components/Planet";
import { BuySkinButton, BuyStarsButton } from "@/components/Forms";

export default function Shop() {
  const { profile, loading } = useAuth();
  const demo = useAsync(isDemoMode, []);
  if (loading) return <Loading />;
  if (!profile) return <Navigate to="/login?next=/shop" replace />;
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold">Dein Planet, dein Stil</h1>
        <p className="muted text-sm">Alles Wichtige ist kostenlos. Sterne gibt es fürs Mitmachen und Einladen, oder du kaufst welche. Du hast <span style={{ color: "var(--star)" }}>★ {profile.stars}</span>.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(SKINS).map(([key, s]) => (
            <div key={key} className="card flex flex-col items-center gap-3 p-5 text-center">
              <Planet seed={profile.planet_seed} skin={key} size={110} title={s.name} />
              <div><div className="font-semibold">{s.name}</div><div className="muted text-xs">{s.desc}</div></div>
              <div className="w-full"><BuySkinButton skin={key} name={s.name} price={s.price} owned={profile.planet_skin === key} /></div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-xl font-bold">Sterne kaufen</h2>
        <p className="muted text-sm">{demo.data ? "Demo-Modus: Es ist kein Zahlungsanbieter aktiv, Sterne werden direkt gutgeschrieben." : "Sichere Zahlung über Stripe."}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {STAR_PACKS.map((p) => (
            <div key={p.id} className="card p-5 text-center">
              <div className="text-3xl font-extrabold" style={{ color: "var(--star)" }}>★ {p.stars}</div>
              <div className="mt-3"><BuyStarsButton packId={p.id} label={p.label} demo={Boolean(demo.data)} price={`${(p.priceCents / 100).toFixed(2).replace(".", ",")} €`} /></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
