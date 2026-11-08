"""
Cohen's kappa (Cohen, 1960) between the two annotator columns that
export_kappa_sample.py's output CSV has (`annotator_1_label`,
`annotator_2_label`), with the Landis & Koch (1977) qualitative
interpretation band.

The real kappa number for this project is BLOCKED, not missing by
oversight: export_kappa_sample.py produces a CSV with `annotator_2_label`
left blank, for a human to fill in. Nobody has done that yet (confirmed:
no filled-in annotation CSV exists anywhere in this repo). This module is
the computation that runs the moment that file exists - it is fully
tested against synthetic two-annotator fixtures, so it is ready, not
hypothetical.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from sklearn.metrics import cohen_kappa_score

LANDIS_KOCH_BANDS = [
    (0.00, "slight"),
    (0.20, "fair"),
    (0.40, "moderate"),
    (0.60, "substantial"),
    (0.80, "almost perfect"),
]


def interpret_kappa(kappa: float) -> str:
    if kappa < 0:
        return "poor (worse than chance agreement)"
    label = "slight"
    for threshold, name in LANDIS_KOCH_BANDS:
        if kappa >= threshold:
            label = name
    return label


@dataclass
class KappaResult:
    kappa: float
    interpretation: str
    n_pairs: int
    n_agreements: int
    agreement_rate: float


def compute_kappa(labels_a: Sequence[str], labels_b: Sequence[str]) -> KappaResult:
    if len(labels_a) != len(labels_b):
        raise ValueError("labels_a and labels_b must be the same length (paired annotations)")
    if len(labels_a) == 0:
        raise ValueError("cannot compute kappa on zero annotated pairs")

    kappa = float(cohen_kappa_score(labels_a, labels_b))
    agreements = sum(1 for a, b in zip(labels_a, labels_b) if a == b)

    return KappaResult(
        kappa=round(kappa, 4),
        interpretation=interpret_kappa(kappa),
        n_pairs=len(labels_a),
        n_agreements=agreements,
        agreement_rate=round(agreements / len(labels_a), 4),
    )


def compute_kappa_from_csv(csv_path: Path) -> KappaResult:
    """Reads export_kappa_sample.py's output format directly. Rows where
    annotator_2_label is still blank (not yet filled in by a human) are
    excluded, never treated as an implicit agreement or disagreement."""
    labels_a: list[str] = []
    labels_b: list[str] = []
    with csv_path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            a = (row.get("annotator_1_label") or "").strip().lower()
            b = (row.get("annotator_2_label") or "").strip().lower()
            if a and b:
                labels_a.append(a)
                labels_b.append(b)

    if not labels_a:
        raise ValueError(
            f"{csv_path} has no rows with both annotator_1_label and annotator_2_label filled "
            "in — the second annotator's column is still blank. Kappa cannot be computed yet."
        )
    return compute_kappa(labels_a, labels_b)


if __name__ == "__main__":
    import sys

    path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if not path:
        print("usage: python -m src.compute_kappa <filled_annotation_csv>")
        raise SystemExit(1)
    result = compute_kappa_from_csv(path)
    print(
        f"Cohen's kappa = {result.kappa} ({result.interpretation}), "
        f"n={result.n_pairs}, raw agreement rate={result.agreement_rate:.2%}"
    )
