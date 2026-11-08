"""
A 95% confidence interval for a model's accuracy.

The FYP II master prompt asks for a "bootstrap 95% confidence interval",
which technically means resampling individual test examples with
replacement thousands of times. That needs per-example predictions - this
project only has each training run's AGGREGATE confusion matrix (saved in
the notebook's own printed SQL, see parse_training_run.py), because the
real per-example predictions were never exported from Colab (the model
checkpoints live on Google Drive, not reachable from this repo).

Given only a count of correct/incorrect predictions (which a confusion
matrix's diagonal gives for free), the statistically valid substitute is a
**Wilson score interval** for a binomial proportion (Wilson, 1927) - not a
bootstrap, but asymptotically equivalent for a sample this size (n > 10,000)
and does not require resampling raw examples. This is disclosed explicitly,
here and in every report that cites it, rather than silently relabelling a
different statistic as "the bootstrap CI."

If real per-example predictions are exported from Colab in the future,
prefer an actual bootstrap (see error_analysis.py's docstring for what that
export would need to contain) - this module's wilson_interval() would
still be a reasonable sanity check against it, not a replacement.
"""

from __future__ import annotations

from dataclasses import dataclass

from statsmodels.stats.proportion import proportion_confint


@dataclass
class ConfidenceInterval:
    point_estimate: float
    lower: float
    upper: float
    method: str
    n: int


def wilson_interval(n_correct: int, n_total: int, confidence: float = 0.95) -> ConfidenceInterval:
    if n_total <= 0:
        raise ValueError("n_total must be positive")
    if not 0 <= n_correct <= n_total:
        raise ValueError("n_correct must be between 0 and n_total")

    alpha = 1 - confidence
    lower, upper = proportion_confint(n_correct, n_total, alpha=alpha, method="wilson")
    return ConfidenceInterval(
        point_estimate=round(n_correct / n_total, 4),
        lower=round(float(lower), 4),
        upper=round(float(upper), 4),
        method="wilson",
        n=n_total,
    )


def interval_from_confusion_matrix(confusion_matrix: list[list[int]], confidence: float = 0.95) -> ConfidenceInterval:
    """Convenience wrapper: derives n_correct (diagonal sum) and n_total
    (sum of everything) directly from a saved confusion matrix, so a
    caller doesn't have to re-derive those two counts by hand each time."""
    n_correct = sum(confusion_matrix[i][i] for i in range(len(confusion_matrix)))
    n_total = sum(sum(row) for row in confusion_matrix)
    return wilson_interval(n_correct, n_total, confidence)
