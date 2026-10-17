import { useCallback, useEffect, useState } from "react";

/** Lädt Daten, liefert Ladezustand und eine reload-Funktion. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => { setLoading(true); fn().then(setData).catch((e) => setError((e as Error).message)).finally(() => setLoading(false)); }, deps);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load };
}

export function Loading() {
  return <p className="muted py-10 text-center text-sm">Das Universum lädt…</p>;
}
