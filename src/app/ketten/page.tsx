import Link from "next/link";
import { ChainCard } from "@/components/ChainCard";
import { listChains } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function KettenPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort } = await searchParams;
  const order = sort === "neu" ? "new" : "hot";
  const chains = listChains({ limit: 100, order });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Alle Ketten</h1>
        <div className="ml-auto flex gap-2 text-sm">
          <Link href="/ketten" className={`btn btn-ghost ${order === "hot" ? "border-white/40" : ""}`}>Heiß</Link>
          <Link href="/ketten?sort=neu" className={`btn btn-ghost ${order === "new" ? "border-white/40" : ""}`}>Neu</Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {chains.map((c) => <ChainCard key={c.id} chain={c} />)}
      </div>
      {chains.length === 0 && <p className="muted">Noch nichts hier. <Link href="/neu" className="underline">Starte die erste Kette.</Link></p>}
    </div>
  );
}
