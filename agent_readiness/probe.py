"""KI-Sichtbarkeitstest: stellt echte Kundenfragen an Claude mit Websuche und prüft,
ob die geprüfte Firma genannt oder als Quelle zitiert wird.

Benötigt das Paket `anthropic` und einen API-Zugang (ANTHROPIC_API_KEY oder `ant auth login`).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from .models import ProbeQuestion

DEFAULT_MODEL = "claude-opus-5-5"
FALLBACK_BETA = "server-side-fallback-2026-07-01"

QUESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["questions"],
    "additionalProperties": False,
}

EVAL_SCHEMA = {
    "type": "object",
    "properties": {
        "providers": {"type": "array", "items": {"type": "string"}},
        "target_mentioned": {"type": "boolean"},
    },
    "required": ["providers", "target_mentioned"],
    "additionalProperties": False,
}


@dataclass
class ProbeConfig:
    brand: str
    domain: str
    model: str = DEFAULT_MODEL
    n_questions: int = 8
    language: str = "de"
    region: str = "DE"
    max_searches: int = 3
    use_fallbacks: bool = True


class Prober:
    def __init__(self, config: ProbeConfig, client: Any | None = None):
        self.config = config
        if client is None:
            import anthropic  # erst hier, damit die technischen Checks ohne SDK laufen

            client = anthropic.Anthropic()
        self.client = client

    # ---- API-Aufrufe -------------------------------------------------------

    def _create(self, **kwargs: Any) -> Any:
        """Ein Messages-Aufruf, standardmäßig mit serverseitigem Fallback bei Sicherheitsablehnung."""
        if self.config.use_fallbacks:
            return self.client.beta.messages.create(
                betas=[FALLBACK_BETA], fallbacks="default", **kwargs
            )
        return self.client.messages.create(**kwargs)

    def generate_questions(self, site_summary: str) -> list[str]:
        prompt = (
            f"Du hilfst bei einem Sichtbarkeitstest. Unten steht die Zusammenfassung einer Website.\n"
            f"Formuliere {self.config.n_questions} realistische Fragen, die potenzielle Kunden einem KI-Assistenten "
            f"stellen würden, BEVOR sie diese Firma kennen. Die Fragen dürfen den Firmennamen '{self.config.brand}' "
            f"und die Domain nicht enthalten. Mischung aus: Anbieter-Suche in der Region, Preisvergleich, "
            f"Produkt- oder Leistungsempfehlung, konkrete Problemlösung. Sprache: {self.config.language}. "
            f"Markt: {self.config.region}.\n\nWebsite-Zusammenfassung:\n{site_summary[:6000]}"
        )
        resp = self._create(
            model=self.config.model,
            max_tokens=4000,
            output_config={"effort": "medium", "format": {"type": "json_schema", "schema": QUESTION_SCHEMA}},
            messages=[{"role": "user", "content": prompt}],
        )
        _raise_on_refusal(resp)
        data = json.loads(_first_text(resp))
        return [q.strip() for q in data["questions"] if q.strip()][: self.config.n_questions]

    def ask(self, question: str) -> ProbeQuestion:
        """Stellt eine Frage so, wie ein Endkunde sie stellen würde, mit Websuche."""
        pq = ProbeQuestion(question=question)
        system = (
            f"Du bist ein hilfreicher Assistent für Verbraucher und Einkäufer in {self.config.region}. "
            "Beantworte die Frage konkret und nenne, wo sinnvoll, konkrete Anbieter, Produkte oder Websites mit Namen. "
            f"Antworte auf {self.config.language}."
        )
        messages: list[dict[str, Any]] = [{"role": "user", "content": question}]
        tools = [{
            "type": "web_search_20260209",
            "name": "web_search",
            "max_uses": self.config.max_searches,
            "user_location": {"type": "approximate", "country": self.config.region},
        }]
        try:
            texts: list[str] = []
            sources: list[str] = []
            for _ in range(4):  # pause_turn-Schleife
                resp = self._create(
                    model=self.config.model,
                    max_tokens=8000,
                    system=system,
                    tools=tools,
                    output_config={"effort": "medium"},
                    messages=messages,
                )
                _raise_on_refusal(resp)
                for block in resp.content:
                    btype = getattr(block, "type", "")
                    if btype == "text":
                        texts.append(block.text)
                    elif btype == "web_search_tool_result":
                        content = getattr(block, "content", None)
                        if isinstance(content, list):
                            for r in content:
                                url = getattr(r, "url", None)
                                if url:
                                    sources.append(url)
                if resp.stop_reason == "pause_turn":
                    messages.append({"role": "assistant", "content": resp.content})
                    continue
                break
            pq.answer = "\n".join(texts).strip()
            pq.sources = list(dict.fromkeys(sources))
            pq.target_cited = any(self.config.domain in s.lower() for s in pq.sources)
            self._evaluate(pq)
        except Exception as exc:  # noqa: BLE001 - Fehler pro Frage sollen den Lauf nicht abbrechen
            pq.error = f"{type(exc).__name__}: {exc}"
        return pq

    def _evaluate(self, pq: ProbeQuestion) -> None:
        """Extrahiert genannte Anbieter und prüft, ob die Zielfirma dabei ist."""
        lowered = pq.answer.lower()
        pq.target_mentioned = self.config.brand.lower() in lowered or self.config.domain in lowered
        prompt = (
            "Liste alle Firmen, Marken, Shops oder Websites, die in der folgenden Antwort als Anbieter oder "
            "Empfehlung genannt werden (nur Eigennamen, keine Gattungsbegriffe). "
            f"Setze target_mentioned auf true, wenn '{self.config.brand}' oder '{self.config.domain}' "
            f"darunter ist, auch in abweichender Schreibweise.\n\nAntwort:\n{pq.answer[:12000]}"
        )
        resp = self._create(
            model=self.config.model,
            max_tokens=2000,
            output_config={"effort": "low", "format": {"type": "json_schema", "schema": EVAL_SCHEMA}},
            messages=[{"role": "user", "content": prompt}],
        )
        _raise_on_refusal(resp)
        data = json.loads(_first_text(resp))
        pq.providers_mentioned = [p for p in data.get("providers", []) if p]
        pq.target_mentioned = pq.target_mentioned or bool(data.get("target_mentioned"))

    def run(self, site_summary: str, questions: list[str] | None = None, progress=None) -> list[ProbeQuestion]:
        qs = questions or self.generate_questions(site_summary)
        results: list[ProbeQuestion] = []
        for i, q in enumerate(qs, 1):
            if progress:
                progress(i, len(qs), q)
            results.append(self.ask(q))
        return results


def _first_text(resp: Any) -> str:
    for block in resp.content:
        if getattr(block, "type", "") == "text":
            return block.text
    raise ValueError("Antwort ohne Textblock")


def _raise_on_refusal(resp: Any) -> None:
    if getattr(resp, "stop_reason", None) == "refusal":
        details = getattr(resp, "stop_details", None)
        cat = getattr(details, "category", None) if details else None
        raise RuntimeError(f"Anfrage abgelehnt (Kategorie: {cat})")


def summarize_probe(results: list[ProbeQuestion]) -> dict[str, Any]:
    """Kennzahlen für Bericht und Score."""
    valid = [r for r in results if not r.error]
    mentioned = sum(1 for r in valid if r.target_mentioned)
    cited = sum(1 for r in valid if r.target_cited)
    competitors: dict[str, int] = {}
    for r in valid:
        for p in r.providers_mentioned:
            competitors[p] = competitors.get(p, 0) + 1
    top = sorted(competitors.items(), key=lambda kv: -kv[1])[:10]
    score = 0
    if valid:
        score = round(100 * (0.7 * mentioned + 0.3 * cited) / len(valid))
    return {
        "asked": len(results),
        "valid": len(valid),
        "mentioned": mentioned,
        "cited": cited,
        "score": score,
        "top_competitors": top,
    }
