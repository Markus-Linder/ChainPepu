import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import type { BattleRow, ChatRow, ConversationRow, CreatureRow, GiftRow, InventoryRow, MemoryRow, PublicProfile, QuestRow } from "@shared/types";

export function useCreature(slug: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["creature", slug],
    enabled: Boolean(slug) && supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_creature", { p_slug: slug });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as CreatureRow | null;
      if (!row || !row.id) throw new Error("not_found");
      return row;
    },
    refetchInterval: 30_000,
  });
  const id = query.data?.id;
  useEffect(() => {
    if (!id || !supabaseConfigured) return;
    const ch = supabase
      .channel(`creature-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "creatures", filter: `id=eq.${id}` }, (p) => {
        qc.setQueryData(["creature", slug], (old: CreatureRow | undefined) => ({ ...(old ?? {}), ...(p.new as CreatureRow) }));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, slug, qc]);
  return query;
}

export function useOwnerProfile(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["public_profile", ownerId],
    enabled: Boolean(ownerId),
    queryFn: async () => {
      const { data } = await supabase.from("public_profiles").select("*").eq("id", ownerId).maybeSingle();
      return (data as PublicProfile | null) ?? null;
    },
  });
}

export function useGifts(creatureId: string | undefined, limit = 20) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["gifts", creatureId],
    enabled: Boolean(creatureId),
    queryFn: async () => {
      const { data } = await supabase.from("gifts").select("*").eq("creature_id", creatureId).order("created_at", { ascending: false }).limit(limit);
      return (data ?? []) as GiftRow[];
    },
  });
  useEffect(() => {
    if (!creatureId) return;
    const ch = supabase
      .channel(`gifts-${creatureId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gifts", filter: `creature_id=eq.${creatureId}` }, (p) => {
        qc.setQueryData(["gifts", creatureId], (old: GiftRow[] | undefined) => [p.new as GiftRow, ...(old ?? [])].slice(0, limit));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [creatureId, qc, limit]);
  return q;
}

export function useChat(creatureId: string | undefined, limit = 40) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["chat", creatureId],
    enabled: Boolean(creatureId),
    queryFn: async () => {
      const { data } = await supabase.from("chat_messages").select("*").eq("creature_id", creatureId).order("created_at", { ascending: false }).limit(limit);
      return ((data ?? []) as ChatRow[]).reverse();
    },
  });
  useEffect(() => {
    if (!creatureId) return;
    const ch = supabase
      .channel(`chat-${creatureId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `creature_id=eq.${creatureId}` }, (p) => {
        qc.setQueryData(["chat", creatureId], (old: ChatRow[] | undefined) => {
          const row = p.new as ChatRow;
          if (old?.some((m) => m.id === row.id)) return old;
          return [...(old ?? []), row].slice(-limit);
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [creatureId, qc, limit]);
  return q;
}

export function useMemories(creatureId: string | undefined) {
  return useQuery({
    queryKey: ["memories", creatureId],
    enabled: Boolean(creatureId),
    queryFn: async () => {
      const { data } = await supabase.from("memories").select("*").eq("creature_id", creatureId).order("created_at", { ascending: false }).limit(60);
      return (data ?? []) as MemoryRow[];
    },
  });
}

export function useQuests(creatureId: string | undefined) {
  return useQuery({
    queryKey: ["quests", creatureId],
    enabled: Boolean(creatureId),
    queryFn: async () => {
      const { data } = await supabase.from("quests").select("*").eq("creature_id", creatureId).gt("expires_at", new Date().toISOString()).order("audience");
      return (data ?? []) as QuestRow[];
    },
    refetchInterval: 20_000,
  });
}

export function useBattles(creatureId?: string, limit = 15) {
  return useQuery({
    queryKey: ["battles", creatureId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("battles").select("*").order("created_at", { ascending: false }).limit(limit);
      if (creatureId) q = q.or(`challenger_id.eq.${creatureId},defender_id.eq.${creatureId}`);
      const { data } = await q;
      return (data ?? []) as BattleRow[];
    },
    enabled: supabaseConfigured,
  });
}

export function useConversations(creatureId?: string, limit = 10) {
  return useQuery({
    queryKey: ["conversations", creatureId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("creature_conversations").select("*").order("created_at", { ascending: false }).limit(limit);
      if (creatureId) q = q.or(`creature_a_id.eq.${creatureId},creature_b_id.eq.${creatureId}`);
      const { data } = await q;
      return (data ?? []) as ConversationRow[];
    },
    enabled: supabaseConfigured,
  });
}

export function useInventory(creatureId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["inventory", creatureId],
    enabled: Boolean(creatureId) && enabled,
    queryFn: async () => {
      const { data } = await supabase.from("inventory").select("*").eq("creature_id", creatureId);
      return (data ?? []) as InventoryRow[];
    },
  });
}

export type LeaderboardRow = {
  id: string; slug: string; name: string; species: string; dna: CreatureRow["dna"]; level: number; elo: number; wins: number; losses: number; alive: boolean;
  care_score: number; owner_handle: string; owner_display_name: string; owner_avatar_url: string | null;
};

export function useLeaderboard(limit = 50) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    enabled: supabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("leaderboard", { p_limit: limit });
      if (error) throw error;
      return (data ?? []) as LeaderboardRow[];
    },
    refetchInterval: 30_000,
  });
}

/** Lightweight creature name lookup for battle/conversation lists. */
export function useCreatureNames(ids: string[]) {
  const key = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ["creature_names", key],
    enabled: key.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("creatures").select("id,slug,name,species,dna").in("id", key);
      const map: Record<string, Pick<CreatureRow, "id" | "slug" | "name" | "species" | "dna">> = {};
      for (const row of (data ?? []) as Pick<CreatureRow, "id" | "slug" | "name" | "species" | "dna">[]) map[row.id] = row;
      return map;
    },
  });
}

export function useMyCreature(userId: string | undefined) {
  return useQuery({
    queryKey: ["my_creature", userId],
    enabled: Boolean(userId) && supabaseConfigured,
    queryFn: async () => {
      const { data } = await supabase.from("creatures").select("slug").eq("owner_id", userId).maybeSingle();
      if (!data) return null;
      const { data: full } = await supabase.rpc("get_creature", { p_slug: data.slug });
      return ((Array.isArray(full) ? full[0] : full) as CreatureRow | null) ?? null;
    },
  });
}
