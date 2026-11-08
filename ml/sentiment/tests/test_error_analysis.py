from src.error_analysis import ErrorExample, top_confident_errors_per_language


def _row(id_, language, true, pred, confidence, text="sample text"):
    return {"id": id_, "language": language, "text": text, "true_label": true, "predicted_label": pred, "confidence": str(confidence)}


def test_excludes_correct_predictions():
    rows = [_row("1", "en", "positive", "positive", 0.9)]
    result = top_confident_errors_per_language(rows)
    assert result == {}


def test_ranks_errors_by_confidence_descending():
    rows = [
        _row("1", "en", "positive", "negative", 0.4),
        _row("2", "en", "positive", "negative", 0.95),
        _row("3", "en", "positive", "negative", 0.7),
    ]
    result = top_confident_errors_per_language(rows)
    confidences = [e.confidence for e in result["en"]]
    assert confidences == sorted(confidences, reverse=True)
    assert confidences[0] == 0.95


def test_respects_top_n_per_language():
    rows = [_row(str(i), "en", "positive", "negative", i / 100) for i in range(100)]
    result = top_confident_errors_per_language(rows, top_n=50)
    assert len(result["en"]) == 50


def test_separates_languages_independently():
    rows = [
        _row("1", "en", "positive", "negative", 0.9),
        _row("2", "ms", "neutral", "positive", 0.8),
        _row("3", "zh", "negative", "neutral", 0.7),
    ]
    result = top_confident_errors_per_language(rows)
    assert set(result.keys()) == {"en", "ms", "zh"}
    assert all(len(v) == 1 for v in result.values())


def test_category_tag_starts_blank_for_human_review():
    rows = [_row("1", "en", "positive", "negative", 0.9)]
    result = top_confident_errors_per_language(rows)
    example: ErrorExample = result["en"][0]
    assert example.category_tag == ""
