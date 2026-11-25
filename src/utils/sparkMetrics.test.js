import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildFromRepo } from '../../scripts/build-spark-metrics.mjs'
import { buildO1, buildO2, buildO3, parseTimingSummary } from './sparkMetrics'

describe('metrics/spark2026.json', () => {
  it('matches what the source result files produce (re-run node scripts/build-spark-metrics.mjs if this fails)', () => {
    const committed = JSON.parse(readFileSync(new URL('../../metrics/spark2026.json', import.meta.url), 'utf8'))
    expect(committed).toEqual(JSON.parse(JSON.stringify(buildFromRepo())))
  })

  it('keeps the known headline values from the existing result files', () => {
    const m = buildFromRepo()
    expect(m.o1.mainModel.accuracy).toBe(0.8412)
    expect(m.o1.verdict).toBe('MET')
    expect(m.o2.mape.protocols.map((p) => p.best.mape)).toEqual([21.4087, 15.1712, 13.281])
    expect(m.o2.mape.verdict).toBe('PARTIAL')
    expect(m.o2.sentiment.verdict).toBe('NOT MET')
    expect(m.o3.responseTime.verdict).toBe('MET')
    expect(m.waste.synthetic).toBe(true)
  })
})

describe('verdicts are computed, never assumed', () => {
  const run = (accuracy, langs) => ({
    model_type: 'xlmr', eval_path: 'original_language', accuracy, f1: 0.8, test_samples: 1,
    per_language_metrics: Object.fromEntries(Object.entries(langs).map(([k, a]) => [k, { accuracy: a, f1: 0.8, n: 1 }])),
  })

  it('O1 fails when one language is under 75% even if overall passes', () => {
    expect(buildO1([run(0.9, { en: 0.74, ms: 0.95 })]).verdict).toBe('NOT MET')
    expect(buildO1([run(0.8, { en: 0.75 })]).verdict).toBe('MET')
  })

  it('O2 sentiment needs a significant improvement, not just a significant difference', () => {
    const summary = {
      run_id: 'x', dataset_version: 'y',
      protocols: [{ protocol: { name: 'p', horizon: 7 }, rows: [{ model_type: 'prophet', variant: 'sales_only', mape: 10 }] }],
      sentiment_comparisons: [{
        protocol: 'p', series: 's',
        prophet_sales_only: { mape: 10 }, prophet_sentiment_enhanced: { mape: 12 },
        diebold_mariano: { dm_statistic: -3, p_value: 0.001 },
      }],
    }
    const o2 = buildO2(summary)
    expect(o2.sentiment.significant).toBe(1)
    expect(o2.sentiment.verdict).toBe('NOT MET')
    expect(o2.mape.verdict).toBe('MET')
  })

  it('response time passes only when every page passes on every run', () => {
    const text = '| Page | n | Min | Median | Max | Verdict |\n|---|---|---|---|---|---|\n| A | 5 | 1 | 2 | 2999 | PASS |\n| B | 5 | 1 | 2 | 3000 | FAIL |\n'
    expect(parseTimingSummary(text)).toHaveLength(2)
    const crisis = { s: { tp: 1, fp: 0, tn: 1, fn: 0, precision: 1, recall: 1, f1: 1, false_alarm_rate: 0, lead_times: [1] } }
    expect(buildO3({ crisisAblation: crisis, timingText: text }).responseTime.verdict).toBe('PARTIAL')
  })
})
