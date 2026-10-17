import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getProfile, useInvite } from "./api";
import type { Profile } from "./types";

type AuthCtx = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ session: null, profile: null, loading: true, refresh: async () => {} });
const PENDING_INVITE = "chainpepu_invite";

export function rememberInvite(token: string) {
  try { localStorage.setItem(PENDING_INVITE, token); } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) { setProfile(null); setLoading(false); return; }
    // Das Profil entsteht per Trigger kurz nach dem Nutzer; notfalls kurz warten.
    let p = await getProfile(s.user.id);
    for (let i = 0; !p && i < 5; i++) { await new Promise((r) => setTimeout(r, 400)); p = await getProfile(s.user.id); }
    setProfile(p);
    setLoading(false);
    // Offene Einladung einlösen (einmalig).
    try {
      const token = localStorage.getItem(PENDING_INVITE);
      if (token) { localStorage.removeItem(PENDING_INVITE); await useInvite(token).catch(() => {}); setProfile(await getProfile(s.user.id)); }
    } catch {}
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { void load(s); });
    supabase.auth.getSession().then(({ data }) => load(data.session));
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(async () => { if (session) setProfile(await getProfile(session.user.id)); }, [session]);

  return <Ctx.Provider value={{ session, profile, loading, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
