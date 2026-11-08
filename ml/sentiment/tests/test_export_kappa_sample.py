import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from export_kappa_sample import resolve_label, stratified_sample, write_export  # noqa: E402


def make_row(id_, language, rating=None, label=None, text="sample text"):
    return {"id": id_, "language": language, "rating": rating or "", "label": label or "", "raw_text": text, "cleaned_text": text}


def test_resolve_label_prefers_manual_label_over_rating():
    row = make_row("1", "en", rating="5", label="negative")
    assert resolve_label(row) == "negative"


def test_resolve_label_falls_back_to_rating_heuristic():
    row = make_row("1", "en", rating="5")
    assert resolve_label(row) == "positive"


def test_resolve_label_none_when_neither_present():
    row = make_row("1", "en")
    assert resolve_label(row) is None


def test_stratified_sample_covers_multiple_language_label_buckets():
    rows = (
        [make_row(f"en-pos-{i}", "en", rating="5") for i in range(50)]
        + [make_row(f"ms-neg-{i}", "ms", rating="1") for i in range(10)]
        + [make_row(f"zh-neu-{i}", "zh", rating="3") for i in range(5)]
    )
    sample = stratified_sample(rows, n=20, seed=1)
    languages = {row["language"] for row in sample}
    assert languages == {"en", "ms", "zh"}  # rare buckets not crowded out


def test_write_export_has_blank_annotator_2_column(tmp_path):
    rows = [make_row(f"id-{i}", "en", rating="4") for i in range(5)]
    out = tmp_path / "out.csv"
    write_export(rows, out)
    with out.open(newline="", encoding="utf-8") as f:
        reader = list(csv.DictReader(f))
    assert len(reader) == 5
    assert all(r["annotator_2_label"] == "" for r in reader)
    assert all(r["annotator_1_label"] == "positive" for r in reader)
