import { Link, useSearchParams } from "react-router-dom";
import { listChains } from "@/lib/api";
import { GALAXIES } from "@/lib/galaxies";
import { useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";
import { ChainCard } from "@/components/ChainCard";

export default function Chains() {
  const { t } = useT();
  const [sp, setSp] = useSearchParams();
  const order = sp.get("sort") === "new" ? "new" : "hot";
  const galaxy = sp.get("g") || null;
  const { data, loading } = useAsync(() => listChains(order, 100, galaxy), [order, galaxy]);
  const setGalaxy = (g: string | null) => { const n = new URLSearchParams(sp); if (g) n.set("g", g); else n.delete("g"); setSp(n); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{t("chains_title")}</h1>
        <div className="ml-auto flex gap-2 text-sm">
          <Link to={`/chains${galaxy ? `?g=${galaxy}` : ""}`} className={`btn btn-ghost ${order === "hot" ? "border-white/40" : ""}`}>{t("sort_hot")}</Link>
          <Link to={`/chains?sort=new${galaxy ? `&g=${galaxy}` : ""}`} className={`btn btn-ghost ${order === "new" ? "border-white/40" : ""}`}>{t("sort_new")}</Link>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setGalaxy(null)} className={`rounded-full border px-2.5 py-1 text-xs ${!galaxy ? "border-white/70 bg-white/15 text-white" : "muted border-white/10 hover:text-white"}`}>{t("galaxy_all")}</button>
        {GALAXIES.map((g) => (
          <button key={g.slug} onClick={() => setGalaxy(g.slug)} className={`rounded-full border px-2.5 py-1 text-xs transition ${galaxy === g.slug ? "border-white/70 bg-white/15 text-white" : "muted border-white/10 hover:text-white"}`}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${g.hue} 85% 65%)` }} />{t(`galaxy_${g.slug}`)}
          </button>
        ))}
      </div>
      {loading ? <Loading /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data?.map((c) => <ChainCard key={c.id} chain={c} />)}</div>
      )}
      {data && data.length === 0 && <p className="muted">{t("nothing_here")} <Link to="/new" className="underline">{t("start_first")}</Link></p>}
    </div>
  );
}
