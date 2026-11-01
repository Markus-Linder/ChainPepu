import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Share2, Swords, Heart, Users, Trophy, Hand } from "lucide-react";
import { CreatureCanvas } from "@/components/creature/CreatureCanvas";
import { BattleList, ChatPanel, GiftShop, LiveFeed, MemoryList, QuestList } from "@/components/creature/Panels";
import { Badge, Button, Card, Modal, Spinner, StatBar } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { useBattles, useChat, useConversations, useCreature, useCreatureNames, useGifts, useMemories, useMyCreature, useOwnerProfile, useQuests } from "@/hooks/useCreature";
import { ApiError, callFunction } from "@/lib/api";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { supabase } from "@/integrations/supabase/client";
import { careScore, deriveMood, xpForLevel } from "@shared/lifecycle";
import type { CatalogItem } from "@shared/catalog";
import type { BattleRow, ChatRow, CreatureRow, GiftRow } from "@shared/types";
import { cn, formatNumber } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function CreaturePage() {
  const { slug } = useParams();
  const { t, locale } = useI18n();
  const { user, profile, ensureSession, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const creatureQ = useCreature(slug);
  const c = creatureQ.data;
  const owner = useOwnerProfile(c?.owner_id);
  const gifts = useGifts(c?.id);
  const chat = useChat(c?.id);
  const quests = useQuests(c?.id);
  const battles = useBattles(c?.id);
  const convos = useConversations(c?.id, 5);
  const memories = useMemories(c?.id);
  const mine = useMyCreature(user?.id);
  const names = useCreatureNames([...(battles.data ?? []).flatMap((b) => [b.challenger_id, b.defender_id]), ...(convos.data ?? []).flatMap((x) => [x.creature_a_id, x.creature_b_id])]);
  const [busy, setBusy] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [tab, setTab] = useState<"gift" | "chat" | "quests" | "battles" | "memories">("gift");
  const [battleOpen, setBattleOpen] = useState(false);
  const [stake, setStake] = useState(0);
  const [battleResult, setBattleResult] = useState<{ battle: BattleRow; payout: number } | null>(null);

  // Record visit once per session
  useEffect(() => {
    if (!slug) return;
    (async () => {
      const s = await ensureSession();
      const key = s?.user.id ?? `anon-${Math.random().toString(36).slice(2)}`;
      await supabase.rpc("record_visit", { p_slug: slug, p_visitor_key: key });
    })();
  }, [slug, ensureSession]);

  const mood = useMemo(() => (c ? deriveMood(c) : "content"), [c]);
  const isOwner = Boolean(user && c && c.owner_id === user.id);

  const setCreature = (next: CreatureRow) => qc.setQueryData(["creature", slug], (old: CreatureRow | undefined) => ({ ...(old ?? {}), ...next }));

  const handleError = (e: unknown) => {
    const msg = e instanceof ApiError ? e.message : (e as Error).message;
    toast({ title: t.app.error_generic, description: msg, variant: "error" });
    if (e instanceof ApiError && e.code === "insufficient_credits") navigate("/pricing");
  };

  const gift = async (item: CatalogItem, message: string) => {
    if (!c) return;
    setBusy("gift");
    try {
      await ensureSession();
      const res = await callFunction<{ creature: CreatureRow; gift: GiftRow; leveledUp: boolean }>("gift", { slug: c.slug, itemSlug: item.slug, message });
      setCreature(res.creature);
      qc.setQueryData(["gifts", c.id], (old: GiftRow[] | undefined) => (old?.some((g) => g.id === res.gift.id) ? old : [res.gift, ...(old ?? [])]));
      await refreshProfile();
      toast({ title: `${item.icon} ${t.creature.gifted.replace("{sender}", profile?.display_name ?? "You").replace("{item}", item.slug)}`, variant: "success" });
      if (res.leveledUp) toast({ title: `🎉 ${t.app.level} ${res.creature.level}!`, variant: "success" });
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(null);
    }
  };

  const send = async (message: string) => {
    if (!c) return;
    setBusy("chat");
    try {
      await ensureSession();
      const res = await callFunction<{ reply: ChatRow; creature: CreatureRow }>("creature-chat", { slug: c.slug, message, locale });
      qc.setQueryData(["chat", c.id], (old: ChatRow[] | undefined) => (old?.some((m) => m.id === res.reply.id) ? old : [...(old ?? []), res.reply]));
      setCreature(res.creature);
      setSpeaking(true);
      setTimeout(() => setSpeaking(false), Math.min(6000, 1200 + res.reply.content.length * 40));
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(null);
    }
  };

  const pet = async () => {
    if (!c || busy) return;
    try {
      await ensureSession();
      const res = await callFunction<{ creature: CreatureRow }>("creature-action", { slug: c.slug, action: "pet" });
      setCreature(res.creature);
    } catch {
      /* ignore */
    }
  };

  const battle = async () => {
    if (!c) return;
    setBusy("battle");
    try {
      const res = await callFunction<{ battle: BattleRow; payout: number; other: CreatureRow }>("battle", { defenderSlug: c.slug, stake: stake || 0 });
      setCreature(res.other);
      setBattleResult(res);
      setBattleOpen(false);
      await refreshProfile();
      battles.refetch();
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    if (!c) return;
    const text = fmt(t.creature.share_text, { name: c.name, handle: owner.data?.tiktok_username ?? owner.data?.handle ?? "creator" });
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: c.name, text, url }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast({ title: t.app.copied, variant: "success" });
  };

  if (creatureQ.isLoading) return <div className="grid min-h-[60vh] place-items-center"><Spinner /></div>;
  if (!c) return <div className="container py-24 text-center text-muted-foreground">404</div>;

  const nextLevelXp = xpForLevel(c.level + 1);
  const prevLevelXp = xpForLevel(c.level);
  const xpPct = Math.round(((c.xp - prevLevelXp) / Math.max(1, nextLevelXp - prevLevelXp)) * 100);
  const credits = profile?.credits ?? 0;
  const age = (Date.now() - new Date(c.born_at).getTime()) / 86_400_000;

  return (
    <div className="container py-6 lg:py-10">
      {!c.alive && (
        <div className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-center text-sm">
          💔 {fmt(t.creature.dead_banner, { name: c.name })}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* Left: creature */}
        <div>
          <div className="relative h-[420px] sm:h-[520px]">
            <CreatureCanvas dna={c.dna} mood={mood} cosmetics={c.cosmetics} speaking={speaking} className="h-full shadow-glow" onClick={pet} />
            <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
              <Badge tone="primary">{t.app.level} {c.level}</Badge>
              <Badge>{(t.creature.mood as Record<string, string>)[mood]}</Badge>
              <Badge tone={c.alive ? "success" : "danger"}>{t.arena.care} {careScore(c)}</Badge>
            </div>
            <div className="absolute right-4 top-4 flex gap-2">
              <button className="glass rounded-full p-2 hover:bg-white/10" onClick={share} title={t.app.share}><Share2 size={18} /></button>
            </div>
            <div className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs text-white/60"><Hand size={12} className="mr-1 inline" /> tap to pet</div>
          </div>
          <Card className="mt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-extrabold">{c.name}</h1>
                <p className="text-sm text-muted-foreground">{c.species} · {c.persona.archetype}</p>
                {owner.data && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.creature.owner} {owner.data.tiktok_username ? <a className="underline" href={`https://www.tiktok.com/@${owner.data.tiktok_username}`} target="_blank" rel="noreferrer">@{owner.data.tiktok_username}</a> : <b>{owner.data.display_name}</b>}
                  </p>
                )}
              </div>
              <div className="flex gap-3 text-center text-xs text-muted-foreground">
                <div><div className="text-lg font-bold text-foreground">{formatNumber(c.visit_count, locale)}</div><Users size={12} className="inline" /> {t.creature.visitors}</div>
                <div><div className="text-lg font-bold text-foreground">{c.elo}</div><Trophy size={12} className="inline" /> {t.creature.elo}</div>
                <div><div className="text-lg font-bold text-foreground">{age < 1 ? `${Math.round(age * 24)}h` : `${Math.floor(age)}d`}</div>{t.app.age}</div>
              </div>
            </div>
            <p className="mt-3 text-sm italic text-muted-foreground">“{c.persona.tagline}”</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatBar label={t.creature.satiety} value={c.satiety} color="linear-gradient(90deg,#f97316,#fbbf24)" />
              <StatBar label={t.creature.energy} value={c.energy} color="linear-gradient(90deg,#22d3ee,#60a5fa)" />
              <StatBar label={t.creature.happiness} value={c.happiness} color="linear-gradient(90deg,#f472b6,#a78bfa)" />
              <StatBar label={t.creature.hygiene} value={c.hygiene} color="linear-gradient(90deg,#34d399,#a3e635)" />
              <StatBar label={t.creature.health} value={c.health} color="linear-gradient(90deg,#ef4444,#f97316)" />
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>XP</span><span>{c.xp} / {nextLevelXp}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${xpPct}%` }} /></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {c.persona.catchphrases.map((p) => <span key={p} className="chip">{p}</span>)}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
              {(["power", "agility", "wit", "charm"] as const).map((k) => (
                <div key={k} className="rounded-xl bg-white/5 p-2"><div className="text-lg font-bold">{c.dna.stats[k]}</div>{t.creature[k]}</div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {isOwner ? (
                <Link to="/dashboard" className="btn-secondary text-sm">{t.app.dashboard}</Link>
              ) : (
                <Button variant="secondary" className="text-sm" onClick={() => (mine.data ? setBattleOpen(true) : navigate("/login?next=/onboarding"))} disabled={!c.alive || !c.accepts_battles}>
                  <Swords size={16} /> {t.creature.challenge}
                </Button>
              )}
              <Button variant="secondary" className="text-sm" onClick={share}><Share2 size={16} /> {t.app.share}</Button>
            </div>
          </Card>
        </div>

        {/* Right: interaction */}
        <div className="space-y-4">
          <Card>
            <div className="mb-4 flex flex-wrap gap-1">
              {([["gift", t.creature.gift_title], ["chat", "💬"], ["quests", t.creature.quests], ["battles", t.creature.battles], ["memories", t.creature.memories]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)} className={cn("chip", tab === k && "border-primary text-primary")}>{label}</button>
              ))}
            </div>
            {tab === "gift" && <GiftShop t={t} locale={locale} credits={credits} busy={busy === "gift"} onGift={gift} />}
            {tab === "chat" && <ChatPanel t={t} name={c.name} messages={chat.data ?? []} onSend={send} busy={busy === "chat"} disabled={!c.alive} />}
            {tab === "quests" && <QuestList t={t} name={c.name} quests={quests.data ?? []} />}
            {tab === "battles" && <BattleList t={t} locale={locale} battles={battles.data ?? []} names={names.data ?? {}} highlightId={c.id} />}
            {tab === "memories" && <MemoryList t={t} memories={memories.data ?? []} />}
            {credits === 0 && tab === "gift" && (
              <p className="mt-3 text-center text-xs text-muted-foreground"><Link to="/pricing" className="underline">{t.app.buy_credits}</Link></p>
            )}
          </Card>
          <Card><LiveFeed t={t} locale={locale} gifts={gifts.data ?? []} /></Card>
          {(convos.data?.length ?? 0) > 0 && (
            <Card>
              <h3 className="mb-3 text-lg font-bold">{t.creature.conversations}</h3>
              <div className="space-y-3 text-sm">
                {convos.data!.map((cv) => {
                  const otherId = cv.creature_a_id === c.id ? cv.creature_b_id : cv.creature_a_id;
                  const other = names.data?.[otherId];
                  return (
                    <div key={cv.id} className="rounded-2xl bg-white/5 p-3">
                      <div className="mb-1 text-xs text-muted-foreground">{cv.topic} · {other ? <Link className="underline" to={`/c/${other.slug}`}>{other.name}</Link> : "…"}</div>
                      {cv.transcript.slice(0, 4).map((l, i) => <div key={i}><b>{l.speaker}:</b> {l.text}</div>)}
                      <div className="mt-1 text-xs italic text-muted-foreground">{cv.summary}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          <Card className="text-sm">
            <h3 className="mb-2 flex items-center gap-2 text-lg font-bold"><Heart size={18} className="text-accent" /> {t.creature.personality}</h3>
            <p className="text-muted-foreground">{c.persona.backstory}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(c.persona.traits).map(([k, v]) => (
                <div key={k}><div className="flex justify-between text-xs capitalize text-muted-foreground"><span>{k}</span><span>{v}</span></div><div className="h-1 rounded-full bg-white/10"><div className="h-full rounded-full bg-accent" style={{ width: `${v}%` }} /></div></div>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">❤️ {c.persona.likes.join(", ")} · 💢 {c.persona.dislikes.join(", ")} · 🍽 {c.persona.favoriteFood}</div>
          </Card>
        </div>
      </div>

      <Modal open={battleOpen} onClose={() => setBattleOpen(false)} title={`${mine.data?.name ?? "?"} ${t.arena.vs} ${c.name}`}>
        <p className="text-sm text-muted-foreground">{t.landing.step4_text}</p>
        <label className="mt-4 block text-sm">{t.arena.stake}
          <input type="number" className="input mt-1" min={0} max={500} step={10} value={stake} onChange={(e) => setStake(Number(e.target.value))} />
          <span className="text-xs text-muted-foreground">0 or 20–500 · win pays 1.8×</span>
        </label>
        <Button className="mt-4 w-full" disabled={busy === "battle"} onClick={battle}><Swords size={18} /> {t.arena.fight}</Button>
      </Modal>

      <Modal open={Boolean(battleResult)} onClose={() => setBattleResult(null)} title={battleResult ? fmt(t.arena.battle_result_win, { name: battleResult.battle.winner_id === battleResult.battle.challenger_id ? battleResult.battle.log.challengerName : battleResult.battle.log.defenderName }) : ""}>
        {battleResult && (
          <>
            <BattleList t={t} locale={locale} battles={[battleResult.battle]} names={{}} />
            {battleResult.payout > 0 && <p className="mt-3 text-center text-success">+{battleResult.payout} {t.app.credits}</p>}
          </>
        )}
      </Modal>
    </div>
  );
}
