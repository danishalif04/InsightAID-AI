import pandas as pd

from src.split import check_leakage, stratified_split


def _synthetic_df(n_authors: int = 30, rows_per_author: int = 3) -> pd.DataFrame:
    labels = ["positive", "neutral", "negative"]
    languages = ["en", "ms", "zh"]
    rows = []
    row_id = 0
    for author_idx in range(n_authors):
        language = languages[author_idx % len(languages)]
        label = labels[author_idx % len(labels)]
        for r in range(rows_per_author):
            rows.append(
                {
                    "id": row_id,
                    "author_id_hash": f"author_{author_idx}",
                    "cleaned_text": f"unique text {author_idx} {r}",
                    "language": language,
                    "label": label,
                }
            )
            row_id += 1
    return pd.DataFrame(rows)


def test_split_produces_all_three_splits_nonempty():
    df = _synthetic_df()
    result = stratified_split(df)
    assert len(result.train) > 0
    assert len(result.val) > 0
    assert len(result.test) > 0


def test_split_has_no_author_leakage():
    df = _synthetic_df()
    result = stratified_split(df)
    report = check_leakage(result.train, result.val, result.test)
    assert report["clean"] is True
    assert report["leaked_authors"] == []
    assert report["duplicate_ids"] == []


def test_split_drops_exact_duplicate_text():
    df = _synthetic_df()
    duplicate_row = df.iloc[0].copy()
    duplicate_row["id"] = 9999
    duplicate_row["author_id_hash"] = "author_0"
    df = pd.concat([df, pd.DataFrame([duplicate_row])], ignore_index=True)

    result = stratified_split(df)
    assert result.dropped_duplicates == 1


def test_split_respects_approximate_ratios():
    df = _synthetic_df(n_authors=90, rows_per_author=1)
    result = stratified_split(df, ratios=(0.7, 0.15, 0.15))
    total = len(result.train) + len(result.val) + len(result.test)
    assert total == 90
    assert 0.55 <= len(result.train) / total <= 0.85


def test_manual_validation_subset_is_excluded_from_pool_and_placed_in_val():
    df = _synthetic_df()
    manual_df = pd.DataFrame(
        [
            {
                "id": 0,
                "author_id_hash": "author_0",
                "cleaned_text": "unique text 0 0",
                "language": "en",
                "label": "positive",
            }
        ]
    )

    result = stratified_split(df, manual_df=manual_df)

    assert 0 not in set(result.train["id"])
    assert 0 not in set(result.test["id"])
    assert 0 in set(result.val["id"])
    manual_rows = result.val.loc[result.val["id"] == 0]
    assert bool(manual_rows.iloc[0]["is_manual"]) is True


def test_invalid_ratios_raise():
    df = _synthetic_df()
    try:
        stratified_split(df, ratios=(0.5, 0.5, 0.5))
        assert False, "expected ValueError"
    except ValueError:
        pass
