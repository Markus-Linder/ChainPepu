/** Das tägliche Universums-Ereignis: eine Kette, die alle gemeinsam bauen. */

const THEMES = [
  "Zeig uns den schönsten Ort, an dem du heute warst",
  "Ein Satz, der dein Jahr beschreibt",
  "Das Essen, das dich gerade glücklich macht",
  "Dein Blick aus dem Fenster, genau jetzt",
  "Ein Wort, das du heute zu oft gehört hast",
  "Was war heute das Komischste, das du gesehen hast?",
  "Ein Lied, das heute in deinem Kopf läuft",
  "Dein Haustier oder das Tier, das du heute getroffen hast",
  "Dein Arbeitsplatz oder dein Chaos",
  "Ein Rat, den du dir selbst vor 5 Jahren geben würdest",
  "Der Himmel über dir, jetzt",
  "Ein Gegenstand, den du nie weggeben würdest",
  "Etwas, worauf du dich diese Woche freust",
  "Der Schuh, den du gerade trägst",
  "Was hast du heute gelernt?",
  "Dein Lieblings-Emoji und warum",
  "Das letzte Foto in deiner Galerie",
  "Ein Geräusch, das du heute gehört hast, in Worten",
  "Dein Getränk, genau jetzt",
  "Eine Sache, die heute besser lief als gedacht",
  "Beschreibe deinen Tag in genau drei Wörtern",
  "Das Beste, das dir heute jemand gesagt hat",
  "Ein Ort, an den du sofort reisen würdest",
  "Dein Blick nach oben",
  "Was liegt gerade neben dir?",
  "Eine Frage, auf die du heute keine Antwort hattest",
  "Zeig uns etwas Rotes",
  "Dein Lieblingsplatz zu Hause",
  "Was wünschst du der Person, die nach dir anhängt?",
  "Eine kleine Sache, die heute groß war",
  "Ein Blick in deine Tasche",
];

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function themeForDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const idx = (y * 372 + m * 31 + d) % THEMES.length;
  return THEMES[idx];
}

export function secondsUntilMidnightUtc(now = new Date()): number {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
}
