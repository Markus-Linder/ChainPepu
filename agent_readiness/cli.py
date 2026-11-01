"""Kommandozeile: agent-readiness audit <url> [--probe]"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from .checks import ALL_CHECKS
from .http import Fetcher, normalize_url, domain_of
from .models import Report, CategoryResult
from .report import write_reports
from .scoring import total_score, grade


def run_audit(url: str, brand: str | None, out_dir: Path, probe: bool, n_questions: int,
              model: str | None, region: str, questions_file: Path | None, no_fallbacks: bool,
              verbose: bool = True) -> Report:
    base = normalize_url(url)
    domain = domain_of(base)
    log = (lambda *a: print(*a, file=sys.stderr)) if verbose else (lambda *a: None)

    ctx: dict = {}
    fetcher = Fetcher(base)
    log(f"Lade {base} …")
    home = fetcher.get("/")
    if home.error and "SSL" in home.error and base.startswith("https://"):
        # Zertifikat kaputt: über HTTP weiterprüfen, der Fehler wird als Befund festgehalten.
        ctx["tls_error"] = home.error
        fetcher.close()
        base = "http://" + base[len("https://"):]
        fetcher = Fetcher(base)
        log(f"TLS-Fehler, weiche auf {base} aus …")
        home = fetcher.get("/")
    with fetcher:
        if home.error:
            raise SystemExit(f"Startseite nicht erreichbar: {home.error}")
        if home.status >= 400:
            log(f"Warnung: Startseite antwortet mit HTTP {home.status}")
        ctx["home"] = home
        categories: list[CategoryResult] = []
        for check in ALL_CHECKS:
            log(f"Prüfe {check.__name__.replace('check_', '')} …")
            categories.append(check(fetcher, home.text, ctx))

    brand = brand or _guess_brand(ctx, domain)
    probe_results = []
    meta: dict = {"final_url": home.final_url, "http_status": home.status, "title": ctx.get("title", "")}
    visibility = CategoryResult(key="visibility", name="KI-Sichtbarkeit", weight=30, score=0,
                                skipped=True, skipped_reason="Nicht ausgeführt. Mit --probe aktivieren (benötigt Anthropic-API-Zugang).")

    if probe:
        from .probe import Prober, ProbeConfig, summarize_probe

        cfg = ProbeConfig(brand=brand, domain=domain, n_questions=n_questions, region=region,
                          use_fallbacks=not no_fallbacks, **({"model": model} if model else {}))
        summary = _site_summary(ctx, domain)
        questions = None
        if questions_file:
            questions = [l.strip() for l in questions_file.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")]
        try:
            prober = Prober(cfg)
            log(f"KI-Sichtbarkeitstest mit {cfg.model}, Marke '{brand}' …")
            probe_results = prober.run(summary, questions,
                                       progress=lambda i, n, q: log(f"  Frage {i}/{n}: {q}"))
            ps = summarize_probe(probe_results)
            meta["probe_summary"] = ps
            meta["probe_model"] = cfg.model
            visibility = CategoryResult(key="visibility", name="KI-Sichtbarkeit", weight=30, score=ps["score"])
            from .models import CRITICAL, WARNING, OK
            if ps["valid"] == 0:
                visibility.skipped, visibility.skipped_reason = True, "Alle Testfragen sind fehlgeschlagen."
            elif ps["mentioned"] == 0:
                visibility.add(CRITICAL, "In keiner KI-Antwort genannt",
                               f"0 von {ps['valid']} Kundenfragen führten zur Nennung von {brand}.",
                               "Inhalte auf die getesteten Fragen ausrichten, Einträge in Verzeichnissen und Bewertungsportalen aufbauen, Fachartikel mit konkreten Fakten veröffentlichen.")
            elif ps["mentioned"] < ps["valid"] / 2:
                visibility.add(WARNING, "Selten genannt", f"{ps['mentioned']} von {ps['valid']} Fragen.",
                               "Die Fragen ohne Nennung zeigen, welche Themen auf der Website fehlen.")
            else:
                visibility.add(OK, "Regelmäßig genannt", f"{ps['mentioned']} von {ps['valid']} Fragen.")
            if ps["top_competitors"]:
                visibility.add(WARNING if ps["mentioned"] < ps["valid"] / 2 else OK, "Häufig genannte Wettbewerber",
                               ", ".join(f"{n} ({k}×)" for n, k in ps["top_competitors"][:5]))
        except Exception as exc:  # noqa: BLE001
            visibility.skipped_reason = f"Fehlgeschlagen: {type(exc).__name__}: {exc}"
            log(f"KI-Sichtbarkeitstest fehlgeschlagen: {exc}")

    categories.append(visibility)
    report = Report(
        url=base, domain=domain, brand=brand,
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        categories=categories, total_score=total_score(categories),
        probe=probe_results, meta=meta,
    )
    md, js = write_reports(report, out_dir)
    log(f"\nGesamtwert: {report.total_score}/100 ({grade(report.total_score)})")
    for c in categories:
        log(f"  {c.name:<24} {'–' if c.skipped else c.score}")
    log(f"\nBericht: {md}\nDaten:   {js}")
    return report


def _guess_brand(ctx: dict, domain: str) -> str:
    title = (ctx.get("title") or "").strip()
    for sep in (" | ", " – ", " — ", " - ", " · ", " \\ ", " / ", ": "):
        if sep in title:
            parts = [p.strip() for p in title.split(sep) if p.strip()]
            if parts:
                return min(parts, key=len) if len(parts[-1]) < 40 else parts[0]
    if title and len(title) <= 40:
        return title
    return domain.split(".")[0].capitalize()


def _site_summary(ctx: dict, domain: str) -> str:
    parts = [f"Domain: {domain}", f"Titel: {ctx.get('title', '')}", f"Beschreibung: {ctx.get('description', '')}"]
    if ctx.get("h1"):
        parts.append("H1: " + " / ".join(ctx["h1"][:3]))
    if ctx.get("jsonld_types"):
        parts.append("Strukturierte Typen: " + ", ".join(ctx["jsonld_types"]))
    parts.append("Textauszug: " + (ctx.get("visible_text") or "")[:3000])
    return "\n".join(parts)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="agent-readiness", description="Agent-Readiness-Audit einer Website")
    sub = parser.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("audit", help="Website prüfen und Bericht schreiben")
    a.add_argument("url", help="Startseite, z. B. https://beispiel.de")
    a.add_argument("--brand", help="Firmenname für den Sichtbarkeitstest (sonst aus dem Titel geraten)")
    a.add_argument("--out", default="reports", help="Zielordner für Berichte (Standard: reports/)")
    a.add_argument("--probe", action="store_true", help="KI-Sichtbarkeitstest mit Claude ausführen (kostenpflichtig)")
    a.add_argument("--questions", type=int, default=8, help="Anzahl Testfragen (Standard: 8)")
    a.add_argument("--questions-file", type=Path, help="Eigene Fragen, eine pro Zeile, statt generierter")
    a.add_argument("--model", help="Modell für den Sichtbarkeitstest (Standard: claude-opus-5-5)")
    a.add_argument("--region", default="DE", help="Ländercode für Suche und Fragen (Standard: DE)")
    a.add_argument("--no-fallbacks", action="store_true", help="Serverseitigen Modell-Fallback bei Ablehnung abschalten")
    a.add_argument("--quiet", action="store_true")
    args = parser.parse_args(argv)

    run_audit(args.url, args.brand, Path(args.out), args.probe, args.questions, args.model,
              args.region, args.questions_file, args.no_fallbacks, verbose=not args.quiet)
    return 0
