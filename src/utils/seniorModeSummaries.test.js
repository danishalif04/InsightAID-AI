import { describe, expect, it } from 'vitest'
import { summarizeChangeBM, summarizeScoreBM } from './seniorModeSummaries'

describe('summarizeScoreBM', () => {
  it('describes a real score with a positive delta', () => {
    expect(summarizeScoreBM({ label: 'Sentimen Positif', value: 67, delta: 4.2 })).toBe(
      'Sentimen Positif ialah 67%, naik 4.2 mata peratusan berbanding 7 hari lepas.'
    )
  })

  it('describes a negative delta as turun (down), not a negative number', () => {
    const text = summarizeScoreBM({ label: 'Sentimen Negatif', value: 20, delta: -5 })
    expect(text).toContain('turun 5 mata peratusan')
    expect(text).not.toContain('-5')
  })

  it('states no-change explicitly rather than "naik 0"', () => {
    expect(summarizeScoreBM({ label: 'X', value: 50, delta: 0 })).toContain('tidak berubah')
  })

  it('never fabricates a delta sentence when none exists', () => {
    expect(summarizeScoreBM({ label: 'X', value: 50, delta: null })).toBe('X ialah 50%.')
  })

  it('says data is unavailable rather than guessing when value is missing', () => {
    expect(summarizeScoreBM({ label: 'X', value: null, delta: null })).toBe('X tidak tersedia buat masa ini.')
    expect(summarizeScoreBM(null)).toBe('Data tidak tersedia buat masa ini.')
  })
})

describe('summarizeChangeBM', () => {
  it('computes a real percentage change between two periods', () => {
    const text = summarizeChangeBM({ label: 'Jualan', value: 1120, unit: 'RM' }, { value: 1000 })
    expect(text).toContain('naik 12%')
  })

  it('handles a decrease', () => {
    const text = summarizeChangeBM({ label: 'Jualan', value: 880, unit: 'RM' }, { value: 1000 })
    expect(text).toContain('turun 12%')
  })

  it('omits the comparison sentence when there is no real previous value', () => {
    expect(summarizeChangeBM({ label: 'Jualan', value: 500, unit: 'RM' }, null)).toBe('Jualan ialah RM500.')
  })
})
