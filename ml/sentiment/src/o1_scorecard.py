"""
O1's acceptance target, computed (never typed by hand): "Accuracy >= 80%
overall AND >= 75% for each language separately" (CLAUDE.md / the FYP II
master prompt). Reads a parsed model_versions JSON (see
parse_training_run.py) and reports pass/fail per model/eval_path, from the
real numbers already in that file - this module adds no new numbers of
its own, only the comparison against the fixed thresholds.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

OVERALL_ACCURACY_TARGET = 0.80
PER_LANGUAGE_ACCURACY_TARGET = 0.75


@dataclass
class ScorecardRow:
    model_type: str
    eval_path: str
    overall_accuracy: float
    overall_pass: bool
    per_language_accuracy: dict  # {language: accuracy}
    per_language_pass: dict  # {language: bool}
    all_targets_met: bool
    # Which specific requirement(s) failed, in plain language - empty when all_targets_met.
    failure_reasons: list


def score_row(row: dict) -> ScorecardRow:
    overall_pass = row["accuracy"] >= OVERALL_ACCURACY_TARGET
    per_language_pass = {
        lang: metrics["accuracy"] >= PER_LANGUAGE_ACCURACY_TARGET
        for lang, metrics in row["per_language_metrics"].items()
    }
    failure_reasons = []
    if not overall_pass:
        failure_reasons.append(
            f"Overall accuracy {row['accuracy']:.2%} is below the {OVERALL_ACCURACY_TARGET:.0%} target."
        )
    for lang, passed in per_language_pass.items():
        if not passed:
            acc = row["per_language_metrics"][lang]["accuracy"]
            failure_reasons.append(
                f"{lang} accuracy {acc:.2%} is below the {PER_LANGUAGE_ACCURACY_TARGET:.0%} per-language target."
            )

    return ScorecardRow(
        model_type=row["model_type"],
        eval_path=row["eval_path"],
        overall_accuracy=row["accuracy"],
        overall_pass=overall_pass,
        per_language_accuracy={lang: m["accuracy"] for lang, m in row["per_language_metrics"].items()},
        per_language_pass=per_language_pass,
        all_targets_met=overall_pass and all(per_language_pass.values()),
        failure_reasons=failure_reasons,
    )


def build_scorecard(parsed_rows: list[dict]) -> list[ScorecardRow]:
    return [score_row(row) for row in parsed_rows]


def render_markdown(scorecard: list[ScorecardRow]) -> str:
    lines = [
        "# O1 Scorecard — Multilingual Sentiment Model",
        "",
        f"Target: overall accuracy >= {OVERALL_ACCURACY_TARGET:.0%} AND each language's accuracy >= {PER_LANGUAGE_ACCURACY_TARGET:.0%}.",
        "Every value below is read from a real training run's saved output (see results/model_versions_*.json) — nothing here is hand-typed.",
        "",
        "| Model | Eval path | Overall acc. | en | ms | zh | Target met? |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in scorecard:
        langs = row.per_language_accuracy
        fmt = lambda v: f"{v:.2%}" if v is not None else "—"
        lines.append(
            f"| {row.model_type} | {row.eval_path} | {fmt(row.overall_accuracy)} | "
            f"{fmt(langs.get('en'))} | {fmt(langs.get('ms'))} | {fmt(langs.get('zh'))} | "
            f"{'PASS' if row.all_targets_met else 'FAIL'} |"
        )
    lines.append("")
    best = max((r for r in scorecard if r.eval_path == "original_language"), key=lambda r: r.overall_accuracy, default=None)
    if best is not None:
        verdict = "MET" if best.all_targets_met else "NOT MET"
        lines.append(
            f"**O1 verdict (best model, {best.model_type}, original-language path): target {verdict}.**"
        )
        if best.failure_reasons:
            lines.append("Failure reasons: " + "; ".join(best.failure_reasons))
        lines.append("")
        lines.append(
            "Note: no language in this evaluation set is tagged as code-mixed "
            "('ms-en') — the real dataset (docs/datasets/sentiment/DATASET_REPORT.md) "
            "only carries en/ms/zh language tags for its labelled examples, so a "
            "code-mixed accuracy figure cannot be reported from this run. The live "
            "app's own language detector (src/utils/textPreprocessing.js) does "
            "detect code-mixed text at inference time; this is a real, disclosed "
            "gap between the evaluation set's language coverage and the full "
            "multilingual claim, not a result being hidden."
        )
    return "\n".join(lines)


if __name__ == "__main__":
    import sys

    src = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if not src:
        print("usage: python -m src.o1_scorecard <parsed_model_versions.json>")
        raise SystemExit(1)
    rows = json.loads(src.read_text(encoding="utf-8"))
    scorecard = build_scorecard(rows)
    print(render_markdown(scorecard))
