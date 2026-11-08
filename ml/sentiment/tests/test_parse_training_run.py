from pathlib import Path

from src.parse_training_run import parse_file, parse_insert_statements

FIXTURE = Path(__file__).parent.parent / "results" / "fixtures" / "notebook_insert_sql_v20261020-171546.sql"


def test_parses_all_six_real_rows_from_the_actual_training_run():
    rows = parse_file(FIXTURE)
    assert len(rows) == 6
    assert {(r.model_type, r.eval_path) for r in rows} == {
        ("tfidf_lr", "original_language"),
        ("tfidf_lr", "translate_to_english"),
        ("xlmr", "original_language"),
        ("xlmr", "translate_to_english"),
        ("mbert", "original_language"),
        ("mbert", "translate_to_english"),
    }


def test_xlmr_original_language_matches_the_real_known_numbers():
    rows = parse_file(FIXTURE)
    xlmr = next(r for r in rows if r.model_type == "xlmr" and r.eval_path == "original_language")
    assert xlmr.accuracy == 0.8412
    assert xlmr.f1 == 0.8066
    assert xlmr.per_language_metrics["en"]["accuracy"] == 0.7828
    assert xlmr.per_language_metrics["ms"]["accuracy"] == 0.8688
    assert xlmr.per_language_metrics["zh"]["accuracy"] == 0.9437
    assert xlmr.confusion_matrix == [[3664, 442, 238], [429, 1252, 221], [202, 178, 4143]]
    assert xlmr.notes is None


def test_confusion_matrix_diagonal_sum_matches_accuracy_times_n():
    rows = parse_file(FIXTURE)
    xlmr = next(r for r in rows if r.model_type == "xlmr" and r.eval_path == "original_language")
    correct = sum(xlmr.confusion_matrix[i][i] for i in range(3))
    assert correct == 9059
    assert round(correct / xlmr.test_samples, 4) == xlmr.accuracy


def test_skips_a_statement_that_does_not_match_the_known_column_count():
    malformed = "INSERT INTO model_versions (a, b) VALUES ('x', 'y');"
    assert parse_insert_statements(malformed) == []


def test_handles_an_embedded_escaped_quote_in_a_string_field():
    sql = (
        "INSERT INTO model_versions ("
        "model_name, model_version, model_type, eval_path, trained_at, dataset_version, "
        "training_samples, validation_samples, test_samples, accuracy, precision, recall, f1, "
        "per_language_metrics, confusion_matrix, notes) VALUES ("
        "'m', 'v1', 'xlmr', 'original_language', '2026-01-01T00:00:00Z', 'd1', "
        "10, 2, 2, 0.5, 0.5, 0.5, 0.5, "
        "'{}'::jsonb, '[[1,0],[0,1]]'::jsonb, 'a note with an escaped '' quote');"
    )
    rows = parse_insert_statements(sql)
    assert len(rows) == 1
    assert rows[0].notes == "a note with an escaped ' quote"
