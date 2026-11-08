"""
Extracts the 50 most-confident WRONG predictions per language, for manual
category tagging (sarcasm, slang, code-mixing, negation, emoji-only) -
the qualitative error analysis the FYP II master prompt's Phase 3 asks for.

Needs per-example predictions with a confidence score (e.g. softmax
probability of the predicted class) - this project does not have that
saved anywhere yet (same root cause as mcnemar_test.py and
confidence_interval.py's docstrings: the training run's real per-example
output was never exported from Colab, only the aggregate confusion
matrix was). This module is the real, tested extraction logic, ready to
run the moment a per-example export exists.

Expected input CSV columns, one row per test example:
    id, language, text, true_label, predicted_label, confidence
"""

from __future__ import annotations

import csv
from dataclasses import asdict, dataclass
from pathlib import Path

CATEGORY_TAGS = ["sarcasm", "slang", "code-mixing", "negation", "emoji-only", "other"]


@dataclass
class ErrorExample:
    id: str
    language: str
    text: str
    true_label: str
    predicted_label: str
    confidence: float
    category_tag: str  # blank - filled in by a human reviewer afterwards


def load_predictions(csv_path: Path) -> list[dict]:
    with csv_path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def top_confident_errors_per_language(rows: list[dict], top_n: int = 50) -> dict[str, list[ErrorExample]]:
    by_language: dict[str, list[dict]] = {}
    for row in rows:
        if row["true_label"] == row["predicted_label"]:
            continue  # not an error
        language = row.get("language", "unknown")
        by_language.setdefault(language, []).append(row)

    result: dict[str, list[ErrorExample]] = {}
    for language, errors in by_language.items():
        ranked = sorted(errors, key=lambda r: float(r["confidence"]), reverse=True)[:top_n]
        result[language] = [
            ErrorExample(
                id=r["id"],
                language=language,
                text=r["text"],
                true_label=r["true_label"],
                predicted_label=r["predicted_label"],
                confidence=round(float(r["confidence"]), 4),
                category_tag="",
            )
            for r in ranked
        ]
    return result


def write_export(errors_by_language: dict[str, list[ErrorExample]], out_path: Path) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["id", "language", "text", "true_label", "predicted_label", "confidence", "category_tag"]
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for errors in errors_by_language.values():
            for error in errors:
                writer.writerow(asdict(error))
    return out_path


if __name__ == "__main__":
    import sys

    src = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    if not src or not dst:
        print("usage: python -m src.error_analysis <per_example_predictions.csv> <out_errors.csv>")
        raise SystemExit(1)
    rows = load_predictions(src)
    errors = top_confident_errors_per_language(rows)
    write_export(errors, dst)
    for language, items in errors.items():
        print(f"{language}: {len(items)} confident error(s) exported")
