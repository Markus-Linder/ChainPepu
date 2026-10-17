import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ensureDailyChain, getChain, getLinks } from "@/lib/api";
import { secondsUntilMidnightUtc, themeForDay, todayKey } from "@/lib/events";
import { glieder, planeten } from "@/lib/format";
import { useAsync, Loading } from "@/lib/useAsync";
import { Countdown } from "@/components/Countdown";
import { AppendLinkForm, InviteButton } from "@/components/Forms";
import { LinkItem } from "@/components/LinkItem";

export default function Heute() {
  const { profile } = useAuth();
  const { data, loading, reload } = useAsync(async () => {
    const id = await ensureDailyChain();
    const [chain, links] = await Promise.all([getChain(id), getLinks(id)]);
    return { id, chain: chain!, links };
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="card p-6 text-center" style={{ "--glow": "rgba(255,210,107,.35)" } as React.CSSProperties}>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--star)" }}>☀ Universums-Ereignis · {todayKey()}</p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{themeForDay(todayKey())}</h1>
        <p className="muted mt-2 text-sm">Das ganze Universum baut heute eine einzige Kette. Endet in <Countdown seconds={secondsUntilMidnightUtc()} />. Morgen gibt es ein neues Thema.</p>
        {data && <p className="mt-3 text-sm">{glieder(data.chain.link_count)} von {planeten(data.chain.user_count)}</p>}
      </section>
      {loading || !data ? <Loading /> : (
        <>
          <div className="card p-4">
            {profile ? <AppendLinkForm chainId={data.id} onDone={reload} /> : (
              <p className="muted text-sm">
                <Link to="/registrieren?next=/heute" className="btn mr-2">Planet erschaffen</Link>
                oder <Link to="/login?next=/heute" className="underline">anmelden</Link>, um dein Glied anzuhängen.
              </p>
            )}
          </div>
          {profile && <div className="card p-4"><InviteButton chainId={data.id} /></div>}
          <ol className="space-y-4">{[...data.links].reverse().map((l) => <LinkItem key={l.id} link={l} isOrigin={false} />)}</ol>
        </>
      )}
    </div>
  );
}
