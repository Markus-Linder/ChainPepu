/** Daily quest templates. `eventType` is what the backend records when something happens. */
export type QuestTemplate = {
  key: string;
  audience: "creator" | "community";
  eventType: "feed" | "play" | "clean" | "gift" | "chat" | "battle_win" | "visitors" | "converse";
  goal: number;
  rewardCredits: number;
  rewardXp: number;
};

export const QUEST_TEMPLATES: QuestTemplate[] = [
  { key: "feed", audience: "community", eventType: "feed", goal: 3, rewardCredits: 0, rewardXp: 30 },
  { key: "play", audience: "community", eventType: "play", goal: 3, rewardCredits: 0, rewardXp: 30 },
  { key: "clean", audience: "community", eventType: "clean", goal: 1, rewardCredits: 0, rewardXp: 15 },
  { key: "gift", audience: "community", eventType: "gift", goal: 5, rewardCredits: 0, rewardXp: 60 },
  { key: "chat", audience: "community", eventType: "chat", goal: 10, rewardCredits: 0, rewardXp: 50 },
  { key: "visitors", audience: "community", eventType: "visitors", goal: 25, rewardCredits: 0, rewardXp: 40 },
  { key: "battle_win", audience: "creator", eventType: "battle_win", goal: 1, rewardCredits: 40, rewardXp: 80 },
  { key: "converse", audience: "creator", eventType: "converse", goal: 1, rewardCredits: 20, rewardXp: 40 },
  { key: "play", audience: "creator", eventType: "play", goal: 2, rewardCredits: 10, rewardXp: 20 },
];

/** Deterministic daily selection: 3 community + 2 creator quests per creature per day. */
export function pickDailyQuests(creatureId: string, dayKey: string) {
  let h = 2166136261;
  for (const ch of `${creatureId}:${dayKey}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const shuffle = <T>(arr: T[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
      const j = h % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const community = shuffle(QUEST_TEMPLATES.filter((q) => q.audience === "community")).slice(0, 3);
  const creator = shuffle(QUEST_TEMPLATES.filter((q) => q.audience === "creator")).slice(0, 2);
  return [...community, ...creator];
}
