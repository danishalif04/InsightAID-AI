"""Offline tests for gold_agreement.py using small synthetic label sets."""
import os
import sys

import pandas as pd
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from gold_agreement import combine_final, compute_agreement  # noqa: E402

COLS = ["item_id", "platform", "collected_date", "url_or_post_id", "text", "language"]


def _rows(*rows):
    return pd.DataFrame(rows, columns=COLS + ["label", "notes"])


def test_agreement_splits_excluded_agreed_disagreed():
    df_a = _rows(
        (1, "TikTok", "2026-10-01", "p1", "best gila", "ms", "positive", ""),
        (2, "X", "2026-10-01", "p2", "lambat gila", "ms", "negative", ""),
        (3, "Shopee", "2026-10-01", "p3", "ad spam link", "en", "positive", "exclude"),
    )
    df_b = _rows(
        (1, "TikTok", "2026-10-01", "p1", "best gila", "ms", "positive", ""),
        (2, "X", "2026-10-01", "p2", "lambat gila", "ms", "neutral", ""),
        (3, "Shopee", "2026-10-01", "p3", "ad spam link", "en", "positive", ""),
    )

    result = compute_agreement(df_a, df_b)

    assert len(result["excluded"]) == 1 and result["excluded"]["item_id"].iloc[0] == 3
    assert len(result["agreed"]) == 1 and result["agreed"]["item_id"].iloc[0] == 1
    assert result["agreed"]["final_label"].iloc[0] == "positive"
    assert len(result["disagreements"]) == 1 and result["disagreements"]["item_id"].iloc[0] == 2
    assert result["disagreements"]["final_label"].iloc[0] == ""
    assert -1.0 <= result["kappa"] <= 1.0


def test_agreement_rejects_mismatched_item_ids():
    df_a = _rows((1, "TikTok", "2026-10-01", "p1", "x", "en", "positive", ""))
    df_b = _rows((2, "TikTok", "2026-10-01", "p2", "y", "en", "positive", ""))
    with pytest.raises(ValueError):
        compute_agreement(df_a, df_b)


def test_agreement_rejects_invalid_label():
    df_a = _rows((1, "TikTok", "2026-10-01", "p1", "x", "en", "very_positive", ""))
    df_b = _rows((1, "TikTok", "2026-10-01", "p1", "x", "en", "positive", ""))
    with pytest.raises(ValueError):
        compute_agreement(df_a, df_b)


def test_combine_merges_agreed_and_adjudicated():
    agreed = pd.DataFrame([{"item_id": 1, "final_label": "positive"}])
    adjudicated = pd.DataFrame([{"item_id": 2, "final_label": "neutral"}])
    combined = combine_final(agreed, adjudicated)
    assert sorted(combined["item_id"]) == [1, 2]


def test_combine_rejects_blank_final_label():
    agreed = pd.DataFrame([{"item_id": 1, "final_label": "positive"}])
    adjudicated = pd.DataFrame([{"item_id": 2, "final_label": ""}])
    with pytest.raises(ValueError):
        combine_final(agreed, adjudicated)
