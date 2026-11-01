import { sha256Hex } from "./hash.ts";
import type { Dna } from "./dna.ts";

export type Combatant = {
  id: string;
  name: string;
  level: number;
  health: number; // 0..100 vitals health -> affects performance
  happiness: number;
  energy: number;
  dna: Dna;
  boost: number; // from battle items, e.g. 0.15
  elo: number;
};

export type BattleTurn = {
  turn: number;
  attackerId: string;
  defenderId: string;
  move: string;
  damage: number;
  crit: boolean;
  dodged: boolean;
  attackerHpAfter: number;
  defenderHpAfter: number;
};

export type BattleResult = {
  seed: string;
  winnerId: string;
  loserId: string;
  turns: BattleTurn[];
  /** Vital health damage applied to each creature after the fight (0..100 scale). */
  healthDamage: Record<string, number>;
  eloDelta: Record<string, number>;
  xp: Record<string, number>;
};

const MOVES: Record<Dna["body"], string[]> = {
  blob: ["Squish Slam", "Jelly Bounce", "Wobble Wave"],
  feline: ["Claw Flurry", "Pounce", "Tail Whip"],
  dragonling: ["Ember Breath", "Wing Buffet", "Tail Smash"],
  mech: ["Laser Blast", "Overclock Punch", "Rocket Dash"],
  spirit: ["Phantom Touch", "Aura Burst", "Dream Drain"],
  slime: ["Acid Splash", "Gooey Grip", "Bubble Pop"],
  owl: ["Talon Dive", "Wisdom Gaze", "Feather Storm"],
  axolotl: ["Regen Splash", "Gill Slap", "Aqua Jet"],
};

function rng(seed: string) {
  let s = parseInt(seed.slice(0, 8), 16) >>> 0 || 7;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function effective(c: Combatant) {
  const condition = 0.6 + 0.4 * (c.health / 100) * (0.5 + 0.5 * (c.energy / 100));
  const lvl = 1 + (c.level - 1) * 0.04;
  const b = 1 + c.boost;
  return {
    power: c.dna.stats.power * condition * lvl * b,
    agility: c.dna.stats.agility * condition * lvl,
    wit: c.dna.stats.wit * lvl,
    charm: c.dna.stats.charm * (0.8 + 0.4 * (c.happiness / 100)),
    hp: 100 + c.level * 6,
  };
}

/** Deterministic turn-based duel. Same inputs + same seed material => same result. */
export function simulateBattle(a: Combatant, b: Combatant, seedMaterial: string): BattleResult {
  const seed = sha256Hex(`${a.id}|${b.id}|${seedMaterial}`);
  const rand = rng(seed);
  const ea = effective(a);
  const eb = effective(b);
  let hpA = ea.hp;
  let hpB = eb.hp;
  const turns: BattleTurn[] = [];
  // faster one strikes first
  let attackerIsA = ea.agility + rand() * 10 >= eb.agility + rand() * 10;
  for (let t = 1; t <= 40 && hpA > 0 && hpB > 0; t++) {
    const att = attackerIsA ? a : b;
    const def = attackerIsA ? b : a;
    const eAtt = attackerIsA ? ea : eb;
    const eDef = attackerIsA ? eb : ea;
    const dodged = rand() < Math.min(0.35, eDef.agility / 400);
    const crit = !dodged && rand() < Math.min(0.4, eAtt.wit / 250);
    let damage = 0;
    if (!dodged) {
      const base = eAtt.power * 0.28 + rand() * 6;
      const charmShield = 1 - Math.min(0.25, eDef.charm / 500);
      damage = Math.round(base * (crit ? 1.7 : 1) * charmShield);
    }
    if (attackerIsA) hpB = Math.max(0, hpB - damage);
    else hpA = Math.max(0, hpA - damage);
    turns.push({
      turn: t,
      attackerId: att.id,
      defenderId: def.id,
      move: MOVES[att.dna.body][Math.floor(rand() * 3)],
      damage,
      crit,
      dodged,
      attackerHpAfter: Math.round(attackerIsA ? hpA : hpB),
      defenderHpAfter: Math.round(attackerIsA ? hpB : hpA),
    });
    attackerIsA = !attackerIsA;
  }
  const aWins = hpA > hpB;
  const winner = aWins ? a : b;
  const loser = aWins ? b : a;
  const [dW, dL] = eloDelta(winner.elo, loser.elo);
  // Losing a battle really hurts: vitals health damage for the loser, a scratch for the winner.
  const loserDamage = Math.round(18 + rand() * 12);
  const winnerDamage = Math.round(3 + rand() * 5);
  return {
    seed,
    winnerId: winner.id,
    loserId: loser.id,
    turns,
    healthDamage: { [winner.id]: winnerDamage, [loser.id]: loserDamage },
    eloDelta: { [winner.id]: dW, [loser.id]: dL },
    xp: { [winner.id]: 40 + Math.round(loser.level * 2), [loser.id]: 12 },
  };
}

export function eloDelta(winnerElo: number, loserElo: number, k = 32): [number, number] {
  const expectedWin = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
  const dW = Math.round(k * (1 - expectedWin));
  return [dW, -dW];
}
