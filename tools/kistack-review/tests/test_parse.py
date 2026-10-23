"""Tests for DRC/ERC JSON parsing and grouping."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import _paths  # noqa: F401  (sys.path shim)
from kistack_review import parse

FIXTURES = Path(__file__).parent / "fixtures"


class DrcParsingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.report = parse.load_drc(FIXTURES / "drc_sample.json")

    def test_header_fields(self) -> None:
        self.assertEqual(self.report.source, "demo-board.kicad_pcb")
        self.assertEqual(self.report.kicad_version, "8.0.9")
        self.assertEqual(self.report.units, "mm")
        self.assertEqual(self.report.date, "2026-10-23T09:14:02+0200")

    def test_categories_are_separated(self) -> None:
        self.assertEqual(len(self.report.violations), 10)
        self.assertEqual(len(self.report.unconnected_items), 1)
        self.assertEqual(len(self.report.schematic_parity), 1)
        self.assertEqual(self.report.unconnected_items[0].category, "unconnected_items")
        self.assertEqual(len(self.report.all()), 12)

    def test_violation_fields(self) -> None:
        first = self.report.violations[0]
        self.assertEqual(first.type, "clearance")
        self.assertEqual(first.severity, "error")
        self.assertFalse(first.excluded)
        self.assertEqual(len(first.items), 2)
        self.assertEqual(first.primary.description, "Track [Net-(R1-Pad1)] on F.Cu, length 3.2500 mm")
        self.assertAlmostEqual(first.primary.x, 112.4)
        self.assertAlmostEqual(first.primary.y, 58.75)
        self.assertEqual(first.primary.uuid, "0b1f6d3c-6c4e-4a1b-9c2f-1d7a0e8b5a01")
        self.assertEqual(first.primary.format_pos("mm"), "(112.400, 58.750) mm")

    def test_excluded_flag(self) -> None:
        excluded = [v for v in self.report.violations if v.excluded]
        self.assertEqual([v.type for v in excluded], ["copper_edge_clearance"])

    def test_count_by_severity(self) -> None:
        counts = parse.count_by_severity(self.report.violations)
        self.assertEqual(counts, {"error": 3, "warning": 6, "excluded": 1})
        self.assertEqual(list(counts), ["error", "warning", "excluded"])

    def test_group_by_type_orders_by_severity_then_count(self) -> None:
        groups = parse.group_by_type(self.report.violations)
        self.assertEqual([g.type for g in groups], ["clearance", "track_width", "silk_overlap", "courtyards_overlap", "missing_courtyard"])
        self.assertEqual(groups[0].count, 2)
        self.assertEqual(groups[2].severity, "warning")
        self.assertEqual(groups[2].count, 4)
        # Excluded violations never appear in groups.
        self.assertNotIn("copper_edge_clearance", [g.type for g in groups])

    def test_worst_severity(self) -> None:
        self.assertEqual(parse.worst_severity(self.report.violations), "error")
        self.assertEqual(parse.worst_severity(self.report.schematic_parity), "warning")
        self.assertIsNone(parse.worst_severity([]))

    def test_tolerates_missing_keys(self) -> None:
        report = parse.parse_drc({"violations": [{"type": "clearance"}, "garbage"], "unconnected_items": None})
        self.assertEqual(len(report.violations), 1)
        self.assertEqual(report.violations[0].severity, "unknown")
        self.assertEqual(report.violations[0].items, [])
        self.assertEqual(report.units, "mm")

    def test_exclusion_severity_marks_excluded(self) -> None:
        report = parse.parse_drc({"violations": [{"type": "x", "severity": "exclusion"}]})
        self.assertTrue(report.violations[0].excluded)

    def test_rejects_erc_document(self) -> None:
        with self.assertRaises(parse.ReportError):
            parse.parse_drc({"sheets": []})

    def test_load_rejects_invalid_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            bad = Path(tmp) / "bad.json"
            bad.write_text("{not json", encoding="utf-8")
            with self.assertRaises(parse.ReportError):
                parse.load_drc(bad)
            with self.assertRaises(parse.ReportError):
                parse.load_drc(Path(tmp) / "missing.json")


class ErcParsingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.report = parse.load_erc(FIXTURES / "erc_sample.json")

    def test_header_and_sheets(self) -> None:
        self.assertEqual(self.report.source, "demo-board.kicad_sch")
        self.assertEqual([s.path for s in self.report.sheets], ["/", "/Power/"])
        self.assertTrue(self.report.sheets[1].uuid_path.startswith("/3d5f0a2b"))

    def test_violations_carry_sheet_path(self) -> None:
        power = self.report.sheets[1].violations
        self.assertEqual(len(power), 2)
        self.assertEqual(power[0].sheet, "/Power/")
        self.assertEqual(power[0].type, "lib_symbol_mismatch")
        self.assertEqual(power[0].category, "erc")

    def test_all_and_counts(self) -> None:
        self.assertEqual(len(self.report.all()), 7)
        self.assertEqual(parse.count_by_severity(self.report.all()), {"error": 1, "warning": 5, "excluded": 1})

    def test_grouping(self) -> None:
        groups = parse.group_by_type(self.report.all())
        self.assertEqual(groups[0].type, "power_pin_not_driven")
        self.assertEqual(groups[1].type, "pin_not_connected")
        self.assertEqual(groups[1].count, 2)  # the excluded one is not counted

    def test_rejects_drc_document(self) -> None:
        with self.assertRaises(parse.ReportError):
            parse.parse_erc({"violations": []})

    def test_roundtrip_fixture_is_valid_json(self) -> None:
        data = json.loads((FIXTURES / "erc_sample.json").read_text())
        self.assertEqual(data["$schema"], "https://schemas.kicad.org/erc.v1.json")


if __name__ == "__main__":
    unittest.main()
