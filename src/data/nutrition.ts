/* Ernährungsplan: 7 Tage, 4 Mahlzeiten, etwa 1.500 bis 1.650 kcal und über 100 g Eiweiß pro Tag.
   Die Portionen werden über den Kalorienrechner auf das persönliche Ziel skaliert. */

export interface Meal { name: string; detail: string; kcal: number; protein: number; }
export interface DayMeals { breakfast: Meal; lunch: Meal; snack: Meal; dinner: Meal; }

export const MEAL_LABELS: Record<keyof DayMeals, string> = { breakfast: "Frühstück", lunch: "Mittag", snack: "Snack", dinner: "Abend" };

export const MEAL_PLAN: DayMeals[] = [
  { breakfast: { name: "Skyr mit Beeren und Haferflocken", detail: "250 g Skyr, 100 g Beeren, 30 g Haferflocken, 1 TL Leinsamen", kcal: 380, protein: 32 },
    lunch: { name: "Hähnchen-Gemüse-Pfanne", detail: "150 g Hähnchenbrust, 300 g Paprika, Zucchini und Brokkoli, 60 g Vollkornreis (roh), 1 TL Öl", kcal: 520, protein: 42 },
    snack: { name: "Apfel mit Mandeln", detail: "1 Apfel, 20 g Mandeln", kcal: 200, protein: 5 },
    dinner: { name: "Großer Thunfischsalat", detail: "1 Dose Thunfisch (natur), 1 Ei, Blattsalat, Tomate, Gurke, 1 EL Olivenöl, Zitrone", kcal: 450, protein: 38 } },
  { breakfast: { name: "Rührei mit Spinat", detail: "2 Eier, 100 g Spinat, 1 Scheibe Vollkornbrot, Tomate", kcal: 380, protein: 26 },
    lunch: { name: "Rote Linsensuppe", detail: "80 g rote Linsen (roh), Karotte, Sellerie, Tomaten, Kreuzkümmel, 1 Scheibe Vollkornbrot", kcal: 480, protein: 26 },
    snack: { name: "Magerquark mit Zimt", detail: "150 g Magerquark, Zimt, ein paar Beeren", kcal: 120, protein: 18 },
    dinner: { name: "Lachs mit Brokkoli und Süßkartoffel", detail: "150 g Lachsfilet, 250 g Brokkoli, 150 g Süßkartoffel aus dem Ofen", kcal: 540, protein: 40 } },
  { breakfast: { name: "Overnight Oats", detail: "40 g Haferflocken, 150 g Skyr, 100 ml Milch, 1 TL Chiasamen, halbe Banane", kcal: 420, protein: 26 },
    lunch: { name: "Puten-Wrap mit viel Salat", detail: "1 Vollkorn-Wrap, 120 g Putenbrust, Salat, Paprika, 1 EL Joghurt-Dressing", kcal: 480, protein: 38 },
    snack: { name: "Gemüsesticks mit Hummus", detail: "Karotte, Gurke, Paprika, 50 g Hummus", kcal: 150, protein: 5 },
    dinner: { name: "Tofu-Gemüse-Curry", detail: "200 g Tofu, 300 g Gemüse, 100 ml Kokosmilch light, Currypaste, Blumenkohlreis", kcal: 460, protein: 30 } },
  { breakfast: { name: "Protein-Pancakes", detail: "50 g Haferflocken, 1 Ei, 100 g Magerquark, Beeren, kein Sirup", kcal: 400, protein: 30 },
    lunch: { name: "Kichererbsen-Bowl", detail: "150 g Kichererbsen, Quinoa (50 g roh), Gurke, Tomate, Feta (30 g), Zitrone, Kräuter", kcal: 520, protein: 24 },
    snack: { name: "Birne mit Walnüssen", detail: "1 Birne, 20 g Walnüsse", kcal: 220, protein: 4 },
    dinner: { name: "Hähnchen mit Ofengemüse", detail: "150 g Hähnchenbrust, 350 g Ofengemüse (Paprika, Zucchini, Rote Bete), 1 TL Öl, Kräuter", kcal: 480, protein: 45 } },
  { breakfast: { name: "Vollkornbrot mit Hüttenkäse", detail: "2 Scheiben Vollkornbrot, 150 g Hüttenkäse, Tomate, Gurke, Schnittlauch", kcal: 360, protein: 28 },
    lunch: { name: "Vollkornnudeln mit Hack-Sugo", detail: "60 g Vollkornnudeln (roh), 120 g mageres Rinderhack, Tomatensugo, Zucchini", kcal: 560, protein: 38 },
    snack: { name: "Skyr-Drink", detail: "1 Flasche Skyr-Drink oder 200 g Skyr pur", kcal: 150, protein: 17 },
    dinner: { name: "Gemüse-Omelett", detail: "3 Eier, Champignons, Paprika, Zwiebel, Beilagensalat", kcal: 420, protein: 30 } },
  { breakfast: { name: "Joghurt-Bowl", detail: "200 g griechischer Joghurt 2 %, 20 g Nüsse, 100 g Obst, Zimt", kcal: 400, protein: 22 },
    lunch: { name: "Garnelen mit Quinoa-Salat", detail: "150 g Garnelen, Quinoa (50 g roh), Avocado (halbe), Tomate, Koriander, Limette", kcal: 520, protein: 38 },
    snack: { name: "Dunkle Schokolade und Mandarine", detail: "2 Stücke Zartbitter (85 %), 1 Mandarine", kcal: 150, protein: 2 },
    dinner: { name: "Ofenlachs mit grünem Spargel", detail: "150 g Lachs, 250 g grüner Spargel, 150 g Kartoffeln, Zitrone", kcal: 520, protein: 40 } },
  { breakfast: { name: "Rührei mit Räucherlachs", detail: "2 Eier, 50 g Räucherlachs, 1 Scheibe Vollkornbrot, Gurke", kcal: 420, protein: 32 },
    lunch: { name: "Hähnchen-Gyros-Bowl", detail: "150 g Hähnchen mit Gyrosgewürz, 100 g Tzatziki (fettarm), Salat, Tomate, 1 kleines Vollkorn-Fladenbrot", kcal: 540, protein: 46 },
    snack: { name: "Beeren mit Quark", detail: "150 g Magerquark, 100 g Beeren", kcal: 150, protein: 18 },
    dinner: { name: "Gemüsesuppe mit weißen Bohnen", detail: "150 g weiße Bohnen, Lauch, Karotte, Sellerie, Tomaten, Parmesan (15 g)", kcal: 380, protein: 22 } },
];

export const NUTRITION_RULES = [
  { title: "Teller-Regel", text: "Halber Teller Gemüse oder Salat, ein Viertel Eiweiß, ein Viertel Vollkorn oder Kartoffeln. Dazu 1 TL gutes Öl." },
  { title: "Eiweiß zuerst", text: "Bei jeder Mahlzeit 25 bis 40 g Eiweiß. Das sättigt am längsten und schützt die Muskeln im Defizit." },
  { title: "Flüssige Kalorien streichen", text: "Softdrinks, Säfte, Milchkaffee-Spezialitäten und Alkohol liefern schnell 300 bis 600 kcal am Tag, ohne zu sättigen." },
  { title: "Drei Mahlzeiten plus ein Snack", text: "Feste Zeiten verhindern ständiges Naschen. Zwischen den Mahlzeiten nur Wasser, Tee oder Kaffee ohne Zucker." },
  { title: "Langsam essen", text: "Das Sättigungsgefühl kommt nach etwa 20 Minuten. Besteck zwischendurch ablegen, Handy weg, bewusst kauen." },
  { title: "80/20", text: "Vier von fünf Mahlzeiten nach Plan reichen. Ein Essen pro Woche darf frei sein, ohne schlechtes Gewissen und ohne Nachholen." },
];

export const SHOPPING_LIST: { group: string; items: string[] }[] = [
  { group: "Eiweiß", items: ["Skyr und Magerquark", "Eier (12)", "Hähnchenbrust (600 g)", "Putenbrust (120 g)", "Lachsfilet (300 g)", "Garnelen (150 g)", "Thunfisch natur (1 Dose)", "Räucherlachs (50 g)", "Mageres Rinderhack (120 g)", "Tofu (200 g)", "Hüttenkäse", "Griechischer Joghurt 2 %", "Feta, Parmesan"] },
  { group: "Gemüse & Obst", items: ["Brokkoli (2)", "Paprika (6)", "Zucchini (3)", "Spinat", "Blattsalat, Gurke, Tomaten", "Karotten, Sellerie, Lauch", "Champignons", "Grüner Spargel", "Blumenkohl", "Süßkartoffel, Kartoffeln", "Beeren (TK)", "Äpfel, Birne, Banane, Mandarinen", "Avocado, Zitrone, Limette"] },
  { group: "Vorrat", items: ["Haferflocken", "Vollkornbrot, Vollkorn-Wraps", "Vollkornnudeln, Vollkornreis, Quinoa", "Rote Linsen, Kichererbsen, weiße Bohnen", "Mandeln, Walnüsse, Leinsamen, Chiasamen", "Hummus", "Olivenöl", "Kokosmilch light, Currypaste", "Passierte Tomaten", "Zartbitterschokolade 85 %", "Gewürze: Zimt, Kreuzkümmel, Gyrosgewürz"] },
];

export interface Profile { weight: number; height: number; age: number; activity: number; }

export const ACTIVITY_LEVELS = [
  { value: 1.3, label: "Sitzend, wenig Bewegung" },
  { value: 1.45, label: "Leicht aktiv, viel zu Fuß" },
  { value: 1.6, label: "Aktiv, körperliche Arbeit" },
];

/* Mifflin-St Jeor für Frauen, Defizit 400 kcal, Untergrenze 1.300 kcal. */
export function calcTargets(p: Profile) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age - 161;
  const tdee = bmr * p.activity;
  const target = Math.max(1300, Math.round((tdee - 400) / 10) * 10);
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target,
    protein: Math.round(p.weight * 1.5),
    water: Math.round(p.weight * 35 / 100) / 10,
    fiber: 30,
  };
}

export const PLAN_BASE_KCAL = 1550;
