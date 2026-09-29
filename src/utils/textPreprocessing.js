/**
 * Text preprocessing pipeline (FYP2.md §44), in the exact order specified:
 *   1. preserve raw text
 *   2. detect language — BEFORE cleaning
 *   3. normalize / remove URLs
 *   4. (duplicates are a cross-row check — handled in datasetValidation.js, not here)
 *   5. handle platform-specific symbols
 *   6. preserve meaningful repeated letters (cap excessive runs, don't erase emphasis)
 *   7. handle hashtags
 *   8. handle mentions
 *   9. support code-mixed text (Malay-English) where practical
 *
 * Language detection is a small, documented function-word/script heuristic —
 * NOT a trained language-ID model. Never claimed as validated.
 */

const URL_REGEX = /https?:\/\/\S+|www\.\S+/gi
const RT_PREFIX_REGEX = /^RT\s+@\w+:\s*/i
const HASHTAG_REGEX = /#(\w+)/g
const MENTION_REGEX = /@(\w+)/g
const CJK_REGEX = new RegExp(`[${String.fromCharCode(0x4e00)}-${String.fromCharCode(0x9fff)}]`, 'g')
const REPEATED_CHAR_REGEX = /([a-zA-Z])\1{3,}/g // 4+ of the same letter in a row

// Built from char codes rather than \u escapes in source — escape sequences for
// zero-width characters have proven unreliable to persist through file writes here.
const ZERO_WIDTH_CHARS = [0x200b, 0x200c, 0x200d, 0xfeff].map((code) => String.fromCharCode(code))
const ZERO_WIDTH_REGEX = new RegExp(`[${ZERO_WIDTH_CHARS.join('')}]`, 'g')

const MALAY_FUNCTION_WORDS = new Set([
  'yang', 'saya', 'tak', 'tidak', 'dengan', 'ini', 'itu', 'tu', 'untuk', 'dan', 'di', 'ke', 'dari',
  'ada', 'akan', 'boleh', 'nak', 'kat', 'je', 'lah', 'sangat', 'memang', 'dah', 'ni', 'kami', 'kita',
  'anda', 'dia', 'mereka', 'pun', 'juga', 'sebab', 'harap', 'mungkin', 'secepat', 'mula', 'sudah',
])

const ENGLISH_FUNCTION_WORDS = new Set([
  'the', 'and', 'is', 'are', 'was', 'were', 'this', 'that', 'with', 'for', 'to', 'of', 'in', 'on',
  'at', 'a', 'an', 'my', 'but', 'not', 'be', 'as', 'it', 'have', 'has',
])

/** Step 2 — language detection, run on the RAW text before any cleaning. */
export function detectLanguage(rawText) {
  if (!rawText || !rawText.trim()) return 'unknown'

  const cjkMatches = rawText.match(CJK_REGEX) ?? []
  const nonSpaceLength = rawText.replace(/\s/g, '').length
  if (nonSpaceLength > 0 && cjkMatches.length / nonSpaceLength > 0.3) return 'zh'

  const words = rawText.toLowerCase().match(/[a-z]+/g) ?? []
  let malayHits = 0
  let englishHits = 0
  for (const word of words) {
    if (MALAY_FUNCTION_WORDS.has(word)) malayHits++
    if (ENGLISH_FUNCTION_WORDS.has(word)) englishHits++
  }

  if (malayHits === 0 && englishHits === 0) return 'unknown'
  if (malayHits > 0 && englishHits > 0) {
    const ratio = Math.min(malayHits, englishHits) / Math.max(malayHits, englishHits)
    if (ratio >= 0.34) return 'ms-en' // both present in comparable proportion -> code-mixed
  }
  return malayHits >= englishHits ? 'ms' : 'en'
}

/** Step 6 — caps excessive letter repetition (4+) to 3 repeats, preserving emphasis without keyboard-mash runs. */
function normalizeRepeatedChars(text) {
  return text.replace(REPEATED_CHAR_REGEX, (_match, letter) => letter.repeat(3))
}

export function extractHashtags(text) {
  return [...text.matchAll(HASHTAG_REGEX)].map((match) => match[1])
}

export function extractMentions(text) {
  return [...text.matchAll(MENTION_REGEX)].map((match) => match[1])
}

/**
 * Runs the full pipeline on one piece of raw text.
 * @returns {{ rawText, cleanedText, language, hashtags: string[], mentions: string[], hasUrl, hasRepeatedChars }}
 */
export function preprocessText(rawText) {
  const text = rawText ?? ''

  // Step 1 — preserve raw text (returned untouched as `rawText`).
  // Step 2 — detect language before any cleaning.
  const language = detectLanguage(text)

  // Step 3 — normalize / remove URLs.
  let cleaned = text.replace(URL_REGEX, '').trim()
  const hasUrl = URL_REGEX.test(text)
  URL_REGEX.lastIndex = 0

  // Step 5 — platform-specific symbols (retweet prefixes, stray whitespace/control chars).
  cleaned = cleaned.replace(RT_PREFIX_REGEX, '')
  cleaned = cleaned.replace(ZERO_WIDTH_REGEX, '') // zero-width characters
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  // Step 6 — preserve meaningful repeated letters, but cap runaway repetition.
  const hasRepeatedChars = REPEATED_CHAR_REGEX.test(cleaned)
  REPEATED_CHAR_REGEX.lastIndex = 0
  cleaned = normalizeRepeatedChars(cleaned)

  // Steps 7-8 — hashtags/mentions are extracted (for features) but left in the
  // cleaned text itself, since stripping them would discard real information.
  const hashtags = extractHashtags(text)
  const mentions = extractMentions(text)

  // Step 9 — code-mixed Malay-English is already reflected in `language` ('ms-en')
  // rather than forced into a single tag.

  return {
    rawText: text,
    cleanedText: cleaned,
    language,
    hashtags,
    mentions,
    hasUrl,
    hasRepeatedChars,
  }
}
