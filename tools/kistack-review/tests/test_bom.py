"""Tests for BOM CSV checks."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import _paths  # noqa: F401  (sys.path shim)
from kistack_review import bom

FIXTURES = Path(__file__).parent / "fixtures"


class BomTests(unittest.TestCase):
    def setUp(self) -> None:
        self.result = bom.check_bom(FIXTURES / "bom_sample.csv", lcsc_required=True)

    def test_counts(self) -> None:
        self.assertEqual(self.result.rows, 12)
        self.assertEqual(self.result.components, 12)
        self.assertEqual(self.result.columns[0], "Reference")

    def test_empty_value_and_footprint(self) -> None:
        self.assertEqual(self.result.empty_value, ["R4"])
        self.assertEqual(self.result.empty_footprint, ["J1"])

    def test_missing_lcsc_skips_dnp(self) -> None:
        self.assertTrue(self.result.lcsc_column_present)
        self.assertEqual(self.result.missing_lcsc, ["R2", "R4", "H1"])  # D1 is DNP

    def test_mpn_conflicts(self) -> None:
        self.assertEqual(self.result.mpn_conflicts, {"0402WGF1002TCE": ["10k", "4k7"]})

    def test_dnp(self) -> None:
        self.assertTrue(self.result.dnp_column_present)
        self.assertEqual(self.result.dnp_refs, ["D1"])

    def test_status(self) -> None:
        self.assertEqual(self.result.status, "fail")
        self.assertEqual(self.result.problems, 6)

    def test_lcsc_not_required(self) -> None:
        result = bom.check_bom(FIXTURES / "bom_sample.csv", lcsc_required=False)
        self.assertEqual(result.missing_lcsc, [])
        self.assertEqual(result.problems, 3)

    def test_grouped_references_and_aliases(self) -> None:
        csv_text = "Refs;Value;Footprint;Qty;DNP\nR1, R2;10k;R_0402;2;\nC1-C3;100n;C_0402;3;DNP\nU1;MCU;;1;\n"
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bom.csv"
            path.write_text(csv_text, encoding="utf-8")
            result = bom.check_bom(path, lcsc_required=True)
        self.assertEqual(result.rows, 3)
        self.assertEqual(result.components, 6)
        self.assertEqual(result.dnp_refs, ["C1", "C2", "C3"])
        self.assertEqual(result.empty_footprint, ["U1"])
        self.assertFalse(result.lcsc_column_present)
        self.assertEqual(result.missing_lcsc, ["R1", "R2", "U1"])
        self.assertTrue(any("LCSC" in n for n in result.notes))
        self.assertEqual(result.status, "fail")

    def test_clean_bom_passes(self) -> None:
        csv_text = "Reference,Value,Footprint,LCSC Part #,MPN\nR1,10k,R_0402,C25744,0402WGF1002TCE\n"
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bom.csv"
            path.write_text(csv_text, encoding="utf-8")
            result = bom.check_bom(path, lcsc_required=True)
        self.assertEqual(result.status, "pass")
        self.assertFalse(result.dnp_column_present)

    def test_missing_file(self) -> None:
        with self.assertRaises(bom.BomError):
            bom.check_bom(FIXTURES / "missing.csv")

    def test_split_references(self) -> None:
        self.assertEqual(bom.split_references("R1-R3, C7 D2"), ["R1", "R2", "R3", "C7", "D2"])
        self.assertEqual(bom.split_references(""), [])

    def test_is_dnp(self) -> None:
        self.assertTrue(bom.is_dnp("DNP"))
        self.assertTrue(bom.is_dnp("yes"))
        self.assertFalse(bom.is_dnp(""))
        self.assertFalse(bom.is_dnp("false"))


if __name__ == "__main__":
    unittest.main()
