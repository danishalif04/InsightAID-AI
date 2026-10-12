"""
Leakage-safe, stratified train/val/test split (FYP2.md §47).

Design:
  - Exact-duplicate rows (same normalized cleaned_text) are dropped before
    splitting, keeping the first occurrence.
  - Splitting happens at the AUTHOR level (author_id_hash), not the row
    level: every row from one author lands in exactly one split. Splitting
    at the row level would let near-identical posts from the same author
    leak between train and test even after exact-dedup.
  - Stratification target is (language, majority_label) per author group,
    so the split preserves the overall language/label distribution as
    closely as group-level assignment allows.
  - An optional manually-labelled subset (gold labels, produced by a human
    annotator rather than the rating heuristic) is removed from the
    auto-split pool by id first, then assigned to validation - this is the
    "support for a manually validated subset" requirement from FYP2.md §47.
    It never gets used to inflate train, so train never gets credit for
    labels a human actually checked.

Expected input columns (see ../data/schema.md): id, author_id_hash,
cleaned_text, language, label. `label` is whatever the caller derived
(weak, via weak_labels.classify_by_rating, or gold, from manual annotation).
"""

from __future__ import annotations

import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Optional

import pandas as pd

DEFAULT_RATIOS = (0.7, 0.15, 0.15)  # train, val, test


@dataclass
class SplitResult:
    train: pd.DataFrame
    val: pd.DataFrame
    test: pd.DataFrame
    dropped_duplicates: int
    leakage_report: dict


def _dedup(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    before = len(df)
    normalized = df["cleaned_text"].fillna("").str.strip().str.lower()
    deduped = df.loc[~normalized.duplicated(keep="first")].copy()
    return deduped, before - len(deduped)


def _author_key(row) -> str:
    author = row.get("author_id_hash")
    if author is None or (isinstance(author, float) and pd.isna(author)) or author == "":
        return f"__row_{row['id']}"  # no author info -> treat row as its own group
    return str(author)


def _group_majority_stratum(group: pd.DataFrame) -> tuple[str, str]:
    language = group["language"].mode().iat[0] if not group["language"].mode().empty else "unknown"
    label = group["label"].mode().iat[0] if not group["label"].mode().empty else "unknown"
    return (language, label)


def stratified_split(
    df: pd.DataFrame,
    manual_df: Optional[pd.DataFrame] = None,
    ratios: tuple[float, float, float] = DEFAULT_RATIOS,
    seed: int = 42,
) -> SplitResult:
    if abs(sum(ratios) - 1.0) > 1e-6:
        raise ValueError(f"ratios must sum to 1.0, got {ratios}")

    df = df.copy()
    manual_ids = set(manual_df["id"]) if manual_df is not None and len(manual_df) else set()
    pool = df.loc[~df["id"].isin(manual_ids)].copy()

    pool, dropped_duplicates = _dedup(pool)

    pool["__author_key"] = pool.apply(_author_key, axis=1)
    groups = list(pool.groupby("__author_key"))

    strata: dict[tuple[str, str], list] = defaultdict(list)
    for author_key, group in groups:
        strata[_group_majority_stratum(group)].append(author_key)

    rng = random.Random(seed)
    train_keys: set[str] = set()
    val_keys: set[str] = set()
    test_keys: set[str] = set()

    for _stratum, author_keys in strata.items():
        rng.shuffle(author_keys)
        n = len(author_keys)
        n_train = round(n * ratios[0])
        n_val = round(n * ratios[1])
        # test gets the remainder so rounding never drops a group.
        train_keys.update(author_keys[:n_train])
        val_keys.update(author_keys[n_train : n_train + n_val])
        test_keys.update(author_keys[n_train + n_val :])

    train_df = pool.loc[pool["__author_key"].isin(train_keys)].drop(columns="__author_key")
    val_df = pool.loc[pool["__author_key"].isin(val_keys)].drop(columns="__author_key")
    test_df = pool.loc[pool["__author_key"].isin(test_keys)].drop(columns="__author_key")

    if manual_df is not None and len(manual_df):
        manual_df = manual_df.copy()
        manual_df["is_manual"] = True
        val_df = val_df.copy()
        val_df["is_manual"] = val_df.get("is_manual", False)
        val_df = pd.concat([val_df, manual_df], ignore_index=True)

    leakage_report = check_leakage(train_df, val_df, test_df)

    return SplitResult(
        train=train_df,
        val=val_df,
        test=test_df,
        dropped_duplicates=dropped_duplicates,
        leakage_report=leakage_report,
    )


def check_leakage(train_df: pd.DataFrame, val_df: pd.DataFrame, test_df: pd.DataFrame) -> dict:
    """Asserts no id and no author appears in more than one split. Returns a
    report instead of raising, so callers can log/persist it either way."""
    id_counts: Counter = Counter()
    author_counts: dict[str, set[str]] = defaultdict(set)

    for split_name, split_df in (("train", train_df), ("val", val_df), ("test", test_df)):
        for _, row in split_df.iterrows():
            id_counts[row["id"]] += 1
            author = row.get("author_id_hash")
            if author is not None and not (isinstance(author, float) and pd.isna(author)) and author != "":
                author_counts[str(author)].add(split_name)

    duplicate_ids = [row_id for row_id, count in id_counts.items() if count > 1]
    leaked_authors = [author for author, splits in author_counts.items() if len(splits) > 1]

    return {
        "clean": not duplicate_ids and not leaked_authors,
        "duplicate_ids": duplicate_ids,
        "leaked_authors": leaked_authors,
        "train_size": len(train_df),
        "val_size": len(val_df),
        "test_size": len(test_df),
    }
