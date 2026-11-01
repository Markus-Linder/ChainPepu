import { useState } from "react";
import { Gift, Send, Swords, Trophy } from "lucide-react";
import { CATALOG, type CatalogItem, type ItemCategory } from "@shared/catalog";
import type { Dictionary } from "@/lib/i18n/en";
import { fmt } from "@/lib/i18n";
import type { ChatRow, GiftRow, QuestRow, BattleRow, MemoryRow } from "@shared/types";
import { Badge, Button, Empty, Spinner } from "@/components/ui/primitives";
import { cn, timeAgo } from "@/lib/utils";

export function itemName(t: Dictionary, slug: string) {
  const entry = (t.items as Record<string, { name: string; description: string }>)[slug];
  return entry ?? { name: slug, description: "" };
}

const RARITY: Record<CatalogItem["rarity"], string> = {
  common: "border-white/10",
  rare: "border-secondary/50",
  epic: "border-primary/60",
  legendary: "border-warning/70 shadow-glow",
};

export function GiftShop({ t, locale, credits, onGift, busy, categories, title, buttonLabel }: {
  t: Dictionary; locale: string; credits: number; busy: boolean; categories?: ItemCategory[]; title?: string; buttonLabel?: (price: number) => string;
  onGift: (item: CatalogItem, message: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [message, setMessage] = useState("");
  const [cat, setCat] = useState<ItemCategory | "all">("all");
  const cats = categories ?? (["gift", "food", "toy", "care", "potion", "cosmetic", "battle"] as ItemCategory[]);
  const items = CATALOG.filter((i) => cats.includes(i.category) && (cat === "all" || i.category === cat)).sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold"><Gift size={18} className="text-accent" /> {title ?? t.creature.gift_title}</h3>
        <span className="chip border-warning/30 text-warning">{credits.toLocaleString(locale)} {t.app.credits}</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {(["all", ...cats] as const).map((c) => (
          <button key={c} onClick={() => setCat(c)} className={cn("chip", cat === c && "border-primary text-primary")}>{c === "all" ? "✨" : t.creature.categories[c]}</button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <button key={item.slug} onClick={() => setSelected(item)} className={cn("glass flex flex-col items-center rounded-2xl border p-2 text-center transition hover:scale-[1.03]", RARITY[item.rarity], selected?.slug === item.slug && "ring-2 ring-primary")}>
            <span className="text-3xl">{item.icon}</span>
            <span className="mt-1 line-clamp-1 text-xs font-semibold">{itemName(t, item.slug).name}</span>
            <span className="text-[11px] text-warning">{item.priceCredits}</span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="mt-3 animate-fade-up space-y-2 rounded-2xl bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{selected.icon}</span>
            <div>
              <div className="font-bold">{itemName(t, selected.slug).name} <Badge className="ml-1">{selected.rarity}</Badge></div>
              <div className="text-xs text-muted-foreground">{itemName(t, selected.slug).description}</div>
            </div>
          </div>
          {!categories && <input className="input py-2 text-sm" placeholder={t.creature.gift_message} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={140} />}
          <Button className="w-full" disabled={busy || credits < selected.priceCredits} onClick={async () => { await onGift(selected, message); setMessage(""); }}>
            {busy ? <Spinner className="h-4 w-4" /> : (buttonLabel ? buttonLabel(selected.priceCredits) : fmt(t.creature.gift_send, { price: selected.priceCredits }))}
          </Button>
          {credits < selected.priceCredits && <p className="text-center text-xs text-destructive">{t.creature.not_enough_credits}</p>}
        </div>
      )}
    </div>
  );
}

export function ChatPanel({ t, name, messages, onSend, busy, disabled }: { t: Dictionary; name: string; messages: ChatRow[]; onSend: (m: string) => Promise<void>; busy: boolean; disabled?: boolean }) {
  const [text, setText] = useState("");
  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-3 text-lg font-bold">{fmt(t.creature.chat_title, { name })}</h3>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 360 }}>
        {messages.length === 0 && <Empty>{t.dashboard.no_data}</Empty>}
        {messages.map((m) => (
          <div key={m.id} className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", m.role === "creature" ? "bg-primary/20" : "ml-auto bg-white/10")}>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.user_name ?? name}</div>
            {m.content}
          </div>
        ))}
        {busy && <div className="max-w-[60%] rounded-2xl bg-primary/20 px-3 py-2 text-sm"><span className="animate-pulse">…</span></div>}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!text.trim()) return; const v = text; setText(""); await onSend(v); }}>
        <input className="input py-2" placeholder={t.creature.chat_placeholder} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} disabled={disabled} />
        <Button disabled={busy || disabled || !text.trim()} className="px-4 py-2"><Send size={16} /></Button>
      </form>
    </div>
  );
}

export function LiveFeed({ t, locale, gifts }: { t: Dictionary; locale: string; gifts: GiftRow[] }) {
  return (
    <div>
      <h3 className="mb-3 text-lg font-bold">{t.creature.live_feed}</h3>
      <div className="space-y-2">
        {gifts.length === 0 && <Empty>{t.dashboard.no_data}</Empty>}
        {gifts.map((g) => {
          const item = CATALOG.find((i) => i.slug === g.item_slug);
          return (
            <div key={g.id} className="animate-fade-up flex items-center gap-3 rounded-2xl bg-white/5 px-3 py-2 text-sm">
              <span className="text-2xl">{item?.icon ?? "🎁"}</span>
              <div className="flex-1">
                <div>{fmt(t.creature.gifted, { sender: g.sender_name, item: itemName(t, g.item_slug).name })}</div>
                {g.message && <div className="text-xs italic text-muted-foreground">“{g.message}”</div>}
              </div>
              <div className="text-right text-xs text-muted-foreground"><div className="text-warning">{g.price_credits}</div>{timeAgo(g.created_at, locale)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function QuestList({ t, name, quests }: { t: Dictionary; name: string; quests: QuestRow[] }) {
  return (
    <div className="space-y-2">
      {quests.length === 0 && <Empty>{t.dashboard.no_data}</Empty>}
      {quests.map((q) => {
        const tpl = (t.quests as Record<string, string>)[q.template_key] ?? q.template_key;
        const pct = Math.round((q.progress / q.goal) * 100);
        return (
          <div key={q.id} className={cn("rounded-2xl bg-white/5 p-3", q.completed_at && "opacity-60")}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{fmt(tpl, { name, goal: q.goal })}</span>
              <span className="text-xs text-muted-foreground">{q.audience === "creator" ? "👑" : "👥"} {q.progress}/{q.goal}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${pct}%` }} /></div>
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>{t.quests.reward}: {q.reward_xp} XP{q.reward_credits ? ` · ${q.reward_credits} ${t.app.credits}` : ""}</span>
              {q.completed_at ? <span className="text-success">{t.quests.completed}</span> : <span>{t.quests.expires} {new Date(q.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BattleList({ t, locale, battles, names, highlightId }: { t: Dictionary; locale: string; battles: BattleRow[]; names: Record<string, { name: string; slug: string }>; highlightId?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {battles.length === 0 && <Empty>{t.dashboard.no_data}</Empty>}
      {battles.map((b) => {
        const cName = names[b.challenger_id]?.name ?? b.log.challengerName;
        const dName = names[b.defender_id]?.name ?? b.log.defenderName;
        const winnerName = b.winner_id === b.challenger_id ? cName : dName;
        const won = highlightId ? b.winner_id === highlightId : undefined;
        return (
          <div key={b.id} className={cn("rounded-2xl bg-white/5 p-3 text-sm", won === true && "border border-success/30", won === false && "border border-destructive/30")}>
            <button className="flex w-full items-center justify-between" onClick={() => setOpen(open === b.id ? null : b.id)}>
              <span className="flex items-center gap-2"><Swords size={16} className="text-accent" /> <b>{cName}</b> {t.arena.vs} <b>{dName}</b></span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground"><Trophy size={14} className="text-warning" /> {winnerName} · {timeAgo(b.created_at, locale)}</span>
            </button>
            {open === b.id && (
              <div className="mt-3 max-h-56 space-y-1 overflow-y-auto border-t border-white/10 pt-2 text-xs text-muted-foreground">
                {b.log.turns.map((turn) => {
                  const attacker = turn.attackerId === b.challenger_id ? cName : dName;
                  const defender = turn.defenderId === b.challenger_id ? cName : dName;
                  return (
                    <div key={turn.turn}>
                      {turn.dodged
                        ? fmt(t.arena.turn_dodge, { attacker, defender, move: turn.move })
                        : fmt(t.arena.turn_hit, { attacker, defender, move: turn.move, damage: turn.damage, crit: turn.crit ? t.arena.crit : "" })}
                    </div>
                  );
                })}
                <div className="pt-1 font-semibold text-foreground">{fmt(t.arena.battle_result_win, { name: winnerName })} {b.stake_credits ? `· ${b.stake_credits} ${t.app.credits}` : ""}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MemoryList({ t, memories }: { t: Dictionary; memories: MemoryRow[] }) {
  const icons: Record<MemoryRow["kind"], string> = { episodic: "📖", fact: "💡", relationship: "🤝", lesson: "🎓", preference: "⭐" };
  return (
    <div className="space-y-2">
      {memories.length === 0 && <Empty>{t.dashboard.no_data}</Empty>}
      {memories.map((m) => (
        <div key={m.id} className="flex gap-3 rounded-2xl bg-white/5 p-3 text-sm">
          <span>{icons[m.kind]}</span>
          <div className="flex-1">
            <div>{m.content}</div>
            <div className="text-[11px] text-muted-foreground">{"★".repeat(m.importance)} · {new Date(m.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
