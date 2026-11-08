"""
Recovers structured results from the `INSERT INTO model_versions (...)
VALUES (...);` SQL that 03_train_sentiment_models.ipynb prints and that a
human then pastes into Supabase's SQL Editor. That SQL is this project's
only durable, already-saved record of a completed training run's real
per-language metrics and confusion matrices (the run itself happened on
Colab's GPU against data that lives on Google Drive, not in this repo) —
this module turns that printed text back into structured data so later
analysis (an O1 scorecard, a dissertation table) doesn't have to hand-copy
numbers out of a wall of SQL.

This does not invent anything: a statement that doesn't match the known
shape is skipped (reported as a warning), never guessed at.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional

# Exact column order build_model_version_row()/write_metrics_json() (see
# metrics.py) always uses when generating this SQL. If that order ever
# changes, this list must change with it - there is no column-name parsing
# here, only positional, by design (matches how the SQL itself has no
# column=value pairing beyond position).
COLUMNS = [
    "model_name",
    "model_version",
    "model_type",
    "eval_path",
    "trained_at",
    "dataset_version",
    "training_samples",
    "validation_samples",
    "test_samples",
    "accuracy",
    "precision",
    "recall",
    "f1",
    "per_language_metrics",
    "confusion_matrix",
    "notes",
]

_INSERT_RE = re.compile(
    r"INSERT INTO model_versions\s*\([^)]*\)\s*VALUES\s*\((.*?)\)\s*;",
    re.DOTALL,
)


@dataclass
class ParsedRow:
    model_name: str
    model_version: str
    model_type: str
    eval_path: str
    trained_at: str
    dataset_version: Optional[str]
    training_samples: int
    validation_samples: int
    test_samples: int
    accuracy: float
    precision: float
    recall: float
    f1: float
    per_language_metrics: dict
    confusion_matrix: list
    notes: Optional[str]


def _split_top_level_values(values_text: str) -> list[str]:
    """Splits a VALUES(...) tuple's inner text on commas that are NOT
    inside a quoted string - handles the SQL '' escaped-quote convention
    and ignores commas inside the jsonb string literals entirely (the
    jsonb payload itself is parsed separately, as JSON, once extracted)."""
    parts: list[str] = []
    current = []
    in_quotes = False
    i = 0
    n = len(values_text)
    while i < n:
        char = values_text[i]
        if in_quotes:
            if char == "'" and i + 1 < n and values_text[i + 1] == "'":
                current.append("''")
                i += 2
                continue
            if char == "'":
                in_quotes = False
                current.append(char)
                i += 1
                continue
            current.append(char)
            i += 1
            continue

        if char == "'":
            in_quotes = True
            current.append(char)
            i += 1
            continue
        if char == "," :
            parts.append("".join(current))
            current = []
            i += 1
            continue
        current.append(char)
        i += 1
    parts.append("".join(current))
    return [p.strip() for p in parts]


def _parse_scalar(token: str):
    token = token.strip()
    if token == "NULL":
        return None
    if token.startswith("'"):
        # Strip the surrounding quotes and a trailing ::jsonb cast if present.
        inner = token[1:]
        inner = inner[: inner.rfind("'")]
        return inner.replace("''", "'")
    if "." in token:
        return float(token)
    return int(token)


def parse_insert_statements(sql_text: str) -> list[ParsedRow]:
    rows: list[ParsedRow] = []
    for match in _INSERT_RE.finditer(sql_text):
        tokens = _split_top_level_values(match.group(1))
        if len(tokens) != len(COLUMNS):
            # Doesn't match the known shape - skip, never guess field alignment.
            continue
        values = {}
        for column, token in zip(COLUMNS, tokens):
            raw = _parse_scalar(token)
            if column in ("per_language_metrics", "confusion_matrix") and raw is not None:
                raw = json.loads(raw)
            values[column] = raw
        rows.append(ParsedRow(**values))
    return rows


def parse_file(sql_path: Path) -> list[ParsedRow]:
    return parse_insert_statements(sql_path.read_text(encoding="utf-8"))


def write_parsed_json(rows: list[ParsedRow], out_path: Path) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps([asdict(r) for r in rows], indent=2), encoding="utf-8")
    return out_path


if __name__ == "__main__":
    import sys

    src = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    if not src or not dst:
        print("usage: python -m src.parse_training_run <sql_file> <out_json>")
        raise SystemExit(1)
    parsed = parse_file(src)
    write_parsed_json(parsed, dst)
    print(f"Parsed {len(parsed)} row(s) -> {dst}")
