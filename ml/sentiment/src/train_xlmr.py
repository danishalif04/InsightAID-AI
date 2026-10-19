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
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)

LABELS = ["negative", "neutral", "positive"]
LABEL2ID = {label: i for i, label in enumerate(LABELS)}
ID2LABEL = {i: label for label, i in LABEL2ID.items()}

XLMR_CHECKPOINT = "xlm-roberta-base"


class TextClassificationDataset(Dataset):
    """Tokenizes lazily, one example per __getitem__ call, with no padding
    here — padding is deferred to DataCollatorWithPadding at batch time
    (train_transformer() below), so each batch only pads to its own
    longest sequence instead of one shared length across the whole
    dataset. The previous version tokenized every row upfront in a single
    call with padding=True, materializing a dense [n_rows x max_len]
    tensor for a 85k+ row training set — real system-RAM exhaustion on
    Colab ("crashed after using all available RAM"), not a GPU/CUDA OOM.
    This is the standard HuggingFace pattern for exactly that reason."""

    def __init__(self, texts: Sequence[str], labels: Sequence[str], tokenizer, max_length: int = 128):
        self.texts = list(texts)
        self.label_ids = [LABEL2ID[label] for label in labels]
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self) -> int:
        return len(self.label_ids)

    def __getitem__(self, idx: int) -> dict:
        encoding = self.tokenizer(self.texts[idx], truncation=True, max_length=self.max_length)
        item = {key: torch.tensor(val) for key, val in encoding.items()}
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
        data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
    )
    trainer.train()

    output_dir.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))

    return TrainedModel(model=model, tokenizer=tokenizer, output_dir=output_dir)


@torch.no_grad()
def predict(trained: TrainedModel, texts: Sequence[str], batch_size: int = 32) -> list[str]:
    trained.model.eval()
    # Whatever device the model is actually on - a freshly-trained model
    # (via Trainer) ends up on GPU automatically; one reloaded from a Drive
    # checkpoint via from_pretrained() does NOT, unless moved there
    # explicitly (see the notebook's checkpoint-reload cells). Tokenizer
    # output is CPU tensors by default either way, so without this,
    # calling the model on a GPU-resident model with CPU-resident inputs
    # raises a device-mismatch RuntimeError.
    device = next(trained.model.parameters()).device
    predictions: list[str] = []
    total_batches = (len(texts) + batch_size - 1) // batch_size
    for batch_num, start in enumerate(range(0, len(texts), batch_size), start=1):
        print(f"[predict] batch {batch_num}/{total_batches} ({len(predictions)}/{len(texts)} done)", flush=True)
        batch = list(texts[start : start + batch_size])
        encodings = trained.tokenizer(batch, truncation=True, padding=True, max_length=128, return_tensors="pt").to(device)
        logits = trained.model(**encodings).logits
        batch_ids = np.argmax(logits.cpu().numpy(), axis=1)
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
