/**
 * Cache keys for the AI wording of recommendations (Phase 1 item 7).
 * Pure apart from Web Crypto hashing (available in browsers and Node 18+).
 *
 * A key is the SHA-256 of exactly what the explain-recommendations
 * function receives for one recommendation, plus a version tag. Same
 * inputs, same key; any change in the rule's evidence, title, priority or
 * the business context gives a new key, so stale wording is never reused.
 */

// Bump to invalidate every stored explanation (e.g. after changing the prompt).
export const EXPLANATION_CACHE_VERSION = 'explain-v1'

/** JSON with object keys sorted, so key order never changes the hash. */
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .filter((k) => value[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

/** The exact per-recommendation payload sent to the AI. */
export function explanationInput(rec) {
  const { id, category, priority, title, evidence } = rec
  return { id, category, priority, title, evidence }
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function explanationCacheKey(rec, businessContext) {
  return sha256Hex(stableStringify({ v: EXPLANATION_CACHE_VERSION, rec: explanationInput(rec), businessContext: businessContext ?? [] }))
}

/**
 * @param {object[]} recommendations
 * @param {string[]} keys same order as recommendations
 * @param {{cache_key:string, rationale:string, context:string}[]} rows stored explanations
 * @returns {{cached: Record<string,{rationale:string,context:string}>, missing: object[]}}
 */
export function splitCached(recommendations, keys, rows = []) {
  const byKey = new Map(rows.map((r) => [r.cache_key, r]))
  const cached = {}
  const missing = []
  recommendations.forEach((rec, i) => {
    const row = byKey.get(keys[i])
    if (row) cached[rec.id] = { rationale: row.rationale, context: row.context }
    else missing.push(rec)
  })
  return { cached, missing }
}
