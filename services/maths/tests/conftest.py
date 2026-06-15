"""Make the service package importable as `app.*` regardless of pytest's
invocation directory (repo root or services/maths)."""
import pathlib
import sys

# services/maths — the dir that contains the `app` package.
_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
