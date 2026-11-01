import { Link, useNavigate } from "react-router-dom";
import { Swords, Trophy } from "lucide-react";
import { CreatureCanvas } from "@/components/creature/CreatureCanvas";
import { BattleList } from "@/components/creature/Panels";
import { Badge, Card, Empty, Spinner } from "@/components/ui/primitives";
import { useAuth } from "@/hooks/useAuth";
import { useBattles, useConversations, useCreatureNames, useLeaderboard, useMyCreature } from "@/hooks/useCreature";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function Arena() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const lb = useLeaderboard(50);
  const battles = useBattles(undefined, 20);
  const convos = useConversations(undefined, 6);
  const mine = useMyCreature(user?.id);
  const names = useCreatureNames([...(battles.data ?? []).flatMap((b) => [b.challenger_id, b.defender_id]), ...(convos.data ?? []).flatMap((x) => [x.creature_a_id, x.creature_b_id])]);
  const top = lb.data?.slice(0, 3) ?? [];

  return (
    <div className="container py-8">
      <h1 className="flex items-center gap-3 text-4xl font-extrabold"><Swords className="text-accent" /> {t.arena.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.landing.step4_text}</p>

      {lb.isLoading && <div className="grid h-40 place-items-center"><Spinner /></div>}
      {top.length > 0 && (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {top.map((r, i) => (
            <Link to={`/c/${r.slug}`} key={r.id} className={cn("glass relative overflow-hidden rounded-3xl p-3 transition hover:scale-[1.01]", i === 0 && "md:order-2 border-warning/50", i === 1 && "md:order-1", i === 2 && "md:order-3")}>
              <div className="absolute left-3 top-3 z-10 text-3xl">{["🥇", "🥈", "🥉"][i]}</div>
              <div className="h-52"><CreatureCanvas dna={r.dna} mood={r.alive ? "happy" : "dead"} interactive={false} lowPower className="h-full" /></div>
              <div className="mt-2 flex items-center justify-between">
                <div><div className="font-bold">{r.name}</div><div className="text-xs text-muted-foreground">{r.species} · @{r.owner_handle}</div></div>
                <Badge tone="primary"><Trophy size={12} /> {r.elo}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <h2 className="mb-3 text-xl font-bold">{t.arena.leaderboard}</h2>
          {(lb.data?.length ?? 0) === 0 && !lb.isLoading && <Empty>{t.dashboard.no_data}</Empty>}
          <div className="divide-y divide-white/5 text-sm">
            {(lb.data ?? []).map((r, i) => (
              <div key={r.id} className={cn("flex items-center gap-3 py-2", mine.data?.id === r.id && "rounded-xl bg-primary/10 px-2")}>
                <span className="w-7 text-right tabular-nums text-muted-foreground">{i + 1}</span>
                <Link to={`/c/${r.slug}`} className="flex flex-1 items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-xl"><CreatureCanvas dna={r.dna} interactive={false} lowPower className="h-full rounded-xl" mood={r.alive ? "content" : "dead"} /></div>
                  <div><div className="font-semibold">{r.name} <span className="text-xs text-muted-foreground">Lv {r.level}</span></div><div className="text-xs text-muted-foreground">@{r.owner_handle} · {fmt(t.creature.record, { wins: r.wins, losses: r.losses })} · {t.arena.care} {r.care_score}</div></div>
                </Link>
                <Badge tone="primary">{r.elo}</Badge>
                {mine.data && mine.data.id !== r.id && r.alive && (
                  <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => navigate(`/c/${r.slug}`)}><Swords size={14} /> {t.arena.challenge}</button>
                )}
              </div>
            ))}
          </div>
          {!mine.data && <p className="mt-3 text-center text-xs text-muted-foreground">{t.arena.needs_creature} <Link to="/login" className="underline">{t.app.cta_creator}</Link></p>}
        </Card>
        <div className="space-y-4">
          <Card><h2 className="mb-3 text-xl font-bold">{t.arena.recent_battles}</h2><BattleList t={t} locale={locale} battles={battles.data ?? []} names={names.data ?? {}} /></Card>
          <Card>
            <h2 className="mb-3 text-xl font-bold">{t.arena.recent_conversations}</h2>
            {(convos.data?.length ?? 0) === 0 && <Empty>{t.dashboard.no_data}</Empty>}
            <div className="space-y-3 text-sm">
              {(convos.data ?? []).map((cv) => {
                const a = names.data?.[cv.creature_a_id];
                const b = names.data?.[cv.creature_b_id];
                return (
                  <div key={cv.id} className="rounded-2xl bg-white/5 p-3">
                    <div className="mb-1 text-xs text-muted-foreground">{a ? <Link className="underline" to={`/c/${a.slug}`}>{a.name}</Link> : "…"} & {b ? <Link className="underline" to={`/c/${b.slug}`}>{b.name}</Link> : "…"} · {cv.topic}</div>
                    {cv.transcript.slice(0, 3).map((l, i) => <div key={i}><b>{l.speaker}:</b> {l.text}</div>)}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
