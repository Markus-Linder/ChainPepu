import { useCallback, useEffect, useState } from "react";

export interface MyQuote { id: string; token: string; name: string; trade: string; createdAt: string; score?: number }
const KEY = "profiangebot.meine-angebote";

function read(): MyQuote[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as MyQuote[];
  } catch {
    return [];
  }
}

export function useMyQuotes() {
  const [quotes, setQuotes] = useState<MyQuote[]>([]);
  useEffect(() => setQuotes(read()), []);
  const save = useCallback((next: MyQuote[]) => {
    setQuotes(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);
  const add = useCallback((q: MyQuote) => save([q, ...read().filter((x) => x.id !== q.id)].slice(0, 20)), [save]);
  const remove = useCallback((id: string) => save(read().filter((x) => x.id !== id)), [save]);
  return { quotes, add, remove };
}
