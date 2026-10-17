import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Planet } from "@/components/Planet";
import { BuySkinForm, BuyStarsForm } from "@/components/Forms";
import { SKINS } from "@/lib/planet";
import { STAR_PACKS, stripeEnabled } from "@/lib/shop";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/shop");
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold">Dein Planet, dein Stil</h1>
        <p className="muted text-sm">Alles Wichtige ist kostenlos. Sterne gibt es fürs Mitmachen und Einladen, oder du kaufst welche. Du hast <span style={{ color: "var(--star)" }}>★ {user.stars}</span>.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(SKINS).map(([key, s]) => (
            <div key={key} className="card flex flex-col items-center gap-3 p-5 text-center">
              <Planet seed={user.planet_seed} skin={key} size={110} title={s.name} />
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="muted text-xs">{s.desc}</div>
              </div>
              <div className="w-full"><BuySkinForm skin={key} price={s.price} owned={user.planet_skin === key} /></div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Sterne kaufen</h2>
        <p className="muted text-sm">
          {stripeEnabled() ? "Sichere Zahlung über Stripe." : "Demo-Modus: Es ist kein Zahlungsanbieter hinterlegt, Sterne werden direkt gutgeschrieben."}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {STAR_PACKS.map((p) => (
            <div key={p.id} className="card p-5 text-center">
              <div className="text-3xl font-extrabold" style={{ color: "var(--star)" }}>★ {p.stars}</div>
              <div className="mt-3"><BuyStarsForm packId={p.id} label={p.label} price={`${(p.priceCents / 100).toFixed(2).replace(".", ",")} €`} /></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
