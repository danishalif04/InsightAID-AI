import { describe, expect, it } from 'vitest'
import { composeExecutiveSummary } from './executiveSummary'

describe('composeExecutiveSummary', () => {
  it('returns an honest fallback when nothing is available', () => {
    expect(composeExecutiveSummary({})).toMatch(/Not enough data/)
  })

  it('includes sentiment with its delta when present', () => {
    const summary = composeExecutiveSummary({
      sentimentScores: [{ id: 'positive', label: 'Positive', value: 62.5, delta: 4.1 }],
    })
    expect(summary).toContain('62.5% positive')
    expect(summary).toContain('+4.1 pts vs. last week')
  })

  it('omits the delta clause when no delta is available', () => {
    const summary = composeExecutiveSummary({
      sentimentScores: [{ id: 'positive', label: 'Positive', value: 62.5, delta: null }],
    })
    expect(summary).toContain('62.5% positive.')
    expect(summary).not.toContain('vs. last week')
  })

  it('reports crisis risk when data was sufficient', () => {
    const summary = composeExecutiveSummary({
      crisis: { riskLevel: 'warning', riskScore: 35, dataSufficient: true },
    })
    expect(summary).toContain('Crisis risk is warning (score 35/100)')
  })

  it('reports that crisis risk could not be assessed when data was insufficient', () => {
    const summary = composeExecutiveSummary({
      crisis: { riskLevel: 'normal', riskScore: 0, dataSufficient: false },
    })
    expect(summary).toContain('could not be fully assessed')
  })

  it('includes the forecast model and projected revenue when available', () => {
    const summary = composeExecutiveSummary({
      bestForecastRow: {
        model_type: 'prophet',
        horizon_days: 30,
        forecast_points: [{ date: '2026-02-01', predicted: 12345.6 }],
      },
    })
    expect(summary).toContain('Prophet projects revenue of RM12,346')
    expect(summary).toContain('30-day forecast horizon')
  })

  it('combines all three when all are available', () => {
    const summary = composeExecutiveSummary({
      sentimentScores: [{ id: 'positive', value: 70, delta: 2 }],
      crisis: { riskLevel: 'normal', riskScore: 5, dataSufficient: true },
      bestForecastRow: { model_type: 'xgboost', horizon_days: 14, forecast_points: [{ predicted: 5000 }] },
    })
    expect(summary).toContain('70% positive')
    expect(summary).toContain('Crisis risk is normal')
    expect(summary).toContain('Xgboost projects revenue')
  })

  it('never invents a number that was not passed in', () => {
    const summary = composeExecutiveSummary({ sentimentScores: [{ id: 'positive', value: null, delta: null }] })
    // no positive.value -> the sentiment clause must not appear at all
    expect(summary).not.toMatch(/\d+% positive/)
  })
})
