"""Command line: agent-readiness audit <url> [--probe] [--lang en]"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from .checks import ALL_CHECKS
from .http import Fetcher, normalize_url, domain_of
from .i18n import _, set_language, get_language
from .models import Report, CategoryResult, CRITICAL, WARNING, OK
from .report import write_reports
from .scoring import total_score, grade


def run_audit(url: str, brand: str | None, out_dir: Path, probe: bool, n_questions: int,
              model: str | None, region: str, questions_file: Path | None, no_fallbacks: bool,
              verbose: bool = True, lang: str | None = None) -> Report:
    if lang:
        set_language(lang)
    base = normalize_url(url)
    domain = domain_of(base)
    log = (lambda *a: print(*a, file=sys.stderr)) if verbose else (lambda *a: None)

    ctx: dict = {}
    fetcher = Fetcher(base)
    log(_("Loading {url} …").format(url=base))
    home = fetcher.get("/")
    if home.error and "SSL" in home.error and base.startswith("https://"):
        ctx["tls_error"] = home.error
        fetcher.close()
        base = "http://" + base[len("https://"):]
        fetcher = Fetcher(base)
        log(_("TLS error, falling back to {url} …").format(url=base))
        home = fetcher.get("/")
    with fetcher:
        if home.error:
            raise SystemExit(_("Home page not reachable: {error}").format(error=home.error))
        if home.status >= 400:
            log(_("Warning: home page responds with HTTP {status}").format(status=home.status))
        ctx["home"] = home
        categories: list[CategoryResult] = []
        for check in ALL_CHECKS:
            log(_("Checking {name} …").format(name=check.__name__.replace("check_", "")))
            categories.append(check(fetcher, home.text, ctx))

    brand = brand or _guess_brand(ctx, domain)
    probe_results = []
    meta: dict = {"final_url": home.final_url, "http_status": home.status, "title": ctx.get("title", "")}
    visibility = CategoryResult(key="visibility", name=_("AI visibility"), weight=30, score=0, skipped=True,
                                skipped_reason=_("Not run. Enable with --probe (requires Anthropic API access)."))

    if probe:
        from .probe import Prober, ProbeConfig, summarize_probe

        cfg = ProbeConfig(brand=brand, domain=domain, n_questions=n_questions, region=region,
                          language=get_language(), use_fallbacks=not no_fallbacks,
                          **({"model": model} if model else {}))
        summary = _site_summary(ctx, domain)
        questions = None
        if questions_file:
            questions = [l.strip() for l in questions_file.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")]
        try:
            prober = Prober(cfg)
            log(_("AI visibility test with {model}, brand '{brand}' …").format(model=cfg.model, brand=brand))
            probe_results = prober.run(summary, questions,
                                       progress=lambda i, n, q: log(f"  {_('Question')} {i}/{n}: {q}"))
            ps = summarize_probe(probe_results)
            meta["probe_summary"] = ps
            meta["probe_model"] = cfg.model
            visibility = CategoryResult(key="visibility", name=_("AI visibility"), weight=30, score=ps["score"])
            if ps["valid"] == 0:
                visibility.skipped, visibility.skipped_reason = True, _("All test questions failed.")
            elif ps["mentioned"] == 0:
                visibility.add(CRITICAL, _("Not mentioned in any AI answer"),
                               _("0 of {n} customer questions led to a mention of {brand}.").format(n=ps["valid"], brand=brand),
                               _("Align content with the tested questions, build entries in directories and review sites, publish expert articles with concrete facts."))
            elif ps["mentioned"] < ps["valid"] / 2:
                visibility.add(WARNING, _("Rarely mentioned"), _("{m} of {n} questions.").format(m=ps["mentioned"], n=ps["valid"]),
                               _("The questions without a mention show which topics are missing on the website."))
            else:
                visibility.add(OK, _("Regularly mentioned"), _("{m} of {n} questions.").format(m=ps["mentioned"], n=ps["valid"]))
            if ps["top_competitors"]:
                visibility.add(WARNING if ps["mentioned"] < ps["valid"] / 2 else OK, _("Frequently named competitors"),
                               ", ".join(f"{n} ({k}×)" for n, k in ps["top_competitors"][:5]))
        except Exception as exc:  # noqa: BLE001
            visibility.skipped_reason = _("Failed: {error}").format(error=f"{type(exc).__name__}: {exc}")
            log(_("AI visibility test failed: {error}").format(error=exc))

    categories.append(visibility)
    report = Report(
        url=base, domain=domain, brand=brand,
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        categories=categories, total_score=total_score(categories),
        probe=probe_results, meta=meta,
    )
    md, js = write_reports(report, out_dir)
    log(f"\n{_('Total score')}: {report.total_score}/100 ({grade(report.total_score)})")
    for c in categories:
        log(f"  {c.name:<24} {'–' if c.skipped else c.score}")
    log(f"\n{_('Report')}: {md}\n{_('Data')}:   {js}")
    return report


_TITLE_NOISE = re.compile(r"^(startseite|home|homepage|willkommen bei|willkommen|welcome to|welcome)\s*[-–|:]?\s*", re.I)


def _guess_brand(ctx: dict, domain: str) -> str:
    title = _TITLE_NOISE.sub("", (ctx.get("title") or "").strip())
    for sep in (" | ", " – ", " — ", " - ", " · ", " \\ ", " / ", ": "):
        if sep in title:
            parts = [p.strip() for p in title.split(sep) if p.strip()]
            parts = [_TITLE_NOISE.sub("", p) for p in parts]
            parts = [p for p in parts if p and p.lower() not in ("startseite", "home", "homepage")]
            if parts:
                return min(parts, key=len) if len(parts[-1]) < 40 else parts[0]
    if title and len(title) <= 40:
        return title
    return domain.split(".")[0].capitalize()


def _site_summary(ctx: dict, domain: str) -> str:
    parts = [f"Domain: {domain}", f"Title: {ctx.get('title', '')}", f"Description: {ctx.get('description', '')}"]
    if ctx.get("h1"):
        parts.append("H1: " + " / ".join(ctx["h1"][:3]))
    if ctx.get("jsonld_types"):
        parts.append("Structured types: " + ", ".join(ctx["jsonld_types"]))
    parts.append("Text excerpt: " + (ctx.get("visible_text") or "")[:3000])
    return "\n".join(parts)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="agent-readiness", description="Agent Readiness Audit of a website")
    sub = parser.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("audit", help="audit a website and write the report")
    a.add_argument("url", help="home page, e.g. https://example.com")
    a.add_argument("--brand", help="company name for the visibility test (otherwise guessed from the title)")
    a.add_argument("--out", default="reports", help="output folder for reports (default: reports/)")
    a.add_argument("--lang", default="de", choices=["de", "en"], help="report language (default: de)")
    a.add_argument("--probe", action="store_true", help="run the AI visibility test with Claude (paid API calls)")
    a.add_argument("--questions", type=int, default=8, help="number of test questions (default: 8)")
    a.add_argument("--questions-file", type=Path, help="own questions, one per line, instead of generated ones")
    a.add_argument("--model", help="model for the visibility test (default: claude-opus-5-5)")
    a.add_argument("--region", default="DE", help="country code for search and questions (default: DE)")
    a.add_argument("--no-fallbacks", action="store_true", help="disable server-side model fallback on refusals")
    a.add_argument("--quiet", action="store_true")

    o = sub.add_parser("outreach", help="create a personal first-contact email from an audit")
    o.add_argument("url", help="prospect's home page")
    o.add_argument("--to", required=True, help="recipient email address")
    o.add_argument("--name", default="", help="recipient name for the salutation")
    o.add_argument("--brand", help="prospect's company name (otherwise guessed from the title)")
    o.add_argument("--lang", default="de", choices=["de", "en"])
    o.add_argument("--out", default="outreach/drafts", help="folder for drafts (default: outreach/drafts/)")
    o.add_argument("--legal-basis", required=True,
                   choices=["consent", "existing-customer", "inquiry", "b2b-allowed-jurisdiction", "other"],
                   help="why this email may be sent; recorded in the draft and the log")
    o.add_argument("--send", action="store_true", help="send immediately via SMTP (otherwise draft only)")
    o.add_argument("--quiet", action="store_true")
    args = parser.parse_args(argv)

    if args.cmd == "audit":
        run_audit(args.url, args.brand, Path(args.out), args.probe, args.questions, args.model,
                  args.region, args.questions_file, args.no_fallbacks, verbose=not args.quiet, lang=args.lang)
        return 0

    from .outreach import run_outreach

    return run_outreach(args.url, args.to, args.name, args.lang, Path(args.out), args.legal_basis,
                        send=args.send, verbose=not args.quiet, brand=args.brand)
