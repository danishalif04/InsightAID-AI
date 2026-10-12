import json
from pathlib import Path

from src.metrics import build_model_version_row, compute_metrics, write_metrics_json


def test_compute_metrics_perfect_predictions():
    y_true = ["positive", "negative", "neutral", "positive"]
    y_pred = ["positive", "negative", "neutral", "positive"]
    result = compute_metrics(y_true, y_pred)
    assert result.accuracy == 1.0
    assert result.precision == 1.0
    assert result.recall == 1.0
    assert result.f1 == 1.0
    assert result.n_samples == 4


def test_compute_metrics_known_mismatch():
    y_true = ["positive", "positive", "negative", "negative"]
    y_pred = ["positive", "negative", "negative", "negative"]
    result = compute_metrics(y_true, y_pred)
    assert result.accuracy == 0.75


def test_confusion_matrix_shape_and_labels_order():
    y_true = ["negative", "neutral", "positive"]
    y_pred = ["negative", "neutral", "positive"]
    result = compute_metrics(y_true, y_pred)
    assert len(result.confusion_matrix) == 3
    assert all(len(row) == 3 for row in result.confusion_matrix)
    # LABELS = [negative, neutral, positive] -> perfect diagonal
    assert result.confusion_matrix == [[1, 0, 0], [0, 1, 0], [0, 0, 1]]


def test_per_language_breakdown():
    y_true = ["positive", "negative", "positive", "negative"]
    y_pred = ["positive", "negative", "negative", "negative"]
    languages = ["en", "en", "ms", "ms"]
    result = compute_metrics(y_true, y_pred, languages)
    assert set(result.per_language.keys()) == {"en", "ms"}
    assert result.per_language["en"]["accuracy"] == 1.0
    assert result.per_language["ms"]["accuracy"] == 0.5
    assert result.per_language["en"]["n"] == 2


def test_empty_input_raises():
    try:
        compute_metrics([], [])
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_mismatched_lengths_raise():
    try:
        compute_metrics(["positive"], ["positive", "negative"])
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_build_model_version_row_carries_metrics_through():
    metrics = compute_metrics(["positive", "negative"], ["positive", "negative"])
    row = build_model_version_row(
        model_name="insightaid-sentiment-xlmr",
        model_version="v0-test",
        model_type="xlmr",
        eval_path="original_language",
        dataset_version="ds-v1",
        training_samples=100,
        validation_samples=20,
        test_samples=2,
        metrics=metrics,
    )
    assert row.accuracy == 1.0
    assert row.model_type == "xlmr"
    assert row.eval_path == "original_language"
    assert row.test_samples == 2


def test_write_metrics_json_round_trips(tmp_path: Path):
    metrics = compute_metrics(["positive", "negative"], ["positive", "positive"])
    row = build_model_version_row(
        model_name="insightaid-sentiment-tfidf_lr",
        model_version="v0-test",
        model_type="tfidf_lr",
        eval_path="translate_to_english",
        dataset_version=None,
        training_samples=10,
        validation_samples=2,
        test_samples=2,
        metrics=metrics,
    )
    path = write_metrics_json(row, tmp_path)
    assert path.exists()
    loaded = json.loads(path.read_text(encoding="utf-8"))
    assert loaded["accuracy"] == row.accuracy
    assert loaded["model_type"] == "tfidf_lr"
