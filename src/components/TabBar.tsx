export type View = "home" | "plan" | "exercises" | "nutrition" | "progress" | "knowledge";

const TABS: { id: View; label: string; icon: JSX.Element }[] = [
  { id: "home", label: "Heute", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></svg> },
  { id: "plan", label: "Plan", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg> },
  { id: "exercises", label: "Übungen", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3z" /></svg> },
  { id: "nutrition", label: "Essen", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4v6a3 3 0 0 0 6 0V4M7 4v16" /><path d="M17 4c-2 2-2 6 0 8v8" /></svg> },
  { id: "progress", label: "Fortschritt", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19h16" /><path d="m5 15 4-5 4 3 6-8" /></svg> },
  { id: "knowledge", label: "Wissen", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z" /><path d="M20 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z" /></svg> },
];

export function TabBar({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="tabs">
      <nav aria-label="Bereiche">
        {TABS.map((t) => (
          <button key={t.id} className="tab" aria-current={view === t.id ? "page" : undefined} onClick={() => onChange(t.id)}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
