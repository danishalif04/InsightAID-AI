"""
McNemar's test (McNemar, 1947) for comparing two classifiers on the SAME
test set: "does model A disagree with model B in a lopsided way, more
often favouring one of them?" Needs, for every test example, whether A
was correct AND whether B was correct - a PAIRED, per-example comparison.

This is a real, tested, runnable implementation (wraps
statsmodels.stats.contingency_tables.mcnemar) - what it does NOT have yet
is the real input data for XLM-R vs the TF-IDF+LR baseline, because this
project only saved AGGREGATE confusion matrices from that training run
(see confidence_interval.py's docstring for the same root cause), not a
per-example table of "was XLM-R right on row i, was TF-IDF right on row
i" for the identical test rows. Two confusion matrices against the true
labels do not tell you whether the two models agreed or disagreed on any
specific example - that information is just gone unless it's re-exported.

To actually run this for real: re-run inference for BOTH models on the
SAME test split in the Colab notebook (checkpoints are already saved on
Drive, no retraining needed - see 03_train_sentiment_models.ipynb), save
a CSV with one row per test example: {example_id, true_label,
xlmr_pred, tfidf_pred}, then call mcnemar_from_predictions() below.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from statsmodels.stats.contingency_tables import mcnemar as _sm_mcnemar


@dataclass
class McNemarResult:
    # [[both correct, A correct & B wrong], [A wrong & B correct, both wrong]]
    contingency_table: list
    statistic: float
    p_value: float
    significant_at_05: bool


def mcnemar_from_contingency(both_correct: int, a_correct_b_wrong: int, a_wrong_b_correct: int, both_wrong: int) -> McNemarResult:
    table = [[both_correct, a_correct_b_wrong], [a_wrong_b_correct, both_wrong]]
    # exact=True (binomial exact test) is the standard choice when the
    # discordant-pairs count is small; statsmodels auto-falls-back to the
    # chi-square approximation internally is NOT automatic, so pick exact
    # only when it's cheap enough — for the pair counts expected here
    # (likely in the hundreds to low thousands) exact is fine and more
    # conservative than the chi-square approximation.
    discordant = a_correct_b_wrong + a_wrong_b_correct
    result = _sm_mcnemar(table, exact=discordant < 5000, correction=True)
    return McNemarResult(
        contingency_table=table,
        statistic=round(float(result.statistic), 4),
        p_value=round(float(result.pvalue), 6),
        significant_at_05=bool(result.pvalue < 0.05),
    )


def mcnemar_from_predictions(y_true: Sequence[str], pred_a: Sequence[str], pred_b: Sequence[str]) -> McNemarResult:
    if not (len(y_true) == len(pred_a) == len(pred_b)):
        raise ValueError("y_true, pred_a, and pred_b must be the same length (paired per-example predictions)")

    both_correct = a_correct_b_wrong = a_wrong_b_correct = both_wrong = 0
    for true, a, b in zip(y_true, pred_a, pred_b):
        a_ok = a == true
        b_ok = b == true
        if a_ok and b_ok:
            both_correct += 1
        elif a_ok and not b_ok:
            a_correct_b_wrong += 1
        elif not a_ok and b_ok:
            a_wrong_b_correct += 1
        else:
            both_wrong += 1

    return mcnemar_from_contingency(both_correct, a_correct_b_wrong, a_wrong_b_correct, both_wrong)
