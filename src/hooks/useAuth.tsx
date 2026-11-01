import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import type { ProfileRow } from "@shared/types";

type AuthCtx = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  isAnonymous: boolean;
  refreshProfile: () => Promise<void>;
  /** Ensures there is at least an anonymous session so visitors can gift/chat. */
  ensureSession: () => Promise<Session | null>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [ready, setReady] = useState(false);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) return setProfile(null);
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile((data as ProfileRow | null) ?? null);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session?.user.id).finally(() => setReady(true));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      loadProfile(s?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // Live credit balance updates (gifts, purchases) via realtime on own profile.
  useEffect(() => {
    const uid = session?.user.id;
    if (!uid || !supabaseConfigured) return;
    const channel = supabase
      .channel(`profile-${uid}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${uid}` }, (payload) => setProfile(payload.new as ProfileRow))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  const ensureSession = useCallback(async () => {
    if (!supabaseConfigured) return null;
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error(error);
      return null;
    }
    return anon.session;
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      profile,
      isAnonymous: Boolean(session?.user?.is_anonymous),
      refreshProfile: () => loadProfile(session?.user.id),
      ensureSession,
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [ready, session, profile, loadProfile, ensureSession],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
