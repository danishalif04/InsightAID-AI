"""
FYP II Phase 1 — regenerates src/data/malaysianHolidays.json from the real,
library-computed calendar in ml/forecasting/src/malaysian_holidays.py.

Run manually whenever the covered year range needs extending:
    python scripts/export_malaysian_holidays.py

This keeps the frontend's chart annotations in sync with the exact same
source Prophet will use (Phase 4) — one calculation, two consumers, never
two independently-maintained (and possibly diverging) holiday lists.
"""

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "ml" / "forecasting"))

from src.malaysian_holidays import export_to_json  # noqa: E402

# Covers the real dataset's history (2024 onward, see docs/audit/NUMBERS_VERIFIED.md)
# through a few years ahead for forecasting/chart use. The `holidays`
# library's lunar-calendar accuracy for years this far out is a real,
# documented library computation, not a guess — see malaysian_holidays.py's
# module docstring for the one caveat (Ramadan start, moon-sighting-dependent).
YEARS = list(range(2024, 2029))

OUTPUT_PATH = REPO_ROOT / "src" / "data" / "malaysianHolidays.json"


def main():
    events = export_to_json(YEARS)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(events, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(events)} events ({YEARS[0]}-{YEARS[-1]}) to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
