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

# Maps our language tags (from clean.detect_language) to an opus-mt checkpoint
# that translates that language to English. 'ms-en' (code-mixed) and 'en'
# text is passed through untouched - there's nothing useful to translate.
#
# 'ms' intentionally does NOT point to "Helsinki-NLP/opus-mt-ms-en" - that
# repo does not exist on the Hugging Face Hub (confirmed via a direct HTTP
# check; Helsinki-NLP never published a dedicated bilateral Malay-English
# OPUS-MT pair), and using it crashed every real training run's evaluation
# step with a 404/RepositoryNotFoundError. "Helsinki-NLP/opus-mt-mul-en"
# (confirmed to exist) is multilingual-source, 120+ languages into English,
# which per HuggingFace's own Marian docs needs no language-prefix token
# since English is the only target language. Malay is among its covered
# source languages, but - unlike the dedicated zh-en pair - per-language
# translation quality for Malay specifically has not been independently
# verified here; state this plainly if citing translate_to_english results
# for Malay in the thesis, rather than treating it as equivalent quality
# to a dedicated bilingual model.
OPUS_MT_CHECKPOINTS = {
    "ms": "Helsinki-NLP/opus-mt-mul-en",
    "zh": "Helsinki-NLP/opus-mt-zh-en",
}

PASSTHROUGH_LANGUAGES = {"en", "ms-en", "unknown"}


@lru_cache(maxsize=None)
def _load_model_and_tokenizer(checkpoint: str):
    # Deliberately NOT using transformers.pipeline("translation", ...) -
    # transformers v5 removed the translation/summarization/
    # text2text-generation pipeline *tasks* outright (confirmed: a fresh
    # v5 install raises KeyError: "Unknown task translation", not present
    # in get_supported_tasks() at all). AutoModelForSeq2SeqLM + generate()
    # is the stable, lower-level API pipeline() called internally anyway -
    # removing the high-level task-string shortcut didn't remove this.
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer  # deferred: heavy, optional dependency

    tokenizer = AutoTokenizer.from_pretrained(checkpoint)
    model = AutoModelForSeq2SeqLM.from_pretrained(checkpoint)
    model.eval()  # inference only - without this, dropout stays active and generation is non-deterministic
    return model, tokenizer


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

    import torch  # deferred, same reason as the transformers import above

    model, tokenizer = _load_model_and_tokenizer(checkpoint)
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
    with torch.no_grad():
        output_ids = model.generate(**inputs, max_length=512)
    return tokenizer.decode(output_ids[0], skip_special_tokens=True)


def translate_batch(texts: list[str], languages: list[str]) -> list[str]:
    if len(texts) != len(languages):
        raise ValueError("texts and languages must be the same length")
    return [translate_to_english(t, lang) for t, lang in zip(texts, languages)]
