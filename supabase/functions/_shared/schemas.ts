import { z } from "npm:zod@4.6.7";

export const PositionSchema = z.object({
  pos: z.string().describe("Positionsnummer wie im Angebot, sonst laufende Nummer"),
  description: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  unit_price: z.number().nullable().describe("Einzelpreis brutto in EUR, falls erkennbar"),
  total: z.number().nullable().describe("Gesamtpreis der Position brutto in EUR"),
  assessment: z.enum(["ok", "erhoeht", "guenstig", "unklar"]),
  benchmark_min: z.number().nullable(),
  benchmark_max: z.number().nullable(),
  comment: z.string().describe("Kurze Bewertung, max. 2 Sätze"),
});

export const AnalysisSchema = z.object({
  summary: z.string().describe("3 bis 5 Sätze Gesamteinschätzung in einfacher Sprache"),
  trade_detected: z.string(),
  company_name: z.string().nullable(),
  quote_date: z.string().nullable(),
  quote_number: z.string().nullable(),
  total_net: z.number().nullable(),
  total_gross: z.number().nullable(),
  vat_rate: z.number().nullable(),
  is_pauschal: z.boolean().describe("true, wenn überwiegend Pauschalpreise statt Einheitspreise"),
  score: z.number().min(0).max(100).describe("Gesamtqualität des Angebots: 100 = vollständig, transparent, marktüblich"),
  price_assessment: z.object({
    verdict: z.enum(["guenstig", "marktueblich", "erhoeht", "deutlich_erhoeht", "nicht_beurteilbar"]),
    comparable_min: z.number().nullable().describe("Untere Marktspanne für den Gesamtumfang in EUR brutto"),
    comparable_max: z.number().nullable(),
    explanation: z.string(),
  }),
  positions: z.array(PositionSchema),
  missing_positions: z.array(z.object({
    title: z.string(),
    why: z.string(),
    risk: z.enum(["hoch", "mittel", "niedrig"]),
    estimated_cost_min: z.number().nullable(),
    estimated_cost_max: z.number().nullable(),
  })),
  risks: z.array(z.object({ title: z.string(), detail: z.string(), severity: z.enum(["hoch", "mittel", "niedrig"]) })),
  formal_checks: z.array(z.object({ item: z.string(), status: z.enum(["ok", "fehlt", "unklar"]), note: z.string().nullable() })),
  questions_for_contractor: z.array(z.string()),
  negotiation_tips: z.array(z.string()),
  savings_potential_eur: z.number().nullable().describe("Realistisches Einsparpotenzial in EUR durch Nachverhandlung und Klärung"),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export const LvSchema = z.object({
  title: z.string(),
  trade: z.string(),
  summary: z.string().describe("Kurzbeschreibung des Vorhabens in 2 bis 4 Sätzen"),
  assumptions: z.array(z.string()).describe("Annahmen, die der Kunde bestätigen sollte"),
  positions: z.array(z.object({
    pos: z.string(),
    title: z.string(),
    description: z.string().describe("Ausführungsbeschreibung in VOB-üblicher Form, so dass Betriebe vergleichbar kalkulieren können"),
    quantity: z.number().nullable(),
    unit: z.string(),
    note: z.string().nullable(),
  })),
  optional_positions: z.array(z.object({ title: z.string(), description: z.string() })),
  questions_to_clarify: z.array(z.string()),
  estimated_range: z.object({ min: z.number().nullable(), max: z.number().nullable() }),
  timeline_weeks: z.number().nullable(),
});
export type Lv = z.infer<typeof LvSchema>;

export const ComparisonSchema = z.object({
  overview: z.string(),
  table: z.array(z.object({
    quote_id: z.string(),
    company: z.string().nullable(),
    total_gross: z.number().nullable(),
    score: z.number(),
    missing_count: z.number(),
    verdict: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  })),
  scope_differences: z.array(z.object({ topic: z.string(), per_quote: z.array(z.object({ quote_id: z.string(), value: z.string() })) })),
  normalized_totals: z.array(z.object({ quote_id: z.string(), normalized_total: z.number().nullable(), explanation: z.string() })).describe("Gesamtpreise nach Ergänzung fehlender Positionen, damit gleicher Leistungsumfang verglichen wird"),
  recommendation: z.string(),
  questions: z.array(z.object({ quote_id: z.string(), question: z.string() })),
});
export type Comparison = z.infer<typeof ComparisonSchema>;

/** Kostenlose Vorschau: zeigt genug, um Vertrauen zu schaffen, aber nicht die vollständige Auswertung. */
export function buildPreview(a: Analysis) {
  return {
    summary: a.summary,
    trade_detected: a.trade_detected,
    company_name: a.company_name,
    total_gross: a.total_gross,
    total_net: a.total_net,
    is_pauschal: a.is_pauschal,
    score: a.score,
    price_assessment: { verdict: a.price_assessment.verdict, explanation: a.price_assessment.explanation, comparable_min: null, comparable_max: null },
    positions_count: a.positions.length,
    positions_flagged: a.positions.filter((p) => p.assessment !== "ok").length,
    missing_positions_count: a.missing_positions.length,
    missing_positions: a.missing_positions.slice(0, 2).map((m) => ({ title: m.title, risk: m.risk })),
    risks_count: a.risks.length,
    risks: a.risks.slice(0, 1).map((r) => ({ title: r.title, severity: r.severity })),
    formal_checks_failed: a.formal_checks.filter((f) => f.status !== "ok").length,
    questions_count: a.questions_for_contractor.length,
    savings_potential_eur: a.savings_potential_eur,
    preview: true,
  };
}
