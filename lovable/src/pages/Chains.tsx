import { Link, useSearchParams } from "react-router-dom";
import { listChains } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useAsync, Loading } from "@/lib/useAsync";
import { ChainCard } from "@/components/ChainCard";

export default function Chains() {
  const { t } = useT();
  const [sp] = useSearchParams();
  const order = sp.get("sort") === "new" ? "new" : "hot";
  const { data, loading } = useAsync(() => listChains(order, 100), [order]);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{t("chains_title")}</h1>
        <div className="ml-auto flex gap-2 text-sm">
          <Link to="/chains" className={`btn btn-ghost ${order === "hot" ? "border-white/40" : ""}`}>{t("sort_hot")}</Link>
          <Link to="/chains?sort=new" className={`btn btn-ghost ${order === "new" ? "border-white/40" : ""}`}>{t("sort_new")}</Link>
        </div>
      </div>
      {loading ? <Loading /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data?.map((c) => <ChainCard key={c.id} chain={c} />)}</div>
      )}
      {data && data.length === 0 && <p className="muted">{t("nothing_here")} <Link to="/new" className="underline">{t("start_first")}</Link></p>}
    </div>
  );
}
