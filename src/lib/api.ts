import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

async function extractError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
    } catch {
      /* ignore */
    }
    return "Der Server hat die Anfrage abgelehnt.";
  }
  if (error instanceof Error) return error.message;
  return "Unbekannter Fehler";
}

export async function invoke<T>(name: string, body: FormData | Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw new Error(await extractError(error));
  if (data && typeof data === "object" && "error" in (data as Record<string, unknown>) && (data as Record<string, unknown>).error) {
    throw new Error(String((data as Record<string, unknown>).error));
  }
  return data as T;
}

export interface AnalyzeResult { id: string; token: string; score: number }
export function analyzeQuote(form: FormData) {
  return invoke<AnalyzeResult>("analyze-quote", form);
}

export interface Position {
  pos: string; description: string; quantity: number | null; unit: string | null; unit_price: number | null; total: number | null;
  assessment: "ok" | "erhoeht" | "guenstig" | "unklar"; benchmark_min: number | null; benchmark_max: number | null; comment: string;
}
export interface FullAnalysis {
  summary: string; trade_detected: string; company_name: string | null; quote_date: string | null; quote_number: string | null;
  total_net: number | null; total_gross: number | null; vat_rate: number | null; is_pauschal: boolean; score: number;
  price_assessment: { verdict: string; comparable_min: number | null; comparable_max: number | null; explanation: string };
  positions: Position[];
  missing_positions: { title: string; why: string; risk: "hoch" | "mittel" | "niedrig"; estimated_cost_min: number | null; estimated_cost_max: number | null }[];
  risks: { title: string; detail: string; severity: "hoch" | "mittel" | "niedrig" }[];
  formal_checks: { item: string; status: "ok" | "fehlt" | "unklar"; note: string | null }[];
  questions_for_contractor: string[];
  negotiation_tips: string[];
  savings_potential_eur: number | null;
  preview?: PreviewAnalysis;
}
export interface PreviewAnalysis {
  summary: string; trade_detected: string; company_name: string | null; total_gross: number | null; total_net: number | null; is_pauschal: boolean; score: number;
  price_assessment: { verdict: string; explanation: string; comparable_min: null; comparable_max: null };
  positions_count: number; positions_flagged: number; missing_positions_count: number;
  missing_positions: { title: string; risk: string }[]; risks_count: number; risks: { title: string; severity: string }[];
  formal_checks_failed: number; questions_count: number; savings_potential_eur: number | null; preview: true;
}
export interface QuoteReport {
  id: string; trade: string; project_title: string | null; file_name: string | null; status: "pending" | "processing" | "done" | "failed";
  error: string | null; premium: boolean; plz: string | null; city: string | null; created_at: string;
  analysis: (FullAnalysis & { preview?: PreviewAnalysis }) | null; lead_released: boolean;
}

export async function getQuoteReport(id: string, token: string): Promise<QuoteReport | null> {
  const { data, error } = await supabase.rpc("get_quote_report", { p_id: id, p_token: token });
  if (error) throw new Error(error.message);
  return (data as unknown as QuoteReport | null) ?? null;
}

export interface LvResult {
  title: string; trade: string; summary: string; assumptions: string[];
  positions: { pos: string; title: string; description: string; quantity: number | null; unit: string; note: string | null }[];
  optional_positions: { title: string; description: string }[];
  questions_to_clarify: string[]; estimated_range: { min: number | null; max: number | null }; timeline_weeks: number | null;
}
export interface Project { id: string; trade: string; title: string | null; description: string | null; plz: string | null; result: LvResult | null; created_at: string }

export function generateLv(body: { trade: string; description: string; plz?: string; photos?: { data: string; media_type: string }[] }) {
  return invoke<{ id: string; token: string }>("generate-lv", body);
}
export async function getProject(id: string, token: string): Promise<Project | null> {
  const { data, error } = await supabase.rpc("get_project", { p_id: id, p_token: token });
  if (error) throw new Error(error.message);
  return (data as unknown as Project | null) ?? null;
}

export interface ComparisonResult {
  overview: string;
  table: { quote_id: string; company: string | null; total_gross: number | null; score: number; missing_count: number; verdict: string; strengths: string[]; weaknesses: string[] }[];
  scope_differences: { topic: string; per_quote: { quote_id: string; value: string }[] }[];
  normalized_totals: { quote_id: string; normalized_total: number | null; explanation: string }[];
  recommendation: string;
  questions: { quote_id: string; question: string }[];
}
export interface Comparison { id: string; quote_ids: string[]; result: ComparisonResult | null; created_at: string }
export function compareQuotes(quotes: { id: string; token: string }[]) {
  return invoke<{ id: string; token: string }>("compare-quotes", { quotes });
}
export async function getComparison(id: string, token: string): Promise<Comparison | null> {
  const { data, error } = await supabase.rpc("get_comparison", { p_id: id, p_token: token });
  if (error) throw new Error(error.message);
  return (data as unknown as Comparison | null) ?? null;
}

export function releaseLead(body: Record<string, unknown>) {
  return invoke<{ ok: boolean; already?: boolean; notified?: number }>("release-lead", body);
}

export async function createCheckout(body: { kind: "premium_report" | "lead" | "subscription"; quote_id?: string; token?: string; lead_id?: string }) {
  const res = await invoke<{ url: string }>("create-checkout", body);
  if (!res.url) throw new Error("Keine Checkout-URL erhalten.");
  window.location.href = res.url;
}

export function sendContact(body: Record<string, unknown>) {
  return invoke<{ ok: boolean }>("contact", body);
}

export async function publicStats(): Promise<{ quotes_checked: number; businesses: number; benchmarks: number }> {
  const { data } = await supabase.rpc("public_stats");
  const d = (data ?? {}) as Record<string, number>;
  return { quotes_checked: d.quotes_checked ?? 0, businesses: d.businesses ?? 0, benchmarks: d.benchmarks ?? 0 };
}
