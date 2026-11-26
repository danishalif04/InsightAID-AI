/**
 * Builds metrics/spark2026.json from result files that already exist in the
 * repo. Pure: the caller reads the files and passes their parsed contents.
 * Nothing here is typed in by hand: every value is read from an input or
 * computed from one, and every verdict is decided by comparing the computed
 * value to the FIXED target (CLAUDE.md), never set directly.
 *
 * Re-run: node scripts/build-spark-metrics.mjs
 * Guard:  src/utils/sparkMetrics.test.js fails if the committed JSON drifts
 *         from what the source files produce.
 */
import { buildItemSeries, fromKoperasiBundle, PLANNER_DEFAULTS, simulateWaste, wasteSaving } from './prepPlanner.js'

export const TARGETS = Object.freeze({
  o1OverallAccuracy: 0.8,
  o1PerLanguageAccuracy: 0.75,
  o2Mape: 15,
  o2DmAlpha: 0.05,
  o3ResponseMs: 3000,
  o3Uat: 4.0,
})

export const SOURCES = Object.freeze({
  sentiment: 'ml/sentiment/results/model_versions_v20261020-171546.json',
  forecasting: 'ml/forecasting/results/protocol_summary_a8b3bb637d28.json',
  crisis: 'ml/crisis/results/ablation_raw.json',
  timing: 'results/spark_2026-11-25_item7/summary.txt',
  koperasi: 'src/data/koperasiSiswaMaju.json',
})

const round = (v, d = 4) => (Number.isFinite(v) ? Number(v.toFixed(d)) : null)

function verdict(met, partial = false) {
  if (met) return 'MET'
  return partial ? 'PARTIAL' : 'NOT MET'
}

export function buildO1(sentimentRuns) {
  const models = sentimentRuns.map((r) => {
    const perLanguage = Object.fromEntries(
      Object.entries(r.per_language_metrics ?? {}).map(([lang, m]) => [lang, { accuracy: m.accuracy, f1: m.f1, n: m.n }]),
    )
    const langOk = Object.values(perLanguage).every((m) => m.accuracy >= TARGETS.o1PerLanguageAccuracy)
    return {
      model: r.model_type,
      evalPath: r.eval_path,
      accuracy: r.accuracy,
      f1: r.f1,
      testSamples: r.test_samples,
      perLanguage,
      targetMet: r.accuracy >= TARGETS.o1OverallAccuracy && langOk,
    }
  })
  const main = models.find((m) => m.model === 'xlmr' && m.evalPath === 'original_language') ?? null
  return {
    target: `Accuracy >= ${TARGETS.o1OverallAccuracy * 100}% overall and >= ${TARGETS.o1PerLanguageAccuracy * 100}% per language`,
    mainModel: main,
    verdict: verdict(Boolean(main?.targetMet)),
    models,
    notEvaluated: [
      'Code-mixed (BM-English) accuracy: the evaluation set has no code-mixed labels.',
      "Cohen's kappa on 200 double-labelled comments: not done.",
    ],
    liveAppNote: 'The live app scores sentiment with a rating heuristic. XLM-RoBERTa was evaluated offline; its trained weights were lost (see results/post_submission_2026-11/RESULTS.md).',
    f1Note: 'F1 as recorded by the training run.',
  }
}

export function buildO2(summary) {
  const protocols = summary.protocols.map((p) => {
    const rows = p.rows.map((r) => ({ model: r.model_type, variant: r.variant, mape: r.mape, mase: r.mase ?? null }))
    const best = rows.reduce((a, b) => (b.mape < a.mape ? b : a))
    const prophet = rows.find((r) => r.model === 'prophet' && r.variant === 'sales_only') ?? null
    return { name: p.protocol.name, horizon: p.protocol.horizon, note: p.protocol.note, rows, best, prophet, met: best.mape < TARGETS.o2Mape }
  })
  const metCount = protocols.filter((p) => p.met).length

  const comparisons = summary.sentiment_comparisons.map((c) => {
    const so = c.prophet_sales_only
    const se = c.prophet_sentiment_enhanced
    const dm = c.diebold_mariano
    return {
      protocol: c.protocol,
      series: c.series,
      mapeSalesOnly: so.mape,
      mapeSentiment: se.mape,
      sentimentHigherMape: se.mape > so.mape,
      dm: dm.dm_statistic,
      p: dm.p_value,
      significant: dm.p_value < TARGETS.o2DmAlpha,
    }
  })
  const pValues = comparisons.map((c) => c.p)
  const significantImprovements = comparisons.filter((c) => c.significant && c.mapeSentiment < c.mapeSalesOnly).length

  return {
    runId: summary.run_id,
    datasetVersion: summary.dataset_version,
    mape: {
      target: `MAPE < ${TARGETS.o2Mape}% (rolling origin)`,
      metCount,
      protocolCount: protocols.length,
      verdict: verdict(metCount === protocols.length, metCount > 0),
      protocols,
    },
    sentiment: {
      target: `Sentiment-enhanced Prophet beats sales-only, Diebold-Mariano p < ${TARGETS.o2DmAlpha}`,
      comparisons: comparisons.length,
      sentimentHigherMape: comparisons.filter((c) => c.sentimentHigherMape).length,
      significant: comparisons.filter((c) => c.significant).length,
      significantImprovements,
      pMin: Math.min(...pValues),
      pMax: Math.max(...pValues),
      verdict: verdict(significantImprovements > 0),
      detail: comparisons,
      caveat: 'The sentiment input was a star-rating proxy, not the XLM-RoBERTa model. Few folds give the test little power: "not demonstrated", not "disproved".',
    },
    dataNote: 'Olist Brazilian e-commerce data (CC BY-NC-SA 4.0). No Malaysian sales data was used for these results.',
  }
}

/** Parses the Markdown table written by results/.../summarise_timing.mjs. */
export function parseTimingSummary(text) {
  const pages = []
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/)
    if (m) pages.push({ page: m[1], runs: Number(m[2]), minMs: Number(m[3]), medianMs: Number(m[4]), maxMs: Number(m[5]) })
  }
  return pages
}

export function buildO3({ crisisAblation, timingText }) {
  const pages = parseTimingSummary(timingText).map((p) => ({ ...p, met: p.maxMs < TARGETS.o3ResponseMs }))
  const passing = pages.filter((p) => p.met).length
  const crisis = Object.fromEntries(
    Object.entries(crisisAblation).map(([scheme, r]) => [scheme, {
      precision: r.precision,
      recall: r.recall,
      f1: round(r.f1),
      falseAlarmRate: r.false_alarm_rate,
      meanLeadTimeDays: round(r.lead_times.reduce((s, v) => s + v, 0) / r.lead_times.length, 2),
      scenarios: r.tp + r.fn,
      controls: r.fp + r.tn,
    }]),
  )
  return {
    responseTime: {
      target: `Every analysis page < ${TARGETS.o3ResponseMs} ms on every run`,
      measured: '25 Nov 2026, production build, 5 runs after a discarded warm-up, with stored AI wording (migration 0019)',
      caveat: 'The discarded warm-up run is the one that stored the AI wording. A first visit after the data changes still waits for the AI, so that visit can take longer than 3 s.',
      passing,
      pageCount: pages.length,
      verdict: verdict(pages.length > 0 && passing === pages.length, passing > 0),
      pages,
    },
    crisis: {
      note: 'Synthetic injected scenarios and ordinary volume spikes (seeded). Negative lead time means the alert came after the sales drop began.',
      schemes: crisis,
    },
    uat: {
      target: `Satisfaction >= ${TARGETS.o3Uat} / 5`,
      value: null,
      recomputed: false,
      source: 'Reported in the submitted dissertation (Table 4.9). The raw responses are not in this repository, so no value is shown here.',
    },
  }
}

export function buildWaste(bundle) {
  const data = fromKoperasiBundle(bundle)
  const result = simulateWaste({ series: buildItemSeries(data.salesRows), items: data.items, reviews: data.reviews })
  const saving = wasteSaving(result.totals)
  const pick = (t) => ({ wasteUnits: t.wasteUnits, wasteRM: round(t.wasteRM, 2), stockoutUnits: t.stockoutUnits })
  return {
    label: 'SIMULATION ON SYNTHETIC DATA',
    dataset: bundle.name,
    synthetic: bundle.synthetic === true,
    settings: { bufferPct: PLANNER_DEFAULTS.bufferPct, flagReductionPct: PLANNER_DEFAULTS.flagReductionPct, replayDays: PLANNER_DEFAULTS.replayDays },
    from: result.from,
    to: result.to,
    lastWeekHabit: pick(result.totals.lastWeek),
    forecastHabit: pick(result.totals.forecast),
    savingRM: round(saving.rm, 2),
    savingPct: round(saving.pct, 1),
    tradeOff: result.totals.forecast.stockoutUnits > result.totals.lastWeek.stockoutUnits
      ? 'The forecast habit is short of stock more often than the last week habit.'
      : 'The forecast habit is not short of stock more often than the last week habit.',
  }
}

export function buildSparkMetrics({ sentimentRuns, forecastSummary, crisisAblation, timingText, koperasiBundle }) {
  return {
    schema: 'insightaid.spark2026.v1',
    howToRebuild: 'node scripts/build-spark-metrics.mjs',
    sources: SOURCES,
    o1: buildO1(sentimentRuns),
    o2: buildO2(forecastSummary),
    o3: buildO3({ crisisAblation, timingText }),
    waste: buildWaste(koperasiBundle),
  }
}
