/**
 * Local Shop deterministic engine — shared primitives.
 *
 * Every engine function is pure, dependency-free, and returns a plain
 * object. Missing or unusable inputs return { ok: false, missing: [...] }
 * or { ok: false, reason }, never NaN/Infinity — the UI must be able to
 * say "we can't compute this yet, here's what's needed" rather than
 * rendering a nonsense number.
 */

export const isNum = (value) => typeof value === 'number' && Number.isFinite(value)

/** Rounds to `places` decimals without float drift surprises. */
export const round = (value, places = 2) => {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/** Collects the names of any required inputs that aren't usable numbers. */
export function missingOf(inputs) {
  return Object.entries(inputs)
    .filter(([, value]) => !isNum(value))
    .map(([name]) => name)
}

export const ok = (payload) => ({ ok: true, ...payload })
export const fail = (missing, reason) => ({ ok: false, missing, ...(reason ? { reason } : {}) })

/** Provenance labels every engine result can be tagged with in the UI. */
export const PROVENANCE = {
  calculated: 'Calculated',
  userInput: 'Your input',
  assumption: 'Assumption',
  aiExplained: 'AI-explained',
  illustrative: 'Illustrative',
}
