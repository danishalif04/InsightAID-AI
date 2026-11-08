from dataclasses import asdict
from pathlib import Path

import pytest

from src.confidence_interval import interval_from_confusion_matrix, wilson_interval
from src.parse_training_run import parse_file

# Parsed from the tracked SQL fixture (the source of truth), not the
# gitignored, regeneratable results/model_versions_*.json derived file.
FIXTURE_SQL = Path(__file__).parent.parent / "results" / "fixtures" / "notebook_insert_sql_v20261020-171546.sql"


def test_wilson_interval_brackets_the_point_estimate():
    ci = wilson_interval(9059, 10769)
    assert ci.lower < ci.point_estimate < ci.upper
    assert ci.point_estimate == 0.8412
    assert ci.method == "wilson"
    assert ci.n == 10769


def test_a_tighter_interval_for_a_larger_sample_at_the_same_proportion():
    small = wilson_interval(80, 100)
    large = wilson_interval(8000, 10000)
    assert (large.upper - large.lower) < (small.upper - small.lower)


def test_rejects_impossible_counts():
    with pytest.raises(ValueError):
        wilson_interval(150, 100)
    with pytest.raises(ValueError):
        wilson_interval(5, 0)


def test_interval_from_real_xlmr_confusion_matrix():
    rows = [asdict(row) for row in parse_file(FIXTURE_SQL)]
    xlmr = next(r for r in rows if r["model_type"] == "xlmr" and r["eval_path"] == "original_language")
    ci = interval_from_confusion_matrix(xlmr["confusion_matrix"])
    assert ci.point_estimate == xlmr["accuracy"]
    assert ci.n == xlmr["test_samples"]
    # A real, narrow interval expected at n ~ 10,769 - not a vague guess.
    assert ci.upper - ci.lower < 0.02
