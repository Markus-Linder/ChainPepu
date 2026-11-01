
/** Per-hour decay rates. Tuned so an unattended creature survives ~3 days. */
const DECAY = {
  satiety: 3.2,
  energyAwake: 2.4,
  energyAsleep: -9,
  happiness: 2.0,
  hygiene: 1.6,
};

const HEALTH_REGEN_PER_HOUR = 1.5;
const HEALTH_DAMAGE_PER_HOUR = 4;

export type Vitals = {
  satiety: number;
  energy: number;
  happiness: number;
  hygiene: number;
  health: number;
  alive: boolean;
  sleeping: boolean;
};

export const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/** Apply elapsed time to a creature's vitals. Pure function; returns the new vitals plus flags. */
export function tick<T extends Vitals & { lastTickAt: number; diedAt: number | null }>(c: T, now = Date.now()): T & { justDied: boolean } {
  if (!c.alive) return { ...c, justDied: false };
  const hours = Math.max(0, (now - c.lastTickAt) / 3_600_000);
  if (hours < 0.001) return { ...c, justDied: false };

  let satiety = clamp(c.satiety - DECAY.satiety * hours);
  let energy = clamp(c.energy - (c.sleeping ? DECAY.energyAsleep : DECAY.energyAwake) * hours);
  let happiness = clamp(c.happiness - DECAY.happiness * hours * (c.sleeping ? 0.4 : 1));
  const hygiene = clamp(c.hygiene - DECAY.hygiene * hours);
  let sleeping = c.sleeping;
  if (sleeping && energy >= 100) sleeping = false;
  if (!sleeping && energy <= 5) sleeping = true;

  // Hunger and dirt hurt mood
  if (satiety < 20) happiness = clamp(happiness - 1.5 * hours);
  if (hygiene < 20) happiness = clamp(happiness - 1.0 * hours);

  // Health: regenerate when well cared for, take damage when neglected
  let health = c.health;
  const critical = [satiety < 15, hygiene < 10, happiness < 10, energy < 5 && !sleeping].filter(Boolean).length;
  if (critical > 0) health = clamp(health - HEALTH_DAMAGE_PER_HOUR * critical * hours);
  else if (satiety > 50 && hygiene > 40 && happiness > 40) health = clamp(health + HEALTH_REGEN_PER_HOUR * hours);

  let alive = true;
  let diedAt = c.diedAt;
  if (health <= 0) {
    alive = false;
    diedAt = now;
    satiety = 0;
    energy = 0;
  }
  return { ...c, satiety, energy, happiness, hygiene, health, sleeping, alive, diedAt, lastTickAt: now, justDied: !alive };
}

export type Mood = "ecstatic" | "happy" | "content" | "bored" | "hungry" | "tired" | "dirty" | "sick" | "sad" | "sleeping" | "dead";

export function deriveMood(v: Vitals): Mood {
  if (!v.alive) return "dead";
  if (v.sleeping) return "sleeping";
  if (v.health < 30) return "sick";
  if (v.satiety < 25) return "hungry";
  if (v.energy < 20) return "tired";
  if (v.hygiene < 25) return "dirty";
  if (v.happiness < 25) return "sad";
  if (v.happiness < 45) return "bored";
  const avg = (v.satiety + v.energy + v.happiness + v.hygiene + v.health) / 5;
  if (avg > 85) return "ecstatic";
  if (avg > 65) return "happy";
  return "content";
}

export function levelForXp(xp: number) {
  return Math.floor(Math.sqrt(xp / 60)) + 1;
}

export function xpForLevel(level: number) {
  return (level - 1) ** 2 * 60;
}

/** Overall wellbeing 0..100, used for the leaderboard "care score". */
export function careScore(v: Vitals) {
  if (!v.alive) return 0;
  return Math.round((v.satiety + v.energy + v.happiness + v.hygiene + v.health * 2) / 6);
}
