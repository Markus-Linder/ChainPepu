"""Tests for fab profile loading and project rule comparison."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

import _paths  # noqa: F401  (sys.path shim)
from kistack_review import fab

FIXTURES = Path(__file__).parent / "fixtures"
PROFILES = FIXTURES / "fab-profiles"


def _by(comparisons: list[fab.Comparison], scope: str, rule: str) -> fab.Comparison:
    for c in comparisons:
        if c.scope == scope and c.rule == rule:
            return c
    raise AssertionError(f"no comparison {scope}/{rule}")


class ProfileTests(unittest.TestCase):
    def test_load_profile(self) -> None:
        profile = fab.load_profile(PROFILES, "jlcpcb")
        self.assertEqual(profile.fab, "jlcpcb")
        self.assertEqual([p.id for p in profile.processes], ["standard-2l", "standard-4l"])
        self.assertEqual(profile.required_bom_fields, ["LCSC Part #"])
        self.assertEqual(profile.processes[0].minimum("min_track_mm"), 0.127)
        self.assertIsNone(profile.processes[0].minimum("min_npth_drill_mm"))

    def test_missing_profile_raises(self) -> None:
        with self.assertRaises(fab.FabProfileError):
            fab.load_profile(PROFILES, "nosuchfab")

    def test_select_process(self) -> None:
        profile = fab.load_profile(PROFILES, "jlcpcb")
        self.assertEqual(fab.select_process(profile, None).id, "standard-2l")
        self.assertEqual(fab.select_process(profile, "standard-4l").id, "standard-4l")
        self.assertIsNone(fab.select_process(profile, "hdi-8l"))

    def test_resolve_profiles_dir_prefers_explicit_then_env(self) -> None:
        old = os.environ.get(fab.PROFILES_ENV)
        try:
            os.environ[fab.PROFILES_ENV] = str(FIXTURES)
            self.assertEqual(fab.resolve_profiles_dir(str(PROFILES)), PROFILES)
            self.assertEqual(fab.resolve_profiles_dir(None), FIXTURES)
            self.assertEqual(fab.resolve_profiles_dir("/nonexistent/dir"), FIXTURES)
        finally:
            if old is None:
                del os.environ[fab.PROFILES_ENV]
            else:
                os.environ[fab.PROFILES_ENV] = old

    def test_default_profiles_dir_points_at_repo(self) -> None:
        self.assertTrue(str(fab.default_profiles_dir()).endswith(os.path.join("kit-pro", "fab-profiles")))


class ProjectTests(unittest.TestCase):
    def test_load_project(self) -> None:
        project = fab.load_project(FIXTURES / "sample.kicad_pro")
        self.assertEqual(project.rules["min_track_width"], 0.1)
        self.assertEqual(project.rules["min_clearance"], 0.1)
        self.assertEqual([n.name for n in project.netclasses], ["Default", "Fine"])
        self.assertEqual(project.netclasses[1].values["track_width"], 0.1)

    def test_missing_project_raises(self) -> None:
        with self.assertRaises(fab.FabProfileError):
            fab.load_project(FIXTURES / "missing.kicad_pro")


class CompareTests(unittest.TestCase):
    def setUp(self) -> None:
        self.profile = fab.load_profile(PROFILES, "jlcpcb")
        self.process = fab.select_process(self.profile, "standard-2l")
        self.project = fab.load_project(FIXTURES / "sample.kicad_pro")
        self.comparisons = fab.compare(self.project, self.process)

    def test_looser_board_rule(self) -> None:
        c = _by(self.comparisons, "Board rules", "Track width")
        self.assertEqual(c.status, "looser")
        self.assertEqual(c.project_value, 0.1)
        self.assertEqual(c.fab_min, 0.127)
        self.assertIn("0.127", c.note)

    def test_ok_board_rule(self) -> None:
        c = _by(self.comparisons, "Board rules", "Copper to board edge")
        self.assertEqual(c.status, "ok")
        self.assertEqual(c.note, "")

    def test_unknown_when_no_fab_key(self) -> None:
        c = _by(self.comparisons, "Board rules", "Silkscreen clearance")
        self.assertEqual(c.status, "unknown")

    def test_unknown_when_fab_value_null(self) -> None:
        process = fab.select_process(self.profile, "standard-4l")
        comparisons = fab.compare(self.project, process)
        c = _by(comparisons, "Board rules", "Via annular ring")
        self.assertEqual(c.status, "unknown")
        self.assertIn("does not publish", c.note)

    def test_netclass_track_looser(self) -> None:
        c = _by(self.comparisons, "Net class 'Fine'", "Track width")
        self.assertEqual(c.status, "looser")
        self.assertEqual(_by(self.comparisons, "Net class 'Default'", "Track width").status, "ok")

    def test_netclass_derived_annular_ring(self) -> None:
        fine = _by(self.comparisons, "Net class 'Fine'", "Via annular ring (derived)")
        self.assertAlmostEqual(fine.project_value, 0.1)
        self.assertEqual(fine.status, "looser")
        default = _by(self.comparisons, "Net class 'Default'", "Via annular ring (derived)")
        self.assertAlmostEqual(default.project_value, 0.15)
        self.assertEqual(default.status, "ok")

    def test_zero_is_looser(self) -> None:
        project = fab.ProjectRules(path=Path("x"), rules={"min_track_width": 0.0})
        c = _by(fab.compare_rules(project, self.process), "Board rules", "Track width")
        self.assertEqual(c.status, "looser")
        self.assertIn("does not enforce", c.note)

    def test_missing_project_value_is_unknown(self) -> None:
        project = fab.ProjectRules(path=Path("x"), rules={})
        c = _by(fab.compare_rules(project, self.process), "Board rules", "Track width")
        self.assertEqual(c.status, "unknown")

    def test_equal_value_is_ok(self) -> None:
        project = fab.ProjectRules(path=Path("x"), rules={"min_track_width": 0.127})
        self.assertEqual(_by(fab.compare_rules(project, self.process), "Board rules", "Track width").status, "ok")


class ReviewFabTests(unittest.TestCase):
    def test_full_review(self) -> None:
        result = fab.review_fab("jlcpcb", None, FIXTURES / "sample.kicad_pro", PROFILES)
        self.assertEqual(result.status, "fail")
        self.assertEqual(result.process_id, "standard-2l")
        self.assertEqual(len(result.looser), 12)
        self.assertEqual(result.notes, [])

    def test_missing_profile_dir_is_a_note_not_an_error(self) -> None:
        result = fab.review_fab("jlcpcb", None, FIXTURES / "sample.kicad_pro", None)
        self.assertEqual(result.status, "skipped")
        self.assertTrue(any("No fab profile directory" in n for n in result.notes))

    def test_missing_profile_file_is_a_note(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result = fab.review_fab("oshpark", None, FIXTURES / "sample.kicad_pro", Path(tmp))
            self.assertEqual(result.status, "skipped")
            self.assertTrue(any("no fab profile for 'oshpark'" in n for n in result.notes))

    def test_unknown_process_is_a_note(self) -> None:
        result = fab.review_fab("jlcpcb", "hdi-8l", FIXTURES / "sample.kicad_pro", PROFILES)
        self.assertEqual(result.comparisons, [])
        self.assertTrue(any("hdi-8l" in n for n in result.notes))

    def test_no_project(self) -> None:
        result = fab.review_fab("jlcpcb", None, None, PROFILES)
        self.assertEqual(result.status, "skipped")
        self.assertIsNotNone(result.profile)


if __name__ == "__main__":
    unittest.main()
