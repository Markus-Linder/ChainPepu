import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Coins, Gift, Users, Trophy, Wallet, MessagesSquare, Moon, Sun, Gamepad2 } from "lucide-react";
import { CreatureCanvas } from "@/components/creature/CreatureCanvas";
import { BattleList, GiftShop, MemoryList, QuestList, itemName } from "@/components/creature/Panels";
import { Badge, Button, Card, Empty, Spinner, StatBar } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { useBattles, useConversations, useCreatureNames, useGifts, useInventory, useLeaderboard, useMemories, useMyCreature, useQuests } from "@/hooks/useCreature";
import { ApiError, callFunction } from "@/lib/api";
import { useI18n } from "@/lib/i18n/client";
import { supabase } from "@/integrations/supabase/client";
import { CATALOG, type CatalogItem } from "@shared/catalog";
import { formatMoney } from "@shared/economy";
import { deriveMood } from "@shared/lifecycle";
import type { CreatureRow, InventoryRow, TransactionRow } from "@shared/types";
import { fmt } from "@/lib/i18n";
import { BRAND } from "@/config/brand";

export default function Dashboard() {
  const { t, locale } = useI18n();
  const { user, isAnonymous, profile, ready, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const mine = useMyCreature(user?.id);
  const c = mine.data ?? null;
  const gifts = useGifts(c?.id, 30);
  const quests = useQuests(c?.id);
  const battles = useBattles(c?.id);
  const convos = useConversations(c?.id, 8);
  const memories = useMemories(c?.id);
  const inventory = useInventory(c?.id);
  const leaderboard = useLeaderboard(200);
  const names = useCreatureNames([...(battles.data ?? []).flatMap((b) => [b.challenger_id, b.defender_id]), ...(convos.data ?? []).flatMap((x) => [x.creature_a_id, x.creature_b_id])]);
  const [busy, setBusy] = useState<string | null>(null);
  const [renaming, setRenaming] = useState("");

  const earnings = useQuery({
    queryKey: ["earnings", user?.id],
    enabled: Boolean(user && c),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_earnings", { p_days: 30 });
      if (error) throw error;
      return (data ?? []) as { day: string; creator_cents: number; gross_cents: number; gifts: number }[];
    },
  });
  const txs = useQuery({
    queryKey: ["transactions", c?.id],
    enabled: Boolean(c),
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").eq("creature_id", c!.id).in("type", ["gift", "payout"]).order("created_at", { ascending: false }).limit(500);
      return (data ?? []) as TransactionRow[];
    },
  });

  const totals = useMemo(() => {
    const rows = txs.data ?? [];
    const todayKey = new Date().toISOString().slice(0, 10);
    let today = 0, lifetime = 0, paid = 0, pending = 0;
    for (const r of rows) {
      if (r.type === "gift" && r.status === "completed") {
        lifetime += r.creator_cents;
        if (r.created_at.slice(0, 10) === todayKey) today += r.creator_cents;
      }
      if (r.type === "payout") {
        if (r.status === "pending") pending += r.gross_cents;
        else if (r.status === "completed") paid += r.gross_cents;
      }
    }
    const last30 = (earnings.data ?? []).reduce((a, d) => a + Number(d.creator_cents), 0);
    return { today, last30, lifetime, balance: lifetime - paid - pending, pending };
  }, [txs.data, earnings.data]);

  const supporters = useMemo(() => {
    const map = new Map<string, { name: string; credits: number; count: number }>();
    for (const g of gifts.data ?? []) {
      const k = g.sender_id ?? g.sender_name;
      const e = map.get(k) ?? { name: g.sender_name, credits: 0, count: 0 };
      e.credits += g.price_credits; e.count++; map.set(k, e);
    }
    return [...map.values()].sort((a, b) => b.credits - a.credits).slice(0, 5);
  }, [gifts.data]);

  const rank = useMemo(() => (c && leaderboard.data ? leaderboard.data.findIndex((r) => r.id === c.id) + 1 : 0), [c, leaderboard.data]);

  if (!ready || mine.isLoading) return <div className="grid min-h-[60vh] place-items-center"><Spinner /></div>;
  if (!user || isAnonymous) { navigate("/login?next=/dashboard", { replace: true }); return null; }
  if (!c) {
    return (
      <div className="container py-24 text-center">
        <h1 className="text-3xl font-bold">{t.dashboard.no_creature}</h1>
        <Link to="/onboarding" className="btn-primary mt-6">{t.dashboard.hatch_now}</Link>
      </div>
    );
  }

  const setCreature = (next: CreatureRow) => qc.setQueryData(["my_creature", user.id], next);
  const handleError = (e: unknown) => {
    toast({ title: t.app.error_generic, description: e instanceof ApiError ? e.message : (e as Error).message, variant: "error" });
    if (e instanceof ApiError && e.code === "insufficient_credits") navigate("/pricing");
  };
  const action = async (body: Record<string, unknown>, key: string) => {
    setBusy(key);
    try {
      const res = await callFunction<{ creature: CreatureRow; inventory?: InventoryRow[]; leveledUp?: boolean; completedQuests?: string[] }>("creature-action", { slug: c.slug, ...body });
      setCreature(res.creature);
      if (res.inventory) qc.setQueryData(["inventory", c.id], res.inventory);
      if (res.leveledUp) toast({ title: `🎉 ${t.app.level} ${res.creature.level}!`, variant: "success" });
      if (res.completedQuests?.length) toast({ title: `✅ ${t.quests.completed}`, description: res.completedQuests.join(", "), variant: "success" });
      quests.refetch();
      await refreshProfile();
    } catch (e) { handleError(e); } finally { setBusy(null); }
  };
  const buy = async (item: CatalogItem) => action({ action: "buy_item", itemSlug: item.slug, qty: 1 }, `buy-${item.slug}`);
  const converse = async () => {
    setBusy("converse");
    try {
      await callFunction("converse", {});
      convos.refetch(); memories.refetch(); quests.refetch(); await refreshProfile();
      toast({ title: "💬", description: t.dashboard.start_conversation, variant: "success" });
    } catch (e) { handleError(e); } finally { setBusy(null); }
  };
  const payout = async () => {
    setBusy("payout");
    try {
      await callFunction("payout", {});
      toast({ title: t.dashboard.payout_requested, variant: "success" });
      txs.refetch();
    } catch (e) { handleError(e); } finally { setBusy(null); }
  };
  const updateSettings = async (patch: { name?: string; accepts_battles?: boolean }) => {
    const { data, error } = await supabase.from("creatures").update(patch).eq("id", c.id).select("*").single();
    if (error) return toast({ title: t.app.error_generic, description: error.message, variant: "error" });
    setCreature(data as CreatureRow);
    toast({ title: "✓", variant: "success" });
  };

  const mood = deriveMood(c);
  const chartData = (earnings.data ?? []).map((d) => ({ day: d.day.slice(5), eur: Number(d.creator_cents) / 100, gifts: Number(d.gifts) }));
  const inv = (inventory.data ?? []).filter((i) => i.qty > 0);

  return (
    <div className="container py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">{t.dashboard.title}</h1>
          <p className="text-sm text-muted-foreground">{t.dashboard.revenue_split}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={profile?.subscription_status === "active" ? "success" : "warning"}>{t.dashboard.subscription}: {t.dashboard.status[profile?.subscription_status ?? "none"]}</Badge>
          <Link to={`/c/${c.slug}`} className="btn-secondary px-4 py-2 text-sm">{t.app.view_page}</Link>
          <Link to="/pricing" className="btn-primary px-4 py-2 text-sm"><Coins size={16} /> {t.app.buy_credits}</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi icon={<Wallet />} label={t.dashboard.balance} value={formatMoney(totals.balance, locale)} accent />
        <Kpi icon={<Coins />} label={t.dashboard.earnings_today} value={formatMoney(totals.today, locale)} />
        <Kpi icon={<Coins />} label={t.dashboard.earnings_30d} value={formatMoney(totals.last30, locale)} />
        <Kpi icon={<Gift />} label={t.dashboard.gifts_count} value={String(gifts.data?.length ?? 0)} />
        <Kpi icon={<Trophy />} label={t.dashboard.rank} value={rank ? `#${rank}` : "–"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <div className="h-[380px]"><CreatureCanvas dna={c.dna} mood={mood} cosmetics={c.cosmetics} className="h-full shadow-glow" /></div>
          <Card>
            <div className="flex items-center justify-between">
              <div><h2 className="text-2xl font-bold">{c.name}</h2><p className="text-sm text-muted-foreground">{c.species} · {t.app.level} {c.level} · {(t.creature.mood as Record<string, string>)[mood]}</p></div>
              <Badge>{fmt(t.creature.record, { wins: c.wins, losses: c.losses })}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatBar label={t.creature.satiety} value={c.satiety} color="linear-gradient(90deg,#f97316,#fbbf24)" />
              <StatBar label={t.creature.energy} value={c.energy} color="linear-gradient(90deg,#22d3ee,#60a5fa)" />
              <StatBar label={t.creature.happiness} value={c.happiness} color="linear-gradient(90deg,#f472b6,#a78bfa)" />
              <StatBar label={t.creature.hygiene} value={c.hygiene} color="linear-gradient(90deg,#34d399,#a3e635)" />
              <StatBar label={t.creature.health} value={c.health} color="linear-gradient(90deg,#ef4444,#f97316)" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" className="text-sm" disabled={busy === "play" || !c.alive || c.sleeping} onClick={() => action({ action: "play" }, "play")}><Gamepad2 size={16} /> {t.creature.play}</Button>
              {c.sleeping
                ? <Button variant="secondary" className="text-sm" disabled={!c.alive} onClick={() => action({ action: "wake" }, "wake")}><Sun size={16} /> {t.creature.wake}</Button>
                : <Button variant="secondary" className="text-sm" disabled={!c.alive} onClick={() => action({ action: "sleep" }, "sleep")}><Moon size={16} /> {t.creature.sleep}</Button>}
              <Button variant="secondary" className="text-sm" disabled={busy === "converse" || !c.alive} onClick={converse}><MessagesSquare size={16} /> {t.dashboard.start_conversation} (15)</Button>
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 text-lg font-bold">{t.dashboard.inventory}</h3>
            {inv.length === 0 && <Empty>{t.dashboard.no_data}</Empty>}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {inv.map((i) => {
                const item = CATALOG.find((x) => x.slug === i.item_slug);
                return (
                  <button key={i.item_slug} disabled={Boolean(busy) || (!c.alive && !item?.effects.revive)} onClick={() => action({ action: "use_item", itemSlug: i.item_slug }, `use-${i.item_slug}`)} className="glass flex flex-col items-center rounded-2xl p-2 text-center hover:scale-[1.03] disabled:opacity-50">
                    <span className="text-3xl">{item?.icon}</span>
                    <span className="line-clamp-1 text-xs font-semibold">{itemName(t, i.item_slug).name}</span>
                    <span className="text-[11px] text-muted-foreground">×{i.qty} · {t.creature.use}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-5">
              <GiftShop t={t} locale={locale} credits={profile?.credits ?? 0} busy={busy?.startsWith("buy-") ?? false} onGift={buy} categories={["food", "care", "toy", "potion", "battle"]} title={t.creature.shop} buttonLabel={(p) => fmt(t.creature.buy_for, { price: p })} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-lg font-bold">{t.dashboard.earnings_chart}</h3>
            <div className="h-56">
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(262 90% 66%)" stopOpacity={0.6} /><stop offset="100%" stopColor="hsl(262 90% 66%)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#888", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#888", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#14141f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} formatter={(v) => formatMoney(Math.round(Number(v) * 100), locale)} />
                  <Area type="monotone" dataKey="eur" stroke="hsl(262 90% 66%)" fill="url(#g)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h3 className="mb-3 text-lg font-bold">{t.dashboard.payouts}</h3>
              <div className="text-3xl font-extrabold">{formatMoney(totals.balance, locale)}</div>
              <p className="text-xs text-muted-foreground">{t.dashboard.payout_min}{totals.pending ? ` · pending ${formatMoney(totals.pending, locale)}` : ""}</p>
              <Button className="mt-3 w-full" disabled={busy === "payout" || totals.balance < 2000} onClick={payout}>{t.dashboard.request_payout}</Button>
              <p className="mt-2 text-[11px] text-muted-foreground">{t.dashboard.earnings_total}: {formatMoney(totals.lifetime, locale)} · {BRAND.creatorSharePercent}%</p>
            </Card>
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold"><Users size={18} /> {t.dashboard.supporters}</h3>
              {supporters.length === 0 && <Empty>{t.dashboard.no_data}</Empty>}
              <div className="space-y-2 text-sm">
                {supporters.map((s, i) => (
                  <div key={s.name + i} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"><span>{["🥇", "🥈", "🥉", "4.", "5."][i]} {s.name}</span><span className="text-warning">{s.credits} ({s.count})</span></div>
                ))}
              </div>
            </Card>
          </div>
          <Card>
            <h3 className="mb-3 text-lg font-bold">{t.dashboard.recent_gifts}</h3>
            <div className="max-h-64 space-y-1 overflow-y-auto text-sm">
              {(gifts.data ?? []).map((g) => {
                const item = CATALOG.find((i) => i.slug === g.item_slug);
                const creatorCents = g.sender_id === user.id ? 0 : Math.round(g.price_credits * 0.8);
                return (
                  <div key={g.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                    <span>{item?.icon} {g.sender_name}{g.message ? <span className="text-xs text-muted-foreground"> · “{g.message}”</span> : null}</span>
                    <span className="text-success">+{formatMoney(creatorCents, locale)}</span>
                  </div>
                );
              })}
              {(gifts.data?.length ?? 0) === 0 && <Empty>{t.dashboard.no_data}</Empty>}
            </div>
          </Card>
          <Card><h3 className="mb-3 text-lg font-bold">{t.dashboard.quests}</h3><QuestList t={t} name={c.name} quests={quests.data ?? []} /></Card>
          <Card><h3 className="mb-3 text-lg font-bold">{t.dashboard.battles}</h3><BattleList t={t} locale={locale} battles={battles.data ?? []} names={names.data ?? {}} highlightId={c.id} /></Card>
          <Card>
            <h3 className="mb-3 text-lg font-bold">{t.dashboard.conversations}</h3>
            {(convos.data?.length ?? 0) === 0 && <Empty>{t.dashboard.no_data}</Empty>}
            <div className="space-y-3 text-sm">
              {(convos.data ?? []).map((cv) => {
                const otherId = cv.creature_a_id === c.id ? cv.creature_b_id : cv.creature_a_id;
                const other = names.data?.[otherId];
                return (
                  <div key={cv.id} className="rounded-2xl bg-white/5 p-3">
                    <div className="mb-1 text-xs text-muted-foreground">{cv.topic} · {other ? <Link className="underline" to={`/c/${other.slug}`}>{other.name}</Link> : "…"} · {cv.relationship}</div>
                    {cv.transcript.map((l, i) => <div key={i}><b>{l.speaker}:</b> {l.text}</div>)}
                  </div>
                );
              })}
            </div>
          </Card>
          <Card><h3 className="mb-3 text-lg font-bold">{t.dashboard.memories}</h3><MemoryList t={t} memories={memories.data ?? []} /></Card>
          <Card>
            <h3 className="mb-3 text-lg font-bold">{t.dashboard.settings}</h3>
            <label className="flex items-center justify-between text-sm"><span>{t.dashboard.accepts_battles}</span>
              <input type="checkbox" checked={c.accepts_battles} onChange={(e) => updateSettings({ accepts_battles: e.target.checked })} className="h-5 w-5 accent-[hsl(262_90%_66%)]" />
            </label>
            <div className="mt-3 flex gap-2">
              <input className="input py-2" placeholder={t.dashboard.rename} value={renaming} onChange={(e) => setRenaming(e.target.value)} maxLength={24} />
              <Button variant="secondary" className="py-2" disabled={renaming.trim().length < 2} onClick={() => { updateSettings({ name: renaming.trim() }); setRenaming(""); }}>{t.app.save}</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "bg-gradient-to-br from-primary/30 to-card" : ""}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 text-2xl font-extrabold tabular-nums">{value}</div>
    </Card>
  );
}
