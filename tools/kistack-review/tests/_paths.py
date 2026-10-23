"""Make the in-tree ``kistack_review`` package importable when tests run from the repo root.

``python3 -m unittest discover -s tools/kistack-review/tests`` puts the tests directory on
``sys.path``; this shim adds the package root next to it.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
