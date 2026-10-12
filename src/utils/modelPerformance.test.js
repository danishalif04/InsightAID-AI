import { describe, expect, it } from 'vitest'
import { latestPerModelVariant, summarizeCrisisPerformance, summarizeForecastComparison } from './modelPerformance'

describe('latestPerModelVariant', () => {
  it('returns an empty array for no rows', () => {
    expect(latestPerModelVariant([])).toEqual([])
  })

  it('picks the most recently trained row per (model_type, eval_path)', () => {
    const rows = [
      { model_type: 'xlmr', eval_path: 'original_language', trained_at: '2026-01-01T00:00:00Z', accuracy: 0.7 },
      { model_type: 'xlmr', eval_path: 'original_language', trained_at: '2026-02-01T00:00:00Z', accuracy: 0.8 },
      { model_type: 'mbert', eval_path: 'original_language', trained_at: '2026-01-15T00:00:00Z', accuracy: 0.65 },
    ]
    const result = latestPerModelVariant(rows)
    expect(result).toHaveLength(2)
    expect(result.find((r) => r.model_type === 'xlmr').accuracy).toBe(0.8)
  })

  it('keeps distinct eval_path variants of the same model separate', () => {
    const rows = [
      { model_type: 'xlmr', eval_path: 'original_language', trained_at: '2026-01-01T00:00:00Z' },
      { model_type: 'xlmr', eval_path: 'translate_to_english', trained_at: '2026-01-01T00:00:00Z' },
    ]
    expect(latestPerModelVariant(rows)).toHaveLength(2)
  })
})

describe('summarizeForecastComparison', () => {
  it('returns null when no Prophet run exists yet', () => {
    expect(summarizeForecastComparison([])).toBeNull()
    expect(summarizeForecastComparison([{ model_type: 'xgboost', variant: 'sales_only', mae: 10 }])).toBeNull()
  })

  it('computes real percent improvement from baseline to enhanced', () => {
    const rows = [
      { model_type: 'prophet', variant: 'sales_only', mae: 100, rmse: 120, mape: 20 },
      { model_type: 'prophet', variant: 'sentiment_enhanced', mae: 80, rmse: 100, mape: 15 },
    ]
    const result = summarizeForecastComparison(rows)
    expect(result.maeImprovementPercent).toBe(20)
    expect(result.rmseImprovementPercent).toBeCloseTo(16.7, 1)
    expect(result.mapeImprovementPercent).toBe(25)
  })

  it('returns a result with only baseline when enhanced has not run yet, with null improvement', () => {
    const rows = [{ model_type: 'prophet', variant: 'sales_only', mae: 100, rmse: 120, mape: 20 }]
    const result = summarizeForecastComparison(rows)
    expect(result.baseline).toBeDefined()
    expect(result.enhanced).toBeUndefined()
    expect(result.maeImprovementPercent).toBeNull()
  })
})

describe('summarizeCrisisPerformance', () => {
  it('counts real alerts by level, never a fabricated "validated" figure', () => {
    const history = [{ risk_level: 'warning' }, { risk_level: 'critical' }, { risk_level: 'critical' }]
    const result = summarizeCrisisPerformance(history)
    expect(result.totalAlerts).toBe(3)
    expect(result.warningAlerts).toBe(1)
    expect(result.criticalAlerts).toBe(2)
    expect(result).not.toHaveProperty('validatedAlerts')
  })

  it('handles empty history', () => {
    expect(summarizeCrisisPerformance([])).toEqual({ totalAlerts: 0, warningAlerts: 0, criticalAlerts: 0 })
  })
})
