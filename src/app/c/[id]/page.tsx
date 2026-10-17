import Link from "next/link";
import { notFound } from "next/navigation";
import { getChain, getLinks } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { AppendLinkForm, BoostForm, InviteButton } from "@/components/Forms";
import { LinkItem } from "@/components/LinkItem";
import { BOOST_COST, BOOST_LEVEL_DESC } from "@/lib/shop";
import { glieder, planeten } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ChainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chain = getChain(Number(id));
  if (!chain) notFound();
  const links = getLinks(chain.id);
  const user = await currentUser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-6">
          <p className="muted text-xs uppercase tracking-wide">{chain.daily_day ? `Tages-Ereignis · ${chain.daily_day}` : "Kette"}</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{chain.title}</h1>
          <p className="muted mt-1 text-sm">
            {glieder(chain.link_count)} · {planeten(chain.user_count)}
            {chain.origin_username && <> · Ursprung: <Link href={`/p/${chain.origin_username}`} className="underline">{chain.origin_display_name}</Link></>}
            {chain.boost > 0 && <> · ⚡ Boost ×{chain.boost}</>}
          </p>
        </div>
        <ol className="space-y-4">
          {links.map((l) => <LinkItem key={l.id} link={l} isOrigin={l.user_id === chain.origin_user_id && l.position === 1} />)}
        </ol>
        <div className="card mt-6 p-4">
          <h2 className="mb-3 font-semibold">Dein Glied anhängen</h2>
          {user ? (
            <AppendLinkForm chainId={chain.id} />
          ) : (
            <p className="muted text-sm">
              <Link href={`/registrieren?next=/c/${chain.id}`} className="btn mr-2">Planet erschaffen</Link>
              oder <Link href={`/login?next=/c/${chain.id}`} className="underline">anmelden</Link>, um mitzumachen.
            </p>
          )}
        </div>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">Kette weitertragen</h2>
          {user ? <InviteButton chainId={chain.id} appUrl={appUrl} /> : <p className="muted text-sm">Melde dich an, um Einladungslinks zu erzeugen.</p>}
        </div>
        {user && (
          <div className="card p-4">
            <h2 className="mb-2 font-semibold">Heller leuchten</h2>
            <p className="muted mb-3 text-xs">{BOOST_LEVEL_DESC}</p>
            <BoostForm chainId={chain.id} cost={BOOST_COST} />
          </div>
        )}
        <div className="card p-4 text-sm">
          <h2 className="mb-2 font-semibold">Link zur Kette</h2>
          <code className="block break-all text-xs">{appUrl}/c/{chain.id}</code>
        </div>
      </aside>
    </div>
  );
}
