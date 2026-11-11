/**
 * Verifies an LLM answer against the tool results it was given.
 *
 * Every RM amount and percentage in the answer must appear in the tool
 * output (within a small tolerance for rounding). Anything that does not
 * is flagged — the UI shows an "Unverified figure" badge rather than
 * quietly presenting a number the engine never produced.
 *
 * Also blocks the specific claims this project must never make.
 */

const TOLERANCE = 0.01

const BANNED_PATTERNS = [
  { pattern: /\bguarantee(d|s)?\b/i, reason: 'guarantees an outcome' },
  { pattern: /\bfinancially (healthy|unhealthy)\b/i, reason: 'labels the business healthy/unhealthy' },
  { pattern: /\byour business is (healthy|unhealthy|failing|safe)\b/i, reason: 'judges the business' },
  { pattern: /\b(will|definitely) (succeed|fail)\b/i, reason: 'predicts success or failure' },
  { pattern: /\bcaused by (national )?inflation\b/i, reason: 'attributes a cost change to national inflation' },
]

/** Pulls every number out of a nested tool-result object. */
export function collectNumbers(value, found = new Set()) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    found.add(Math.round(Math.abs(value) * 100) / 100)
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectNumbers(item, found))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectNumbers(item, found))
  }
  return found
}

/** Extracts RM amounts and percentages the answer asserts. */
export function extractClaims(text) {
  const claims = []
  const money = /RM\s?([\d,]+(?:\.\d+)?)/gi
  const percent = /([\d.]+)\s?%/g

  let match
  while ((match = money.exec(text)) !== null) {
    const value = Number(match[1].replace(/,/g, ''))
    if (Number.isFinite(value)) claims.push({ raw: match[0], value: Math.round(value * 100) / 100, kind: 'money' })
  }
  while ((match = percent.exec(text)) !== null) {
    const value = Number(match[1])
    if (Number.isFinite(value)) claims.push({ raw: match[0], value: Math.round(value * 100) / 100, kind: 'percent' })
  }
  return claims
}

/**
 * @param {string} answer
 * @param {object[]} toolResults
 * @returns {{verified: boolean, unverified: object[], blocked: string[], claims: object[]}}
 */
export function guardAnswer(answer, toolResults) {
  const known = new Set()
  toolResults.forEach((result) => collectNumbers(result, known))
  const knownValues = [...known]

  const claims = extractClaims(answer ?? '')
  const unverified = claims.filter(
    (claim) => !knownValues.some((value) => Math.abs(value - claim.value) <= TOLERANCE)
  )

  const blocked = BANNED_PATTERNS.filter(({ pattern }) => pattern.test(answer ?? '')).map(({ reason }) => reason)

  return { verified: unverified.length === 0 && blocked.length === 0, unverified, blocked, claims }
}
