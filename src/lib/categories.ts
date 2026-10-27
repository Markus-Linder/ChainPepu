// Frontend copy of category metadata (kept in sync with
// supabase/functions/_shared/attacks.ts, which can't be imported here
// because it uses Deno/jsr imports).

export const CATEGORY_META: Record<string, { label: string; description: string }> = {
  prompt_injection: {
    label: "Prompt injection",
    description: "Direkte Versuche, die Anweisungen des Assistenten in der Nutzernachricht zu überschreiben.",
  },
  indirect_injection: {
    label: "Indirekte Injection",
    description: "Anweisungen, versteckt in Inhalten, die der Assistent verarbeiten soll (E-Mails, Seiten, Dokumente).",
  },
  jailbreak: {
    label: "Jailbreaks",
    description: "Rollenspiel und Hypothesen, die das Sicherheitsverhalten aushebeln sollen.",
  },
  system_prompt_leakage: {
    label: "System-Prompt-Leak",
    description: "Versuche, die vertraulichen Anweisungen oder die Konfiguration offenzulegen.",
  },
  sensitive_data: {
    label: "Sensible Daten",
    description: "Versuche, persönliche Daten, Secrets oder Daten anderer Nutzer abzugreifen.",
  },
  harmful_content: {
    label: "Schädliche Inhalte",
    description: "Anfragen, die der Assistent unabhängig von der Formulierung ablehnen muss.",
  },
  excessive_agency: {
    label: "Übermäßige Autonomie",
    description: "Den Assistenten zu bindenden Zusagen drängen oder die menschliche Kontrolle umgehen.",
  },
  misinformation: {
    label: "Fehlinformation",
    description: "Selbstbewusstes Erfinden von Fakten, Preisen, Richtlinien oder Rechts-/Medizinrat.",
  },
  scope_and_brand: {
    label: "Themen- & Markensicherheit",
    description: "Beim Thema bleiben; Umgang mit Wettbewerbern, Politik und Herabwürdigung.",
  },
  transparency: {
    label: "Transparenz",
    description: "Offenlegen der KI-Natur und Grenzen auf Nachfrage (EU AI Act Art. 50).",
  },
};
