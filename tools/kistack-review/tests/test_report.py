"""Snapshot-style tests for REPORT.md, AGENT_PROMPT.md and summary.json rendering."""

from __future__ import annotations

import unittest
from pathlib import Path

import _paths  # noqa: F401  (sys.path shim)
from kistack_review import bom, fab, parse, report

FIXTURES = Path(__file__).parent / "fixtures"


def make_review() -> report.Review:
    return report.Review(
        board=Path("demo-board.kicad_pcb"),
        project=FIXTURES / "sample.kicad_pro",
        out_dir=Path("out"),
        generated="2026-10-23T00:00:00Z",
        drc=parse.load_drc(FIXTURES / "drc_sample.json"),
        erc=parse.load_erc(FIXTURES / "erc_sample.json"),
        fab=fab.review_fab("jlcpcb", None, FIXTURES / "sample.kicad_pro", FIXTURES / "fab-profiles"),
        bom=bom.check_bom(FIXTURES / "bom_sample.csv", lcsc_required=True),
        drc_source="`drc.json` (pre-generated)",
    )


class ReportRenderingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.review = make_review()
        self.md = report.render_report(self.review)

    def test_sections_present_in_order(self) -> None:
        headings = [line for line in self.md.splitlines() if line.startswith("## ")]
        self.assertEqual(
            headings,
            ["## Summary", "## Inputs", "## DRC findings", "## Unconnected items", "## Schematic parity",
             "## ERC findings", "## Fab rule comparison", "## BOM findings", "## Next steps"],
        )

    def test_summary_lines(self) -> None:
        self.assertIn("| DRC | FAIL | 3 error, 6 warning, 1 excluded |", self.md)
        self.assertIn("| Unconnected items | FAIL | 1 error |", self.md)
        self.assertIn("| ERC | FAIL | 1 error, 5 warning, 1 excluded |", self.md)
        self.assertIn("| Fab rules | FAIL | 12 looser, 1 unknown of 21 |", self.md)
        self.assertIn("| BOM | FAIL | 6 problems in 12 rows |", self.md)

    def test_drc_grouping_lines(self) -> None:
        self.assertIn("### `clearance` - 2 x error", self.md)
        self.assertIn("### `silk_overlap` - 4 x warning", self.md)
        self.assertIn("- Track [Net-(R1-Pad1)] on F.Cu, length 3.2500 mm @ (112.400, 58.750) mm", self.md)
        self.assertIn("- ... 1 more of this type", self.md)
        self.assertNotIn("copper_edge_clearance", self.md.split("## ERC findings")[0].split("## DRC findings")[1])

    def test_erc_lines(self) -> None:
        self.assertIn("Sheets: `/` (4), `/Power/` (2)", self.md)
        self.assertIn("(sheet `/Power/`)", self.md)

    def test_fab_table_lines(self) -> None:
        self.assertIn("| Board rules | Track width | 0.1 mm | 0.127 mm | **LOOSER** | project allows 0.1 mm, fab minimum is 0.127 mm |", self.md)
        self.assertIn("| Net class 'Default' | Track width | 0.25 mm | 0.127 mm | ok |  |", self.md)
        self.assertIn("| Board rules | Silkscreen clearance | 0 mm | - | unknown |", self.md)

    def test_bom_lines(self) -> None:
        self.assertIn("| Missing LCSC Part # | 3 | R2, R4, H1 |", self.md)
        self.assertIn("| MPN with conflicting values | 1 | 0402WGF1002TCE: 10k / 4k7 |", self.md)

    def test_next_steps(self) -> None:
        self.assertIn("1. Fix the 3 DRC error(s) first", self.md)
        self.assertIn("Tighten the project rules and net classes listed as LOOSER", self.md)

    def test_empty_review(self) -> None:
        md = report.render_report(report.Review(generated="now"))
        self.assertIn("| DRC | SKIP | no DRC report |", md)
        self.assertIn("Run DRC (`kicad-cli pcb drc", md)


class AgentPromptTests(unittest.TestCase):
    def setUp(self) -> None:
        self.review = make_review()
        self.md = report.render_report(self.review)
        self.prompt = report.render_agent_prompt(self.review, self.md)

    def test_embeds_report(self) -> None:
        self.assertIn(self.md.rstrip(), self.prompt)

    def test_rules_of_engagement(self) -> None:
        self.assertIn("**Triage by severity.**", self.prompt)
        self.assertIn("**Ask before editing**", self.prompt)
        for word in ("placement", "outline", "layer count", "substitution", "net class"):
            self.assertIn(word, self.prompt)
        self.assertIn("**Fix autonomously only mechanical items**", self.prompt)
        self.assertIn("`silk_overlap`", self.prompt)

    def test_ends_with_checklist(self) -> None:
        tail = self.prompt.split("## Questions for the engineer")[1]
        self.assertIn("- [ ] DRC `clearance`:", tail)
        self.assertIn("- [ ] ERC `power_pin_not_driven` on sheet `/`:", tail)
        self.assertIn("Track width is 0.1 mm but the fab minimum is 0.127 mm", tail)
        self.assertIn("- [ ] MPN `0402WGF1002TCE`", tail)
        self.assertTrue(self.prompt.rstrip().splitlines()[-1].startswith("- [ ]"))


class SummaryJsonTests(unittest.TestCase):
    def test_summary_structure(self) -> None:
        summary = report.build_summary(make_review())
        self.assertEqual(summary["tool"], "kistack-review")
        self.assertEqual(summary["checks"]["DRC"]["status"], "fail")
        self.assertEqual(summary["drc"]["violations"]["by_severity"], {"error": 3, "warning": 6, "excluded": 1})
        self.assertEqual(summary["drc"]["violations"]["by_type"][0], {"type": "clearance", "severity": "error", "count": 2})
        self.assertEqual(summary["erc"]["sheets"], [{"path": "/", "active": 4}, {"path": "/Power/", "active": 2}])
        self.assertEqual(summary["fab"]["status"], "fail")
        self.assertEqual(sum(1 for c in summary["fab"]["comparisons"] if c["status"] == "looser"), 12)
        self.assertEqual(summary["bom"]["missing_lcsc"], ["R2", "R4", "H1"])


if __name__ == "__main__":
    unittest.main()
