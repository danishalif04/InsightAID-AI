/**
 * Task 2 — compute median and maximum per page from the raw timing runs.
 *
 * Parses results/spark_2026-11-25_item7/timing_raw.txt rather than
 * taking numbers by hand, so the table in RESULTS.md is produced by a
 * re-runnable script (CLAUDE.md working rule: every number shown must come
 * from a script that can be re-run).
 *
 *   node results/spark_2026-11-25_item7/summarise_timing.mjs
 */
import { readFileSync } from 'node:fs'

const PAGES = ['Dashboard', 'Sentiment Analysis', 'Forecasting', 'Crisis Detection', 'Recommendations']
const TARGET_MS = 3000

const raw = readFileSync(new URL('./timing_raw.txt', import.meta.url), 'utf8')

// Each measured run is a block starting at "Run N:-". The warm-up is not in
// the file at all — it was discarded before recording, as pre-registered.
const runs = raw.split(/^Run \d+:-$/m).slice(1)

const samples = Object.fromEntries(PAGES.map((p) => [p, []]))
for (const block of runs) {
  for (const page of PAGES) {
    // Built with a String, not a template literal: `\s` inside a template
    // literal collapses to a bare 's' and the regex silently matches nothing.
    const m = block.match(new RegExp('^[ \t]+' + page + '[ \t]+([0-9]+) ms$', 'm'))
    if (m) samples[page].push(Number(m[1]))
  }
}

/** Median of an odd/even length sample, sorted numerically. */
function median(xs) {
  const s = [...xs].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const rows = PAGES.map((page) => {
  const xs = samples[page]
  // Fail loudly rather than reporting a pass computed from nothing. An empty
  // sample would give max = -Infinity, which compares as < 3000 and would
  // print "MET" for a measurement that never happened.
  if (xs.length === 0) throw new Error(`No samples parsed for "${page}" — the raw file or the parser is wrong, refusing to report a result.`)
  return { page, n: xs.length, min: Math.min(...xs), median: median(xs), max: Math.max(...xs) }
})

if (runs.length === 0) throw new Error('No measured runs found in the raw file.')

console.log(`\nTask 2 — end-to-end page time, ${runs.length} measured runs (warm-up discarded)`)
console.log(`Target: < ${TARGET_MS} ms per analysis page\n`)
console.log('| Page | n | Min | Median | Max | Verdict |')
console.log('|---|---|---|---|---|---|')
for (const r of rows) {
  const verdict = r.max < TARGET_MS ? 'PASS' : r.median < TARGET_MS ? 'PASS on median, FAIL on max' : 'FAIL'
  console.log(`| ${r.page} | ${r.n} | ${r.min} | ${r.median} | ${r.max} | ${verdict} |`)
}

const worst = rows.reduce((a, b) => (b.median > a.median ? b : a))
const overallMax = Math.max(...rows.map((r) => r.max))
const passing = rows.filter((r) => r.max < TARGET_MS)
console.log(`\nSlowest page by median: ${worst.page} — ${worst.median} ms`)
console.log(`Worst single observation: ${overallMax} ms`)
console.log(`Pages meeting the target on every run: ${passing.length} of ${rows.length}` +
  (passing.length ? ` (${passing.map((r) => r.page).join(', ')})` : ''))
console.log(`\nOVERALL: target < ${TARGET_MS} ms is ${overallMax < TARGET_MS ? 'MET' : 'NOT MET'}.\n`)
