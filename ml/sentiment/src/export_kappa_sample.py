"""
Exports a stratified (by language x weak-sentiment-class) sample for a
second human annotator, for FYP II Phase 3/8's Cohen's kappa requirement
(>= 200 double-labelled comments).

Why a SCRIPT, not a static exported CSV: no labelled training data ships
with this repo (see data/schema.md -- "No manually-labelled data ships
with this repo" / README.md -- "No labelled training data ships with this
repo"). The real ~107,171-row dataset used for the actual XLM-R/mBERT/
TF-IDF training run (see docs/datasets/sentiment/DATASET_REPORT.md) lives
in Google Colab / the HF/Kaggle sources it was assembled from, not
committed here. Fabricating a 200-row sample file without that real data
would violate this project's own "never fabricate a number/dataset" rule
-- so this is the TOOL to run against the real data wherever it actually
is (Colab, or a local export), not a pre-made result.

Usage:
    python export_kappa_sample.py --input <path to a CSV matching
        data/schema.md's columns> --output kappa_annotation_sample.csv
        --n 200

The output CSV has one extra blank column, `annotator_2_label`, for the
second annotator to fill in (positive/neutral/negative). Once filled in,
Phase 8's kappa script (not yet built -- see docs/AUDIT.md's Phase 8 gap
list) computes Cohen's kappa between `annotator_1_label` (the original
weak/gold label this script copies in) and `annotator_2_label`.
"""

from __future__ import annotations

import argparse
import csv
import random
from collections import defaultdict
from pathlib import Path

from weak_labels import classify_by_rating


def load_rows(input_path: Path) -> list[dict]:
    with input_path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def resolve_label(row: dict) -> str | None:
    """Prefers a real manual `label` column over the rating-derived weak
    label, matching data/schema.md's documented priority order."""
    label = (row.get("label") or "").strip().lower()
    if label in ("positive", "neutral", "negative"):
        return label
    weak = classify_by_rating(row.get("rating"))
    return weak.sentiment if weak else None


def stratified_sample(rows: list[dict], n: int, seed: int) -> list[dict]:
    """Stratifies by (language, resolved label) so rare combinations (e.g.
    Mandarin neutral) aren't crowded out by common ones (e.g. English
    positive) -- proportional allocation, never all-one-bucket."""
    buckets: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in rows:
        label = resolve_label(row)
        if label is None:
            continue
        language = (row.get("language") or "unknown").strip() or "unknown"
        buckets[(language, label)].append(row)

    total_eligible = sum(len(v) for v in buckets.values())
    if total_eligible == 0:
        return []

    rng = random.Random(seed)
    sample: list[dict] = []
    for key, bucket_rows in buckets.items():
        share = len(bucket_rows) / total_eligible
        take = max(1, round(n * share)) if bucket_rows else 0
        take = min(take, len(bucket_rows))
        sample.extend(rng.sample(bucket_rows, take))

    rng.shuffle(sample)
    return sample[:n] if len(sample) > n else sample


def write_export(sample: list[dict], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["id", "language", "raw_text", "cleaned_text", "annotator_1_label", "annotator_2_label"]
    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in sample:
            writer.writerow(
                {
                    "id": row.get("id", ""),
                    "language": row.get("language", "unknown"),
                    "raw_text": row.get("raw_text", ""),
                    "cleaned_text": row.get("cleaned_text", ""),
                    "annotator_1_label": resolve_label(row) or "",
                    "annotator_2_label": "",  # filled in by the second human annotator
                }
            )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="CSV matching ml/sentiment/data/schema.md")
    parser.add_argument("--output", default="kappa_annotation_sample.csv")
    parser.add_argument("--n", type=int, default=200)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rows = load_rows(Path(args.input))
    sample = stratified_sample(rows, args.n, args.seed)
    if len(sample) < args.n:
        print(f"WARNING: only {len(sample)} eligible rows found (requested {args.n}). "
              f"Exported what was available -- never padded with invented rows.")
    write_export(sample, Path(args.output))
    print(f"Wrote {len(sample)} rows to {args.output} for second-annotator labelling.")


if __name__ == "__main__":
    main()
