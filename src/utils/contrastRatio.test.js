import { describe, expect, it } from 'vitest'
import { contrastRatio, meetsWcag, relativeLuminance } from './contrastRatio'

describe('relativeLuminance', () => {
  it('black is 0, white is 1', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
  })
})

describe('contrastRatio', () => {
  it('black on white is the maximum, 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('identical colors have a ratio of 1', () => {
    expect(contrastRatio('#64748b', '#64748b')).toBe(1)
  })

  it('is symmetric regardless of argument order', () => {
    expect(contrastRatio('#111827', '#ffffff')).toBe(contrastRatio('#ffffff', '#111827'))
  })

  it('matches the real Low-Sensory and Senior mode color pairs this phase ships', () => {
    // src/styles/index.css's actual override values — if either regresses
    // below its WCAG target, this test (not a human eyeballing it) catches it.
    expect(contrastRatio('#57534e', '#f6f8f7')).toBeGreaterThanOrEqual(7) // low-sensory text on canvas
    expect(contrastRatio('#111827', '#ffffff')).toBeGreaterThanOrEqual(7) // senior text on white surface
  })
})

describe('meetsWcag', () => {
  it('AA normal text needs 4.5:1', () => {
    expect(meetsWcag(4.5, 'AA', false)).toBe(true)
    expect(meetsWcag(4.49, 'AA', false)).toBe(false)
  })

  it('AAA normal text needs 7:1', () => {
    expect(meetsWcag(7, 'AAA', false)).toBe(true)
    expect(meetsWcag(6.9, 'AAA', false)).toBe(false)
  })

  it('large text/UI components have lower thresholds', () => {
    expect(meetsWcag(3, 'AA', true)).toBe(true)
    expect(meetsWcag(4.5, 'AAA', true)).toBe(true)
  })
})
