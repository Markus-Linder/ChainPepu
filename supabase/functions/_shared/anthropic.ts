import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@1.3.0/helpers/zod";
import type { z } from "npm:zod@4.6.7";

export const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-5-5";

export function anthropicClient() {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY fehlt");
  return new Anthropic({ apiKey, timeout: 140_000, maxRetries: 1 });
}

export type ContentPart = Anthropic.Beta.BetaContentBlockParam;

/**
 * Strukturierte Anfrage: Antwort wird gegen das Zod-Schema geparst.
 * Server-seitige Fallbacks sind aktiviert, damit eine Sicherheitsablehnung
 * den Vorgang nicht abbricht. Schlägt der Fallback-Parameter fehl (z.B. ältere
 * Plattform), wird ohne ihn erneut versucht.
 */
export async function structured<T extends z.ZodTypeAny>(opts: {
  system: string;
  content: ContentPart[];
  schema: T;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<{ data: z.infer<T>; usage: { input: number; output: number }; model: string }> {
  const client = anthropicClient();
  const base = {
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    system: [{ type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user" as const, content: opts.content }],
    output_config: { effort: opts.effort ?? "medium", format: zodOutputFormat(opts.schema) },
  };

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      ...base,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    } as Parameters<typeof client.beta.messages.create>[0]) as Anthropic.Beta.BetaMessage;
  } catch (e) {
    if (e instanceof Anthropic.BadRequestError) {
      console.warn("[anthropic] Fallback-Parameter abgelehnt, Wiederholung ohne Fallbacks:", e.message);
      response = await client.beta.messages.create(base as Parameters<typeof client.beta.messages.create>[0]) as Anthropic.Beta.BetaMessage;
    } else {
      throw e;
    }
  }

  if (response.stop_reason === "refusal") {
    throw new Error("Die KI hat die Analyse dieses Dokuments abgelehnt. Bitte prüfen Sie, ob es sich um ein Handwerker-Angebot handelt.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Die Auswertung wurde abgeschnitten. Bitte laden Sie ein kürzeres Dokument hoch oder teilen Sie es auf.");
  }
  const text = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("");
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new Error("Die KI-Antwort war kein gültiges JSON.");
  }
  const parsed = opts.schema.safeParse(parsedJson);
  if (!parsed.success) {
    console.error("[anthropic] Schema-Fehler", parsed.error.issues.slice(0, 5));
    throw new Error("Die KI-Antwort entsprach nicht dem erwarteten Format.");
  }
  return {
    data: parsed.data,
    usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
    model: response.model,
  };
}

export function fileToPart(bytes: Uint8Array, mimeType: string): ContentPart {
  const data = base64(bytes);
  if (mimeType === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  }
  const mt = (mimeType === "image/jpg" ? "image/jpeg" : mimeType) as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  return { type: "image", source: { type: "base64", media_type: mt, data } };
}

export function base64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
