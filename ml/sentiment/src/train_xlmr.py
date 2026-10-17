"""
Fine-tunes XLM-RoBERTa for 3-class sentiment classification (FYP2.md §46,
primary model). Meant to run inside the Colab notebook
(notebooks/train_sentiment_xlmr.ipynb), not inside any Vercel/Edge Function
request - training happens fully offline per §46's explicit instruction.

train_transformer() is generic over the checkpoint, so train_mbert.py
reuses it for the mBERT comparison model instead of duplicating the
training loop.

Heavy imports (torch/transformers/datasets) are at module level because
this file is only ever imported when someone actually intends to train -
unlike src/translate.py, it is never imported by the pure-logic test suite.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
)

LABELS = ["negative", "neutral", "positive"]
LABEL2ID = {label: i for i, label in enumerate(LABELS)}
ID2LABEL = {i: label for label, i in LABEL2ID.items()}

XLMR_CHECKPOINT = "xlm-roberta-base"


class TextClassificationDataset(Dataset):
    def __init__(self, texts: Sequence[str], labels: Sequence[str], tokenizer, max_length: int = 128):
        self.encodings = tokenizer(
            list(texts), truncation=True, padding=True, max_length=max_length
        )
        self.label_ids = [LABEL2ID[label] for label in labels]

    def __len__(self) -> int:
        return len(self.label_ids)

    def __getitem__(self, idx: int) -> dict:
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item["labels"] = torch.tensor(self.label_ids[idx])
        return item


@dataclass
class TrainedModel:
    model: AutoModelForSequenceClassification
    tokenizer: AutoTokenizer
    output_dir: Path


def train_transformer(
    checkpoint: str,
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    output_dir: Path,
    text_column: str = "cleaned_text",
    label_column: str = "label",
    num_epochs: int = 3,
    batch_size: int = 16,
    learning_rate: float = 2e-5,
    seed: int = 42,
) -> TrainedModel:
    """Generic fine-tuning loop shared by train_xlmr.py and train_mbert.py.
    `train_df`/`val_df` must have `text_column` and `label_column` (values in
    LABELS). Returns the trained model/tokenizer; call evaluate.py to score
    it on a held-out test set."""
    tokenizer = AutoTokenizer.from_pretrained(checkpoint)
    model = AutoModelForSequenceClassification.from_pretrained(
        checkpoint, num_labels=len(LABELS), id2label=ID2LABEL, label2id=LABEL2ID
    )

    train_dataset = TextClassificationDataset(train_df[text_column], train_df[label_column], tokenizer)
    val_dataset = TextClassificationDataset(val_df[text_column], val_df[label_column], tokenizer)

    args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=num_epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=learning_rate,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        seed=seed,
        report_to=[],
        # Mixed-precision on GPU — real speedup (T4 has dedicated fp16
        # tensor cores) with no accuracy trade-off, unlike cutting epochs
        # or batch size. False on CPU, where fp16 isn't supported/helpful.
        fp16=torch.cuda.is_available(),
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
    )
    trainer.train()

    output_dir.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))

    return TrainedModel(model=model, tokenizer=tokenizer, output_dir=output_dir)


@torch.no_grad()
def predict(trained: TrainedModel, texts: Sequence[str], batch_size: int = 32) -> list[str]:
    trained.model.eval()
    predictions: list[str] = []
    for start in range(0, len(texts), batch_size):
        batch = list(texts[start : start + batch_size])
        encodings = trained.tokenizer(batch, truncation=True, padding=True, max_length=128, return_tensors="pt")
        logits = trained.model(**encodings).logits
        batch_ids = np.argmax(logits.numpy(), axis=1)
        predictions.extend(ID2LABEL[i] for i in batch_ids)
    return predictions


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train_csv", required=True, help="CSV with cleaned_text/language/label columns")
    parser.add_argument("--val_csv", required=True)
    parser.add_argument("--output_dir", default="ml/sentiment/results/xlmr_model")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=16)
    args = parser.parse_args()

    train_df = pd.read_csv(args.train_csv)
    val_df = pd.read_csv(args.val_csv)
    train_transformer(
        XLMR_CHECKPOINT,
        train_df,
        val_df,
        Path(args.output_dir),
        num_epochs=args.epochs,
        batch_size=args.batch_size,
    )


if __name__ == "__main__":
    main()
