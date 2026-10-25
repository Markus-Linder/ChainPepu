export const pad = (n: number) => String(n).padStart(2, "0");
export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${pad(s % 60)}`;
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const fmtDate = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
};
/** Montag = 0 … Sonntag = 6 */
export const weekdayIdx = (date: Date) => (date.getDay() + 6) % 7;
export const dayKey = (w: number, d: number) => `${w}-${d}`;
