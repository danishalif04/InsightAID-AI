"""
Fine-tunes mBERT (bert-base-multilingual-cased) as a comparison model
against XLM-R. Not part of FYP2.md §46's literal spec (which names only
XLM-R as the primary model) - this is the user's own methodology addition
for model comparison. Reuses train_xlmr.py's generic train_transformer()
loop rather than duplicating it; only the checkpoint differs.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

try:  # importable both as `src.train_mbert` (tests/notebook) and as a bare script
    from src.train_xlmr import TrainedModel, train_transformer
except ImportError:
    from train_xlmr import TrainedModel, train_transformer

MBERT_CHECKPOINT = "bert-base-multilingual-cased"


def train_mbert(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    output_dir: Path,
    text_column: str = "cleaned_text",
    label_column: str = "label",
    num_epochs: int = 3,
    batch_size: int = 16,
) -> TrainedModel:
    return train_transformer(
        MBERT_CHECKPOINT,
        train_df,
        val_df,
        output_dir,
        text_column=text_column,
        label_column=label_column,
        num_epochs=num_epochs,
        batch_size=batch_size,
    )


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train_csv", required=True)
    parser.add_argument("--val_csv", required=True)
    parser.add_argument("--output_dir", default="ml/sentiment/results/mbert_model")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=16)
    args = parser.parse_args()

    train_df = pd.read_csv(args.train_csv)
    val_df = pd.read_csv(args.val_csv)
    train_mbert(train_df, val_df, Path(args.output_dir), num_epochs=args.epochs, batch_size=args.batch_size)


if __name__ == "__main__":
    main()
