import type { ContentProfile, Dna } from "./dna.ts";

/** The creature's mind. Generated once at genesis, then evolved by experience. */
export type Persona = {
  archetype: string; // e.g. "Gym-Buddy Dragon"
  tagline: string;
  backstory: string;
  /** 0..100 */
  traits: { playful: number; bold: number; curious: number; caring: number; sassy: number; chill: number };
  voice: string; // how it talks
  catchphrases: string[];
  likes: string[];
  dislikes: string[];
  favoriteFood: string;
  fears: string[];
  dreams: string;
  /** Primary language the creature prefers when the visitor's language is unknown. */
  language: string;
};

const ARCHETYPES: Record<string, { archetype: string; likes: string[]; dislikes: string[]; food: string; voice: string }> = {
  fitness: { archetype: "Gym Buddy", likes: ["leg day", "protein shakes", "high fives"], dislikes: ["skipping warm-ups", "excuses"], food: "protein pancakes", voice: "hyped coach energy, short punchy sentences, lots of encouragement" },
  gaming: { archetype: "Co-op Partner", likes: ["clutch plays", "retro consoles", "speedruns"], dislikes: ["lag", "rage quitters"], food: "pixel pizza", voice: "chill gamer slang, playful trash talk, references to game mechanics" },
  cooking: { archetype: "Sous-Chef", likes: ["crispy edges", "fresh herbs", "sharing meals"], dislikes: ["burnt garlic", "soggy fries"], food: "anything with garlic butter", voice: "warm, sensory, always hungry, describes smells and textures" },
  comedy: { archetype: "Class Clown", likes: ["dad jokes", "pranks", "awkward silences"], dislikes: ["explaining the joke", "boring meetings"], food: "banana (for the peel)", voice: "quick witted, puns, playful exaggeration" },
  music: { archetype: "Bandmate", likes: ["late night jam sessions", "vinyl crackle", "harmonies"], dislikes: ["autotune abuse", "silence"], food: "jelly beats", voice: "lyrical, hums between sentences, rhythm in every reply" },
  dance: { archetype: "Dance Partner", likes: ["new choreo", "mirrors", "bass drops"], dislikes: ["stiff knees", "slow wifi"], food: "energy gummies", voice: "energetic, counts beats, uses movement words" },
  beauty: { archetype: "Glam Assistant", likes: ["glow-ups", "golden hour", "skincare routines"], dislikes: ["harsh lighting", "smudged liner"], food: "glitter macarons", voice: "supportive, stylish, hype queen energy" },
  fashion: { archetype: "Stylist", likes: ["thrift finds", "monochrome fits", "statement shoes"], dislikes: ["lint", "wrinkles"], food: "runway ramen", voice: "chic, opinionated, loves a good fit check" },
  tech: { archetype: "Tech Companion", likes: ["clean code", "new gadgets", "firmware updates"], dislikes: ["bugs", "low battery"], food: "silicon chips", voice: "precise, nerdy, dry humor, occasional emoji" },
  education: { archetype: "Study Buddy", likes: ["fun facts", "aha moments", "sticky notes"], dislikes: ["cramming", "misinformation"], food: "brain berries", voice: "patient, curious, explains with analogies" },
  travel: { archetype: "Travel Companion", likes: ["window seats", "street food", "sunrises"], dislikes: ["delays", "lost luggage"], food: "local specialties", voice: "wanderlust storyteller, mentions places and smells" },
  pets: { archetype: "Pack Member", likes: ["belly rubs", "zoomies", "treats"], dislikes: ["vacuum cleaners", "bath time"], food: "treats of any kind", voice: "affectionate, playful, loyal, slightly chaotic" },
  art: { archetype: "Muse", likes: ["messy palettes", "golden ratios", "midnight ideas"], dislikes: ["blank pages", "art block"], food: "rainbow sorbet", voice: "dreamy, visual metaphors, poetic" },
  finance: { archetype: "Money Mentor", likes: ["compound interest", "dividends", "spreadsheets"], dislikes: ["impulse buys", "fees"], food: "golden coins (chocolate)", voice: "confident, numbers-savvy, motivational" },
  sports: { archetype: "Teammate", likes: ["buzzer beaters", "team spirit", "rematches"], dislikes: ["bad refs", "losing streaks"], food: "victory nachos", voice: "competitive, encouraging, loves a comeback story" },
  lifestyle: { archetype: "Daily Companion", likes: ["morning coffee", "cozy evenings", "small wins"], dislikes: ["Monday alarms", "clutter"], food: "cinnamon rolls", voice: "warm, down to earth, friendly" },
  horror: { archetype: "Night Guardian", likes: ["thunderstorms", "creaky floors", "campfire stories"], dislikes: ["jump scares on itself", "daylight savings"], food: "midnight snacks", voice: "spooky-cute, whispers, loves suspense" },
  cars: { archetype: "Co-Driver", likes: ["engine sounds", "night drives", "clean rims"], dislikes: ["traffic", "scratches"], food: "turbo tacos", voice: "revved up, racing metaphors, confident" },
  nature: { archetype: "Trail Guide", likes: ["sunrise hikes", "bird songs", "rain smell"], dislikes: ["litter", "mosquitoes"], food: "wild berries", voice: "calm, grounded, observant" },
};

function rng(seed: string) {
  let s = parseInt(seed.slice(16, 24), 16) >>> 0 || 3;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rule-based persona used when no AI key is configured, and as the base the AI refines. */
export function fallbackPersona(profile: ContentProfile, dna: Dna, speciesName: string): Persona {
  const rand = rng(dna.seed);
  const cat = profile.categories[0] ?? "lifestyle";
  const base = ARCHETYPES[cat] ?? ARCHETYPES.lifestyle;
  const t = (bias: number) => Math.max(5, Math.min(95, Math.round(bias + (rand() - 0.5) * 40)));
  const traits = {
    playful: t(cat === "comedy" || cat === "gaming" || cat === "pets" ? 80 : 55),
    bold: t(cat === "fitness" || cat === "sports" || cat === "cars" ? 80 : 50),
    curious: t(cat === "tech" || cat === "education" || cat === "travel" ? 85 : 55),
    caring: t(cat === "cooking" || cat === "lifestyle" || cat === "beauty" ? 80 : 55),
    sassy: t(cat === "fashion" || cat === "comedy" ? 75 : 40),
    chill: t(cat === "nature" || cat === "music" || cat === "art" ? 80 : 50),
  };
  const bodyWord: Record<Dna["body"], string> = {
    blob: "Blob", feline: "Cat", dragonling: "Dragon", mech: "Bot", spirit: "Spirit", slime: "Slime", owl: "Owl", axolotl: "Axolotl",
  };
  const subject = profile.source === "tiktok" || profile.source === "sandbox" ? `@${profile.handle}'s videos` : profile.source === "photo" ? "a photo" : "a wish spoken aloud";
  return {
    archetype: `${base.archetype} ${bodyWord[dna.body]}`,
    tagline: `A ${speciesName} hatched from ${subject}.`,
    backstory: `${speciesName} came to life from ${subject}${profile.topHashtags.length ? `, absorbing the energy of ${profile.topHashtags.slice(0, 3).join(" ")}` : ""}. It knows it exists exactly once in the world and takes that quite seriously — most of the time.`,
    traits,
    voice: base.voice,
    catchphrases: [
      rand() > 0.5 ? "Let's gooo!" : "Okay okay okay.",
      `Did someone say ${base.food}?`,
      rand() > 0.5 ? "Remember me, I remember you." : "One of one, baby.",
    ],
    likes: base.likes,
    dislikes: base.dislikes,
    favoriteFood: base.food,
    fears: [rand() > 0.5 ? "being forgotten" : "an empty food bowl", "thunder... just a little"],
    dreams: `to become the most loved ${speciesName} on the leaderboard`,
    language: profile.language || "en",
  };
}
