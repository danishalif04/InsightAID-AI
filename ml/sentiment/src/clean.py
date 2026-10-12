"""
Text preprocessing pipeline (FYP2.md §44), Python port of
src/utils/textPreprocessing.js, in the same documented order:

  1. preserve raw text
  2. detect language - BEFORE cleaning
  3. normalize / remove URLs
  4. (duplicates are a cross-row check - handled in split.py's leakage check,
     not here, same as the JS pipeline's datasetValidation.js)
  5. handle platform-specific symbols
  6. preserve meaningful repeated letters (cap excessive runs, don't erase emphasis)
  7. handle hashtags
  8. handle mentions
  9. support code-mixed text (Malay-English) where practical

Language detection is the same small, documented function-word/script
heuristic as the JS side - NOT a trained language-ID model, never claimed
as validated. Kept in lockstep with textPreprocessing.js so text that
already flowed through the JS pipeline (processed_data.language) matches
what this training-time cleaner would have produced.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List

URL_REGEX = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
RT_PREFIX_REGEX = re.compile(r"^RT\s+@\w+:\s*", re.IGNORECASE)
HASHTAG_REGEX = re.compile(r"#(\w+)")
MENTION_REGEX = re.compile(r"@(\w+)")
CJK_REGEX = re.compile(f"[{chr(0x4E00)}-{chr(0x9FFF)}]")
REPEATED_CHAR_REGEX = re.compile(r"([a-zA-Z])\1{3,}")  # 4+ of the same letter in a row

# Built from chr() codepoints rather than \u escapes in source, matching the
# JS file's own note: escape sequences for zero-width characters have proven
# unreliable to persist through file writes in this project's tooling.
ZERO_WIDTH_CHARS = "".join(chr(code) for code in (0x200B, 0x200C, 0x200D, 0xFEFF))
ZERO_WIDTH_REGEX = re.compile(f"[{ZERO_WIDTH_CHARS}]")

MALAY_FUNCTION_WORDS = {
    "yang", "saya", "tak", "tidak", "dengan", "ini", "itu", "tu", "untuk", "dan", "di", "ke", "dari",
    "ada", "akan", "boleh", "nak", "kat", "je", "lah", "sangat", "memang", "dah", "ni", "kami", "kita",
    "anda", "dia", "mereka", "pun", "juga", "sebab", "harap", "mungkin", "secepat", "mula", "sudah",
}

ENGLISH_FUNCTION_WORDS = {
    "the", "and", "is", "are", "was", "were", "this", "that", "with", "for", "to", "of", "in", "on",
    "at", "a", "an", "my", "but", "not", "be", "as", "it", "have", "has",
}

WORD_REGEX = re.compile(r"[a-z]+")


def detect_language(raw_text: str) -> str:
    """Step 2 - language detection, run on the RAW text before any cleaning."""
    if not raw_text or not raw_text.strip():
        return "unknown"

    cjk_matches = CJK_REGEX.findall(raw_text)
    non_space_length = len(re.sub(r"\s", "", raw_text))
    if non_space_length > 0 and len(cjk_matches) / non_space_length > 0.3:
        return "zh"

    words = WORD_REGEX.findall(raw_text.lower())
    malay_hits = sum(1 for w in words if w in MALAY_FUNCTION_WORDS)
    english_hits = sum(1 for w in words if w in ENGLISH_FUNCTION_WORDS)

    if malay_hits == 0 and english_hits == 0:
        return "unknown"
    if malay_hits > 0 and english_hits > 0:
        ratio = min(malay_hits, english_hits) / max(malay_hits, english_hits)
        if ratio >= 0.34:
            return "ms-en"  # both present in comparable proportion -> code-mixed
    return "ms" if malay_hits >= english_hits else "en"


def _normalize_repeated_chars(text: str) -> str:
    """Step 6 - caps excessive letter repetition (4+) to 3 repeats."""
    return REPEATED_CHAR_REGEX.sub(lambda m: m.group(1) * 3, text)


def extract_hashtags(text: str) -> List[str]:
    return HASHTAG_REGEX.findall(text)


def extract_mentions(text: str) -> List[str]:
    return MENTION_REGEX.findall(text)


@dataclass
class PreprocessedText:
    raw_text: str
    cleaned_text: str
    language: str
    hashtags: List[str] = field(default_factory=list)
    mentions: List[str] = field(default_factory=list)
    has_url: bool = False
    has_repeated_chars: bool = False


def preprocess_text(raw_text: str | None) -> PreprocessedText:
    """Runs the full pipeline on one piece of raw text."""
    text = raw_text or ""

    # Step 1 - preserve raw text (returned untouched as `raw_text`).
    # Step 2 - detect language before any cleaning.
    language = detect_language(text)

    # Step 3 - normalize / remove URLs.
    has_url = bool(URL_REGEX.search(text))
    cleaned = URL_REGEX.sub("", text).strip()

    # Step 5 - platform-specific symbols (retweet prefixes, zero-width chars).
    cleaned = RT_PREFIX_REGEX.sub("", cleaned)
    cleaned = ZERO_WIDTH_REGEX.sub("", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # Step 6 - preserve meaningful repeated letters, but cap runaway repetition.
    has_repeated_chars = bool(REPEATED_CHAR_REGEX.search(cleaned))
    cleaned = _normalize_repeated_chars(cleaned)

    # Steps 7-8 - hashtags/mentions are extracted (for features) but left in
    # the cleaned text itself, since stripping them would discard information.
    hashtags = extract_hashtags(text)
    mentions = extract_mentions(text)

    # Step 9 - code-mixed Malay-English is already reflected in `language`
    # ('ms-en') rather than forced into a single tag.

    return PreprocessedText(
        raw_text=text,
        cleaned_text=cleaned,
        language=language,
        hashtags=hashtags,
        mentions=mentions,
        has_url=has_url,
        has_repeated_chars=has_repeated_chars,
    )
