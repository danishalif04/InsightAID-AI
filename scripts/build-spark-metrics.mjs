// Writes metrics/spark2026.json from the result files already in the repo.
// Usage: node scripts/build-spark-metrics.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOURCES, buildSparkMetrics } from '../src/utils/sparkMetrics.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8').replace(/^﻿/, '')

export function buildFromRepo() {
  return buildSparkMetrics({
    sentimentRuns: JSON.parse(read(SOURCES.sentiment)),
    forecastSummary: JSON.parse(read(SOURCES.forecasting)),
    crisisAblation: JSON.parse(read(SOURCES.crisis)),
    timingText: read(SOURCES.timing),
    koperasiBundle: JSON.parse(read(SOURCES.koperasi)),
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = resolve(root, 'metrics/spark2026.json')
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, `${JSON.stringify(buildFromRepo(), null, 2)}\n`)
  console.log(`Wrote ${out}`)
}
