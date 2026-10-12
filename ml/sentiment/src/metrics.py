"""
Evaluation metrics (FYP2.md §47-48): accuracy, precision, recall, F1,
confusion matrix, and per-language breakdown, plus the JSON/model_versions
row shape those numbers get persisted in.

This module contains real, runnable metric computation - it is unit-tested
against synthetic predictions in tests/test_metrics.py. What it does NOT
contain is any actual training result: no function here invents a number.
Every value it returns comes from whatever y_true/y_pred arrays the caller
passes in, so a call against real model predictions produces real metrics,
and results/metrics_template.json (checked into this repo) is left with
every field null until someone actually runs training on real data.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Sequence

from sklearn.metrics import confusion_matrix as sk_confusion_matrix
from sklearn.metrics import precision_recall_fscore_support

LABELS = ["negative", "neutral", "positive"]


@dataclass
class EvalMetrics:
    accuracy: float
    precision: float
    recall: float
    f1: float
    confusion_matrix: list  # LABELS x LABELS, row = true, col = predicted
    per_language: dict  # {language: {accuracy, precision, recall, f1, n}}
    n_samples: int


def compute_metrics(
    y_true: Sequence[str],
    y_pred: Sequence[str],
    languages: Optional[Sequence[str]] = None,
) -> EvalMetrics:
    if len(y_true) != len(y_pred):
        raise ValueError("y_true and y_pred must be the same length")
    if languages is not None and len(languages) != len(y_true):
        raise ValueError("languages must be the same length as y_true")

    n = len(y_true)
    if n == 0:
        raise ValueError("cannot compute metrics on an empty set")

    accuracy = sum(1 for t, p in zip(y_true, y_pred) if t == p) / n

    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, labels=LABELS, average="macro", zero_division=0
    )

    cm = sk_confusion_matrix(y_true, y_pred, labels=LABELS).tolist()

    per_language: dict = {}
    if languages is not None:
        by_lang: dict[str, tuple[list, list]] = {}
        for t, p, lang in zip(y_true, y_pred, languages):
            by_lang.setdefault(lang, ([], []))
            by_lang[lang][0].append(t)
            by_lang[lang][1].append(p)

        for lang, (lt, lp) in by_lang.items():
            lang_acc = sum(1 for t, p in zip(lt, lp) if t == p) / len(lt)
            lp_, lr_, lf_, _ = precision_recall_fscore_support(
                lt, lp, labels=LABELS, average="macro", zero_division=0
            )
            per_language[lang] = {
                "accuracy": round(float(lang_acc), 4),
                "precision": round(float(lp_), 4),
                "recall": round(float(lr_), 4),
                "f1": round(float(lf_), 4),
                "n": len(lt),
            }

    return EvalMetrics(
        accuracy=round(float(accuracy), 4),
        precision=round(float(precision), 4),
        recall=round(float(recall), 4),
        f1=round(float(f1), 4),
        confusion_matrix=cm,
        per_language=per_language,
        n_samples=n,
    )


@dataclass
class ModelVersionRow:
    """Mirrors the model_versions table (supabase/migrations/0004_model_versions.sql)."""

    model_name: str
    model_version: str
    model_type: str  # 'xlmr' | 'mbert' | 'tfidf_lr'
    eval_path: str  # 'original_language' | 'translate_to_english'
    trained_at: str
    dataset_version: Optional[str]
    training_samples: int
    validation_samples: int
    test_samples: int
    accuracy: float
    precision: float
    recall: float
    f1: float
    per_language_metrics: dict
    confusion_matrix: list
    notes: Optional[str] = None


def build_model_version_row(
    *,
    model_name: str,
    model_version: str,
    model_type: str,
    eval_path: str,
    dataset_version: Optional[str],
    training_samples: int,
    validation_samples: int,
    test_samples: int,
    metrics: EvalMetrics,
    notes: Optional[str] = None,
) -> ModelVersionRow:
    return ModelVersionRow(
        model_name=model_name,
        model_version=model_version,
        model_type=model_type,
        eval_path=eval_path,
        trained_at=datetime.now(timezone.utc).isoformat(),
        dataset_version=dataset_version,
        training_samples=training_samples,
        validation_samples=validation_samples,
        test_samples=test_samples,
        accuracy=metrics.accuracy,
        precision=metrics.precision,
        recall=metrics.recall,
        f1=metrics.f1,
        per_language_metrics=metrics.per_language,
        confusion_matrix=metrics.confusion_matrix,
        notes=notes,
    )


def write_metrics_json(row: ModelVersionRow, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{row.model_type}_{row.eval_path}_{row.model_version}.json"
    path = out_dir / filename
    path.write_text(json.dumps(asdict(row), indent=2), encoding="utf-8")
    return path
