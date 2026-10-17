import { Link, useSearchParams } from "react-router-dom";
import { listChains } from "@/lib/api";
import { useAsync, Loading } from "@/lib/useAsync";
import { ChainCard } from "@/components/ChainCard";

export default function Ketten() {
  const [sp] = useSearchParams();
  const order = sp.get("sort") === "neu" ? "new" : "hot";
  const { data, loading } = useAsync(() => listChains(order, 100), [order]);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Alle Ketten</h1>
        <div className="ml-auto flex gap-2 text-sm">
          <Link to="/ketten" className={`btn btn-ghost ${order === "hot" ? "border-white/40" : ""}`}>Heiß</Link>
          <Link to="/ketten?sort=neu" className={`btn btn-ghost ${order === "new" ? "border-white/40" : ""}`}>Neu</Link>
        </div>
      </div>
      {loading ? <Loading /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data?.map((c) => <ChainCard key={c.id} chain={c} />)}</div>
      )}
      {data && data.length === 0 && <p className="muted">Noch nichts hier. <Link to="/neu" className="underline">Starte die erste Kette.</Link></p>}
    </div>
  );
}
