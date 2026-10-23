#!/usr/bin/env bash
# Builds the downloadable kits and validates data files.
#   bash scripts/build.sh          -> site/downloads/kicad-agent-starter-kit.zip (public, free)
#                                     dist/kistack-pro-kit.zip (upload to Lemon Squeezy, never commit)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
STAMP="$(date -u +%Y-%m-%d)"

echo "== validating fab profiles"
if ls kit-pro/fab-profiles/*.json >/dev/null 2>&1; then
  for f in kit-pro/fab-profiles/*.json; do
    python3 -I -c 'import json,sys; d=json.load(open(sys.argv[1])); assert d.get("schema_version")==1 and d.get("processes"), "bad profile"; print("  ok", sys.argv[1])' "$f"
  done
else
  echo "  (no profiles yet)"
fi

echo "== validating constraint templates (YAML front matter)"
python3 -I - <<'PY'
import re, glob, sys
try:
    import yaml
except ImportError:
    print("  pyyaml not installed, skipping"); sys.exit(0)
for f in glob.glob("kit-free/DESIGN-CONSTRAINTS.md") + glob.glob("kit-pro/board-classes/*.md"):
    t = open(f).read(); m = re.search(r"^---\n(.*?)\n---", t, re.S)
    if m: yaml.safe_load(m.group(1)); print("  ok", f)
PY

echo "== running kistack-review tests"
if [ -d tools/kistack-review/tests ]; then
  python3 -m unittest discover -s tools/kistack-review/tests 2>&1 | tail -1
fi

echo "== building free kit"
mkdir -p site/downloads build && rm -rf build/free && mkdir -p build/free/kicad-agent-starter-kit
cp kit-free/README.md kit-free/CLAUDE.md kit-free/DESIGN-CONSTRAINTS.md kit-free/REVIEW-CHECKLIST.md kit-free/JLCPCB-BOM-WORKFLOW.md kit-free/LICENSE build/free/kicad-agent-starter-kit/
( cd build/free && rm -f ../../site/downloads/kicad-agent-starter-kit.zip && zip -qr ../../site/downloads/kicad-agent-starter-kit.zip kicad-agent-starter-kit )
echo "  site/downloads/kicad-agent-starter-kit.zip ($(du -h site/downloads/kicad-agent-starter-kit.zip | cut -f1))"

echo "== building pro kit"
rm -rf build/pro dist && mkdir -p build/pro/kistack-pro-kit dist
cp -r kit-pro/. build/pro/kistack-pro-kit/
mkdir -p build/pro/kistack-pro-kit/starter-kit && cp kit-free/*.md kit-free/LICENSE build/pro/kistack-pro-kit/starter-kit/
if [ -d tools/kistack-review ]; then
  mkdir -p build/pro/kistack-pro-kit/tools && cp -r tools/kistack-review build/pro/kistack-pro-kit/tools/
  find build/pro -name "__pycache__" -type d -prune -exec rm -rf {} +
fi
echo "Built $STAMP" > build/pro/kistack-pro-kit/VERSION
( cd build/pro && zip -qr "../../dist/kistack-pro-kit-$STAMP.zip" kistack-pro-kit )
echo "  dist/kistack-pro-kit-$STAMP.zip ($(du -h dist/kistack-pro-kit-$STAMP.zip | cut -f1))  <- upload to Lemon Squeezy, do not commit"

echo "== packaging Lovable project"
if [ -d lovable ]; then
  rm -f dist/kistack-lovable.zip
  ( cd lovable && zip -qr ../dist/kistack-lovable.zip . -x "node_modules/*" "dist/*" ".env*" )
  echo "  dist/kistack-lovable.zip ($(du -h dist/kistack-lovable.zip | cut -f1))  <- upload via Lovable: + → Import project → Upload code"
fi
