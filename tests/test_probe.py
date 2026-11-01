"""Tests des Sichtbarkeitstests mit einem Fake-Client, ohne API-Aufrufe."""

import json
from types import SimpleNamespace as NS

from agent_readiness.probe import Prober, ProbeConfig, summarize_probe


class FakeClient:
    """Simuliert client.beta.messages.create: Fragen, Antwort mit Websuche, Auswertung."""

    def __init__(self):
        self.calls = []
        self.beta = NS(messages=NS(create=self.create))
        self.messages = NS(create=self.create)

    def create(self, **kw):
        self.calls.append(kw)
        fmt = (kw.get("output_config") or {}).get("format")
        if fmt and "questions" in json.dumps(fmt["schema"]):
            text = json.dumps({"questions": ["Wo kaufe ich einen gebrauchten Stapler in Bühl?", "Was kostet ein Seitenstapler?"]})
            return NS(stop_reason="end_turn", content=[NS(type="text", text=text)])
        if fmt and "providers" in json.dumps(fmt["schema"]):
            return NS(stop_reason="end_turn", content=[NS(type="text", text=json.dumps({"providers": ["Müller Gabelstapler", "Linde"], "target_mentioned": True}))])
        # Antwort auf Kundenfrage mit Suchergebnissen
        return NS(stop_reason="end_turn", content=[
            NS(type="server_tool_use", name="web_search"),
            NS(type="web_search_tool_result", content=[NS(url="https://example.de/stapler"), NS(url="https://linde.de")]),
            NS(type="text", text="Empfehlenswert sind Müller Gabelstapler in Bühl und Linde."),
        ])


def test_probe_end_to_end_with_fake_client():
    client = FakeClient()
    cfg = ProbeConfig(brand="Müller Gabelstapler", domain="example.de", n_questions=2)
    results = Prober(cfg, client=client).run("Titel: Müller Gabelstapler GmbH")
    assert len(results) == 2
    assert all(r.target_mentioned and r.target_cited for r in results)
    assert results[0].providers_mentioned == ["Müller Gabelstapler", "Linde"]
    s = summarize_probe(results)
    assert s["score"] == 100 and s["mentioned"] == 2
    assert s["top_competitors"][0][0] in ("Müller Gabelstapler", "Linde")
    # Fallback-Beta wird standardmäßig mitgeschickt
    assert client.calls[0]["betas"] == ["server-side-fallback-2026-07-01"]
    assert client.calls[0]["fallbacks"] == "default"
    # Websuche mit regionalem Kontext
    ask_call = client.calls[1]
    assert ask_call["tools"][0]["type"] == "web_search_20260209"
    assert ask_call["tools"][0]["user_location"]["country"] == "DE"


def test_probe_handles_per_question_errors():
    class Broken(FakeClient):
        def create(self, **kw):
            raise RuntimeError("kaputt")

    cfg = ProbeConfig(brand="X", domain="x.de", use_fallbacks=False)
    results = Prober(cfg, client=Broken()).run("", questions=["Frage?"])
    assert results[0].error.startswith("RuntimeError")
    assert summarize_probe(results)["valid"] == 0
