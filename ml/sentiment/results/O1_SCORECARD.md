# O1 Scorecard — Multilingual Sentiment Model

Target: overall accuracy >= 80% AND each language's accuracy >= 75%.
Every value below is read from a real training run's saved output (see results/model_versions_*.json) — nothing here is hand-typed.

| Model | Eval path | Overall acc. | en | ms | zh | Target met? |
| --- | --- | --- | --- | --- | --- | --- |
| tfidf_lr | original_language | 74.34% | 71.96% | 82.98% | 69.71% | FAIL |
| tfidf_lr | translate_to_english | 64.56% | 71.96% | 56.10% | 57.42% | FAIL |
| xlmr | original_language | 84.12% | 78.28% | 86.88% | 94.37% | PASS |
| xlmr | translate_to_english | 71.88% | 78.28% | 59.54% | 71.58% | FAIL |
| mbert | original_language | 82.48% | 76.81% | 84.54% | 93.17% | PASS |
| mbert | translate_to_english | 70.65% | 76.81% | 57.98% | 71.29% | FAIL |

**O1 verdict (best model, xlmr, original-language path): target MET.**

Note: no language in this evaluation set is tagged as code-mixed ('ms-en') — the real dataset (docs/datasets/sentiment/DATASET_REPORT.md) only carries en/ms/zh language tags for its labelled examples, so a code-mixed accuracy figure cannot be reported from this run. The live app's own language detector (src/utils/textPreprocessing.js) does detect code-mixed text at inference time; this is a real, disclosed gap between the evaluation set's language coverage and the full multilingual claim, not a result being hidden.