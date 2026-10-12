"""
TF-IDF + Logistic Regression baseline (FYP2.md §47's "for comparison" -
not part of §46's spec, added per the user's own methodology so XLM-R's
gains over a classical baseline are quantified rather than assumed).

Trained/evaluated the same way for both evaluation paths (original-language
text and translate-to-English text) so all three models sit on the same
comparison grid. Deliberately lightweight: scikit-learn only, no GPU, so it
can run as a sanity check before committing to a full transformer training
run.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer


@dataclass
class TfidfBaseline:
    vectorizer: TfidfVectorizer
    classifier: LogisticRegression


def train_tfidf_baseline(
    texts: Sequence[str],
    labels: Sequence[str],
    max_features: int = 20000,
    ngram_range: tuple[int, int] = (1, 2),
    seed: int = 42,
) -> TfidfBaseline:
    vectorizer = TfidfVectorizer(max_features=max_features, ngram_range=ngram_range, sublinear_tf=True)
    features = vectorizer.fit_transform(texts)

    classifier = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=seed)
    classifier.fit(features, labels)

    return TfidfBaseline(vectorizer=vectorizer, classifier=classifier)


def predict(baseline: TfidfBaseline, texts: Sequence[str]) -> list[str]:
    features = baseline.vectorizer.transform(texts)
    return list(baseline.classifier.predict(features))


def main() -> None:
    import argparse

    import pandas as pd

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train_csv", required=True, help="CSV with a text column and a label column")
    parser.add_argument("--text_column", default="cleaned_text")
    parser.add_argument("--label_column", default="label")
    args = parser.parse_args()

    train_df = pd.read_csv(args.train_csv)
    baseline = train_tfidf_baseline(train_df[args.text_column], train_df[args.label_column])
    print(f"Trained TF-IDF+LogReg baseline on {len(train_df)} rows.")
    print("Use evaluate.py to score it against a held-out test set.")
    _ = baseline  # keep for interactive use (Colab cell re-runs main() body inline)


if __name__ == "__main__":
    main()
