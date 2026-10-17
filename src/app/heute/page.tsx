import Link from "next/link";
import { getChain, getLinks } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { ensureDailyChain } from "@/lib/actions";
import { secondsUntilMidnightUtc, themeForDay, todayKey } from "@/lib/events";
import { Countdown } from "@/components/Countdown";
import { AppendLinkForm, InviteButton } from "@/components/Forms";
import { LinkItem } from "@/components/LinkItem";
import { glieder, planeten } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HeutePage() {
  const id = await ensureDailyChain();
  const chain = getChain(id)!;
  const links = getLinks(id);
  const user = await currentUser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="card p-6 text-center" style={{ "--glow": "rgba(255,210,107,.35)" } as React.CSSProperties}>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--star)" }}>☀ Universums-Ereignis · {todayKey()}</p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{themeForDay(todayKey())}</h1>
        <p className="muted mt-2 text-sm">Das ganze Universum baut heute eine einzige Kette. Endet in <Countdown seconds={secondsUntilMidnightUtc()} />. Morgen gibt es ein neues Thema.</p>
        <p className="mt-3 text-sm">{glieder(chain.link_count)} von {planeten(chain.user_count)}</p>
      </section>

      <div className="card p-4">
        {user ? <AppendLinkForm chainId={id} /> : (
          <p className="muted text-sm">
            <Link href="/registrieren?next=/heute" className="btn mr-2">Planet erschaffen</Link>
            oder <Link href="/login?next=/heute" className="underline">anmelden</Link>, um dein Glied anzuhängen.
          </p>
        )}
      </div>

      {user && <div className="card p-4"><InviteButton chainId={id} appUrl={appUrl} /></div>}

      <ol className="space-y-4">
        {[...links].reverse().map((l) => <LinkItem key={l.id} link={l} isOrigin={false} />)}
      </ol>
    </div>
  );
}
