import { TRADES } from "@/data/trades";

export function TradeSelect({ value, onChange, id = "trade" }: { value: string; onChange: (v: string) => void; id?: string }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {TRADES.map((t) => (
        <option key={t.slug} value={t.slug}>{t.name}</option>
      ))}
      <option value="sonstiges">Sonstiges Gewerk</option>
    </select>
  );
}
