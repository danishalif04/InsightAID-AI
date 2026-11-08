from dataclasses import asdict
from pathlib import Path

from src.o1_scorecard import build_scorecard, render_markdown, score_row
from src.parse_training_run import parse_file

# The tracked fixture is the SQL the notebook actually printed - the
# source of truth. The parsed JSON (results/model_versions_*.json) is a
# gitignored, regeneratable derived artifact, so tests parse the SQL
# directly rather than depending on that file existing on disk.
FIXTURE_SQL = Path(__file__).parent.parent / "results" / "fixtures" / "notebook_insert_sql_v20261020-171546.sql"


def _load_rows():
    return [asdict(row) for row in parse_file(FIXTURE_SQL)]


def test_real_xlmr_original_language_run_meets_o1_target():
    rows = _load_rows()
    xlmr = next(r for r in rows if r["model_type"] == "xlmr" and r["eval_path"] == "original_language")
    scored = score_row(xlmr)
    assert scored.overall_pass is True
    assert all(scored.per_language_pass.values())
    assert scored.all_targets_met is True
    assert scored.failure_reasons == []


def test_real_translate_to_english_run_fails_the_target():
    rows = _load_rows()
    xlmr_translated = next(r for r in rows if r["model_type"] == "xlmr" and r["eval_path"] == "translate_to_english")
    scored = score_row(xlmr_translated)
    assert scored.all_targets_met is False
    assert len(scored.failure_reasons) > 0


def test_a_model_passing_overall_but_failing_one_language_is_not_all_targets_met():
    row = {
        "model_type": "fake",
        "eval_path": "original_language",
        "accuracy": 0.85,
        "per_language_metrics": {"en": {"accuracy": 0.9}, "ms": {"accuracy": 0.6}},
    }
    scored = score_row(row)
    assert scored.overall_pass is True
    assert scored.per_language_pass == {"en": True, "ms": False}
    assert scored.all_targets_met is False
    assert "ms" in scored.failure_reasons[0]


def test_render_markdown_includes_a_verdict_and_the_code_mixed_disclosure():
    rows = _load_rows()
    scorecard = build_scorecard(rows)
    markdown = render_markdown(scorecard)
    assert "O1 verdict" in markdown
    assert "code-mixed" in markdown
    assert "MET" in markdown
