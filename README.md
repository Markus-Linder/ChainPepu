# redteamly

Automatisiertes Red-Teaming für KI-Assistenten. redteamly schickt Prompt-Injection-,
Jailbreak- und weitere Sicherheitstests gegen **euren eigenen** Chatbot, bewertet jede
Antwort mit einem Judge-Modell und liefert einen Score plus Report, zugeordnet zu den
OWASP LLM Top 10 und dem EU AI Act.

> Nur für Systeme einsetzen, für die ihr autorisiert seid (eure eigenen oder mit Erlaubnis).

## Technik-Stack

- **Frontend:** Vite + React + TypeScript + Tailwind (läuft out-of-the-box in Lovable)
- **Backend:** Supabase (Auth, Postgres mit Row Level Security, Edge Function)
- **Judge/Demo-Modell:** Anthropic Claude API

---

## Einrichtung in Lovable (Schritt für Schritt)

Du brauchst keine Vorkenntnisse. Lovable macht fast alles automatisch.

### 1. Projekt importieren
ZIP in Lovable hochladen (oder das GitHub-Repo verbinden). Lovable erkennt Vite automatisch.

### 2. Supabase verbinden
Oben rechts in Lovable auf **Supabase** klicken und ein Projekt verbinden (kostenloser Plan reicht
zum Starten). Lovable setzt dann automatisch diese beiden Variablen:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### 3. Datenbank anlegen
Im Supabase-Dashboard → **SQL Editor** → Inhalt von `supabase/migrations/0001_init.sql`
einfügen und **Run** klicken. Das legt die Tabellen und die Zugriffsregeln (RLS) an.

### 4. Edge Function deployen
Die Datei `supabase/functions/run-redteam/index.ts` ist der Scanner. Deployen mit der
Supabase-CLI (einmalig):

```bash
npm install -g supabase
supabase link --project-ref DEIN-PROJECT-REF
supabase functions deploy run-redteam
```

### 5. Secret setzen (der API-Schlüssel)
Der Scanner braucht einen Anthropic-API-Schlüssel (für den Judge und den Demo-Assistenten).
Schlüssel auf console.anthropic.com erstellen, dann:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# optional:
supabase secrets set JUDGE_MODEL=claude-opus-5-5
```

Das war's. App öffnen, registrieren, ersten Scan starten.

---

## Lokal entwickeln

```bash
npm install
cp .env.example .env   # Werte eintragen
npm run dev            # http://localhost:8080
```

---

## Wie ein Scan funktioniert

1. Nutzer legt ein **Ziel** an: entweder einen Demo-Assistenten (ein System-Prompt, den Claude
   spielt) oder einen eigenen **HTTP-Endpoint** (euer echter Chatbot).
2. Nutzer startet einen **Scan** (Quick oder Full).
3. Die Edge Function sendet jeden Testfall an das Ziel, lässt die Antwort vom Judge-Modell
   bewerten und speichert das Ergebnis.
4. Das Dashboard zeigt live Fortschritt, Score (0–100), Note (A–F) und jede Schwachstelle mit
   OWASP- und EU-AI-Act-Zuordnung.

### Eigenen Endpoint anbinden
redteamly schickt `POST` mit JSON `{ "message": "..." }` und liest die Antwort aus einem der
Felder `reply`, `message`, `output`, `response` oder `text` (sonst den rohen Text). Wenn euer
Chatbot ein anderes Format nutzt, passt `callTarget()` in der Edge Function an.

---

## Was noch fehlt, bevor ihr Geld verlangt

Siehe `BETRIEB.md` – ehrliche Liste, was automatisch läuft und was ihr einmalig selbst
einrichten müsst (z. B. Zahlung via Stripe).
