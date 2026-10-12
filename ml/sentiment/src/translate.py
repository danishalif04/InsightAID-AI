"""
Translate-to-English-first evaluation path.

FYP2.md never specifies a translation step (§46 only names XLM-R classifying
text directly); this module implements the user's own second evaluation
path so it can be compared against original-language classification.

Uses local, offline Helsinki-NLP opus-mt models via transformers - no paid
translation API, no key to manage, fully reproducible in Colab. Imports are
deferred into the functions below so that importing this module (or anything
that imports it) doesn't require torch/transformers to be installed - only
actually calling translate_to_english() does.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

# Maps our language tags (from clean.detect_language) to an opus-mt checkpoint
# that translates that language to English. 'ms-en' (code-mixed) and 'en'
# text is passed through untouched - there's nothing useful to translate.
OPUS_MT_CHECKPOINTS = {
    "ms": "Helsinki-NLP/opus-mt-ms-en",
    "zh": "Helsinki-NLP/opus-mt-zh-en",
}

PASSTHROUGH_LANGUAGES = {"en", "ms-en", "unknown"}


@lru_cache(maxsize=None)
def _load_pipeline(checkpoint: str):
    from transformers import pipeline  # deferred: heavy, optional dependency

    return pipeline("translation", model=checkpoint)


def translate_to_english(text: str, language: str) -> str:
    """Returns `text` unchanged for languages with no configured checkpoint
    (English, code-mixed Malay-English, or undetected language) - there is
    no single-direction translation that makes sense for those without
    discarding information, so the "translate-to-English-first" path
    degrades to "use the text as-is" for them, which is a documented
    limitation, not a silent gap."""
    if language in PASSTHROUGH_LANGUAGES:
        return text

    checkpoint = OPUS_MT_CHECKPOINTS.get(language)
    if checkpoint is None:
        return text

    translator = _load_pipeline(checkpoint)
    result = translator(text, max_length=512)
    return result[0]["translation_text"]


def translate_batch(texts: list[str], languages: list[str]) -> list[str]:
    if len(texts) != len(languages):
        raise ValueError("texts and languages must be the same length")
    return [translate_to_english(t, lang) for t, lang in zip(texts, languages)]
