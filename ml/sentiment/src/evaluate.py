"""
Runs a trained model against both evaluation paths (FYP2.md §47 + the
user's own translate-vs-original methodology):

  - 'original_language': classify cleaned_text as-is.
  - 'translate_to_english': translate non-English text first (src/translate.py),
    then classify the translated text.

Produces one metrics.EvalMetrics + metrics.ModelVersionRow per
(model, eval_path) pair, and writes each to results/ as JSON. Nothing here
invents a metric - every number is computed from whatever predictions the
caller's model actually produced on the test set passed in.
"""

from __future__ import annotations

from pathlib import Path
from typing import Sequence

import pandas as pd

from src import metrics as metrics_module
from src import translate as translate_module

EVAL_PATHS = ("original_language", "translate_to_english")


def _texts_for_path(test_df: pd.DataFrame, eval_path: str, text_column: str) -> list[str]:
    if eval_path == "original_language":
        return list(test_df[text_column])
    if eval_path == "translate_to_english":
        return translate_module.translate_batch(list(test_df[text_column]), list(test_df["language"]))
    raise ValueError(f"unknown eval_path: {eval_path}")


def evaluate_predictions(
    y_true: Sequence[str],
    y_pred: Sequence[str],
    languages: Sequence[str],
    *,
    model_name: str,
    model_version: str,
    model_type: str,
    eval_path: str,
    dataset_version: str | None,
    training_samples: int,
    validation_samples: int,
    test_samples: int,
    notes: str | None = None,
) -> tuple[metrics_module.EvalMetrics, metrics_module.ModelVersionRow]:
    computed = metrics_module.compute_metrics(y_true, y_pred, languages)
    row = metrics_module.build_model_version_row(
        model_name=model_name,
        model_version=model_version,
        model_type=model_type,
        eval_path=eval_path,
        dataset_version=dataset_version,
        training_samples=training_samples,
        validation_samples=validation_samples,
        test_samples=test_samples,
        metrics=computed,
        notes=notes,
    )
    return computed, row


def run_full_comparison(
    predict_fns: dict[str, callable],
    test_df: pd.DataFrame,
    *,
    model_version: str,
    dataset_version: str | None,
    training_samples: int,
    validation_samples: int,
    text_column: str = "cleaned_text",
    label_column: str = "label",
    results_dir: Path = Path("ml/sentiment/results"),
) -> list[metrics_module.ModelVersionRow]:
    """`predict_fns` maps model_type ('xlmr' | 'mbert' | 'tfidf_lr') to a
    `predict(texts: list[str]) -> list[str]` callable for that model, so this
    function stays agnostic to how each model actually predicts. Returns
    every (model, eval_path) row and writes each one to `results_dir`."""
    y_true = list(test_df[label_column])
    languages = list(test_df["language"])
    rows: list[metrics_module.ModelVersionRow] = []

    for model_type, predict_fn in predict_fns.items():
        for eval_path in EVAL_PATHS:
            texts = _texts_for_path(test_df, eval_path, text_column)
            y_pred = predict_fn(texts)
            _computed, row = evaluate_predictions(
                y_true,
                y_pred,
                languages,
                model_name=f"insightaid-sentiment-{model_type}",
                model_version=model_version,
                model_type=model_type,
                eval_path=eval_path,
                dataset_version=dataset_version,
                training_samples=training_samples,
                validation_samples=validation_samples,
                test_samples=len(test_df),
            )
            metrics_module.write_metrics_json(row, results_dir)
            rows.append(row)

    return rows
