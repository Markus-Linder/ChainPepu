"""End-to-end CLI tests (no kicad-cli needed)."""

from __future__ import annotations

import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path

import _paths  # noqa: F401  (sys.path shim)
from kistack_review import cli, kicad

FIXTURES = Path(__file__).parent / "fixtures"
NO_CLI = "/nonexistent/kicad-cli-for-tests"


def run_cli(args: list[str]) -> tuple[int, str, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = cli.main(args)
    return code, out.getvalue(), err.getvalue()


class CliEndToEndTests(unittest.TestCase):
    def test_json_inputs_produce_all_outputs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "review"
            code, stdout, _ = run_cli([
                "--board", str(FIXTURES / "demo-board.kicad_pcb"),
                "--project", str(FIXTURES / "sample.kicad_pro"),
                "--drc-json", str(FIXTURES / "drc_sample.json"),
                "--erc-json", str(FIXTURES / "erc_sample.json"),
                "--bom-csv", str(FIXTURES / "bom_sample.csv"),
                "--fab", "jlcpcb",
                "--fab-profiles", str(FIXTURES / "fab-profiles"),
                "--kicad-cli", NO_CLI,
                "--out", str(out),
                "--quiet",
            ])
            self.assertEqual(code, 0)
            for name in ("REPORT.md", "AGENT_PROMPT.md", "summary.json"):
                self.assertTrue((out / name).is_file(), name)
            report_md = (out / "REPORT.md").read_text(encoding="utf-8")
            self.assertIn("| DRC | FAIL | 3 error, 6 warning, 1 excluded |", report_md)
            self.assertIn("**LOOSER**", report_md)
            self.assertIn("| Missing LCSC Part # | 3 | R2, R4, H1 |", report_md)
            prompt = (out / "AGENT_PROMPT.md").read_text(encoding="utf-8")
            self.assertIn("## Questions for the engineer", prompt)
            summary = json.loads((out / "summary.json").read_text(encoding="utf-8"))
            self.assertEqual(summary["checks"]["BOM"]["status"], "fail")
            self.assertEqual(summary["fab"]["process"], "standard-2l")
            self.assertIn("Wrote:", stdout)

    def test_drc_only(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "r"
            code, _, _ = run_cli(["--drc-json", str(FIXTURES / "drc_sample.json"), "--kicad-cli", NO_CLI, "--out", str(out), "--quiet"])
            self.assertEqual(code, 0)
            summary = json.loads((out / "summary.json").read_text(encoding="utf-8"))
            self.assertEqual(summary["checks"]["ERC"]["status"], "skipped")
            self.assertNotIn("erc", summary)

    def test_no_kicad_cli_and_no_json_exits_2(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            board = Path(tmp) / "board.kicad_pcb"
            board.write_text("(kicad_pcb (version 20240108))\n", encoding="utf-8")
            out = Path(tmp) / "r"
            code, _, stderr = run_cli(["--board", str(board), "--kicad-cli", NO_CLI, "--out", str(out), "--quiet"])
            self.assertEqual(code, 2)
            self.assertIn("nothing to check", stderr)
            self.assertIn("kicad-cli pcb drc --format json --severity-all", stderr)
            self.assertFalse((out / "REPORT.md").exists())

    def test_no_kicad_cli_flag_exits_2(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            code, _, _ = run_cli(["--no-kicad-cli", "--out", str(Path(tmp) / "r"), "--quiet"])
            self.assertEqual(code, 2)

    def test_missing_json_file_exits_1(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            code, _, _ = run_cli(["--drc-json", str(Path(tmp) / "nope.json"), "--kicad-cli", NO_CLI, "--out", str(Path(tmp) / "r"), "--quiet"])
            self.assertEqual(code, 1)

    def test_invalid_json_with_other_input_still_writes_report_and_exits_1(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            bad = Path(tmp) / "bad.json"
            bad.write_text("{", encoding="utf-8")
            out = Path(tmp) / "r"
            code, _, _ = run_cli(["--drc-json", str(bad), "--erc-json", str(FIXTURES / "erc_sample.json"), "--kicad-cli", NO_CLI, "--out", str(out), "--quiet"])
            self.assertEqual(code, 1)
            self.assertTrue((out / "REPORT.md").is_file())
            self.assertIn("**Error:**", (out / "REPORT.md").read_text(encoding="utf-8"))

    def test_fab_without_profile_dir_is_graceful(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "r"
            code, _, _ = run_cli([
                "--drc-json", str(FIXTURES / "drc_sample.json"),
                "--project", str(FIXTURES / "sample.kicad_pro"),
                "--fab", "aisler", "--fab-profiles", str(Path(tmp) / "missing"),
                "--kicad-cli", NO_CLI, "--out", str(out), "--quiet",
            ])
            self.assertEqual(code, 0)
            summary = json.loads((out / "summary.json").read_text(encoding="utf-8"))
            self.assertEqual(summary["checks"]["Fab rules"]["status"], "skipped")

    def test_sibling_project_and_schematic_autodetected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            board = Path(tmp) / "demo.kicad_pcb"
            board.write_text("(kicad_pcb)\n", encoding="utf-8")
            (Path(tmp) / "demo.kicad_sch").write_text("(kicad_sch)\n", encoding="utf-8")
            (Path(tmp) / "demo.kicad_pro").write_text((FIXTURES / "sample.kicad_pro").read_text(encoding="utf-8"), encoding="utf-8")
            out = Path(tmp) / "r"
            code, _, _ = run_cli([
                "--board", str(board), "--fab", "jlcpcb", "--fab-profiles", str(FIXTURES / "fab-profiles"),
                "--kicad-cli", NO_CLI, "--out", str(out), "--quiet",
            ])
            self.assertEqual(code, 0)
            summary = json.loads((out / "summary.json").read_text(encoding="utf-8"))
            self.assertEqual(summary["inputs"]["project"], str(Path(tmp) / "demo.kicad_pro"))
            self.assertEqual(summary["inputs"]["schematic"], str(Path(tmp) / "demo.kicad_sch"))
            self.assertEqual(summary["checks"]["Fab rules"]["status"], "fail")
            self.assertTrue(any("--drc-json" in n for n in summary["notes"]))


class KicadCommandTests(unittest.TestCase):
    def test_drc_command(self) -> None:
        cmd = kicad.drc_command("kicad-cli", Path("b.kicad_pcb"), Path("out/drc.json"), schematic_parity=True)
        self.assertEqual(cmd, ["kicad-cli", "pcb", "drc", "--format", "json", "--severity-all", "--schematic-parity", "--output", "out/drc.json", "b.kicad_pcb"])

    def test_erc_command(self) -> None:
        cmd = kicad.erc_command("kicad-cli", Path("s.kicad_sch"), Path("erc.json"))
        self.assertEqual(cmd[:3], ["kicad-cli", "sch", "erc"])
        self.assertIn("--severity-all", cmd)

    def test_bom_command_labels_match_fields(self) -> None:
        cmd = kicad.bom_command("kicad-cli", Path("s.kicad_sch"), Path("bom.csv"))
        fields = cmd[cmd.index("--fields") + 1].split(",")
        labels = cmd[cmd.index("--labels") + 1].split(",")
        self.assertEqual(len(fields), len(labels))
        self.assertIn("LCSC Part #", fields)
        self.assertIn("${DNP}", fields)

    def test_find_kicad_cli_explicit_missing(self) -> None:
        self.assertIsNone(kicad.find_kicad_cli(NO_CLI))

    def test_run_missing_binary(self) -> None:
        result = kicad.run([NO_CLI, "version"])
        self.assertFalse(result.ok)
        self.assertEqual(result.returncode, 127)
        self.assertIn("kicad-cli-for-tests", result.command_line)


if __name__ == "__main__":
    unittest.main()
