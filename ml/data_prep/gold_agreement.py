"""Gold test set double-annotation agreement (gold_test_set/ANNOTATION_GUIDELINES.md).

Two independent annotators each fill a copy of gold_items_template.csv
(annotator_A_labels.csv / annotator_B_labels.csv). This script compares
their `label` columns, reports Cohen's kappa, and splits the items into:

  - gold_excluded.csv                   either annotator marked notes='exclude'
  - gold_agreed.csv                     both annotators gave the same label
  - gold_disagreements_to_adjudicate.csv labels differ — final_label left blank
                                         for a human to fill in after discussion

After adjudication, run the `combine` command to merge gold_agreed.csv and
the filled-in disagreements file into one final gold_test_set.csv.

No label is ever invented here — every row's final_label is either what
both annotators already agreed on, or what a human explicitly wrote into
the adjudicated file.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
from sklearn.metrics import cohen_kappa_score

LABELS = ["negative", "neutral", "positive"]


def compute_agreement(df_a: pd.DataFrame, df_b: pd.DataFrame) -> dict:
    """Merges two annotators' label files on item_id and splits them into
    excluded/agreed/disagreement sets. Returns a dict with the kappa score
    (computed only over included, both-labelled items) and the three
    DataFrames. Raises if item_id sets don't match — a silent subset
    comparison would misrepresent agreement."""
    if set(df_a["item_id"]) != set(df_b["item_id"]):
        raise ValueError("annotator_A and annotator_B must label exactly the same set of item_id values")

    merged = df_a.merge(df_b, on="item_id", suffixes=("_a", "_b"))

    is_excluded = (merged["notes_a"].fillna("").str.strip().str.lower() == "exclude") | (
        merged["notes_b"].fillna("").str.strip().str.lower() == "exclude"
    )
    excluded = merged[is_excluded].copy()
    included = merged[~is_excluded].copy()

    for col in ("label_a", "label_b"):
        unknown = ~included[col].isin(LABELS)
        if unknown.any():
            bad = included.loc[unknown, "item_id"].tolist()
            raise ValueError(f"{col} has values outside {LABELS} for item_id(s): {bad}")

    kappa = cohen_kappa_score(included["label_a"], included["label_b"]) if len(included) > 0 else None

    is_agreed = included["label_a"] == included["label_b"]
    agreed = included[is_agreed].copy()
    agreed["final_label"] = agreed["label_a"]

    disagreements = included[~is_agreed].copy()
    disagreements["final_label"] = ""

    return {"kappa": kappa, "excluded": excluded, "agreed": agreed, "disagreements": disagreements}


def combine_final(agreed: pd.DataFrame, adjudicated: pd.DataFrame) -> pd.DataFrame:
    """Merges the auto-agreed rows with the (now human-filled) disagreements
    file into the final gold test set. Fails loudly if any final_label is
    still blank or invalid, rather than silently dropping/guessing rows."""
    combined = pd.concat([agreed, adjudicated], ignore_index=True)
    bad = combined[~combined["final_label"].isin(LABELS)]
    if len(bad) > 0:
        raise ValueError(
            f"{len(bad)} row(s) have a missing/invalid final_label after adjudication: "
            f"{bad['item_id'].tolist()}. Fill final_label with one of {LABELS} for every row first."
        )
    return combined


def _common_output_columns(df: pd.DataFrame) -> pd.DataFrame:
    keep = ["item_id", "platform_a", "collected_date_a", "text_a", "language_a", "label_a", "label_b", "final_label"]
    present = [c for c in keep if c in df.columns]
    out = df[present].rename(columns={"platform_a": "platform", "collected_date_a": "collected_date", "text_a": "text", "language_a": "language"})
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    agree = sub.add_parser("agreement", help="Compare annotator_A/B labels, report kappa, write the 3 split files.")
    agree.add_argument("--annotator_a", required=True)
    agree.add_argument("--annotator_b", required=True)
    agree.add_argument("--output_dir", default="gold_test_set")

    combine = sub.add_parser("combine", help="Merge gold_agreed.csv + the adjudicated disagreements file.")
    combine.add_argument("--agreed", required=True)
    combine.add_argument("--adjudicated", required=True)
    combine.add_argument("--output", default="gold_test_set/gold_test_set.csv")

    args = parser.parse_args()

    if args.command == "agreement":
        result = compute_agreement(pd.read_csv(args.annotator_a), pd.read_csv(args.annotator_b))
        out_dir = Path(args.output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        n_total = len(result["excluded"]) + len(result["agreed"]) + len(result["disagreements"])
        print(f"Items: {n_total} total, {len(result['excluded'])} excluded, "
              f"{len(result['agreed'])} agreed, {len(result['disagreements'])} disagreements")
        print(f"Cohen's kappa (agreed+disagreements only): {result['kappa']}")

        _common_output_columns(result["excluded"]).to_csv(out_dir / "gold_excluded.csv", index=False)
        _common_output_columns(result["agreed"]).to_csv(out_dir / "gold_agreed.csv", index=False)
        _common_output_columns(result["disagreements"]).to_csv(out_dir / "gold_disagreements_to_adjudicate.csv", index=False)
        print(f"Wrote gold_excluded.csv, gold_agreed.csv, gold_disagreements_to_adjudicate.csv to {out_dir}/")
        print("Fill in final_label in gold_disagreements_to_adjudicate.csv together, then run the 'combine' command.")

    elif args.command == "combine":
        combined = combine_final(pd.read_csv(args.agreed), pd.read_csv(args.adjudicated))
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        combined.to_csv(args.output, index=False)
        print(f"Wrote {len(combined)} rows to {args.output}")


if __name__ == "__main__":
    main()
