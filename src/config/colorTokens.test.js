import { describe, expect, it } from 'vitest'
import { ALL_COLOR_CATEGORIES } from './colorTokens'

describe('colorTokens', () => {
  it('never assigns the same hex value to two different categories', () => {
    const seen = new Map()
    for (const [category, colors] of Object.entries(ALL_COLOR_CATEGORIES)) {
      for (const [key, hex] of Object.entries(colors)) {
        const normalized = hex.toLowerCase()
        if (seen.has(normalized)) {
          throw new Error(
            `${normalized} is used by both ${seen.get(normalized)} and ${category}.${key} — colors must not be reused across categories.`
          )
        }
        seen.set(normalized, `${category}.${key}`)
      }
    }
    expect(seen.size).toBeGreaterThan(0)
  })

  it('every value is a valid 6-digit hex color', () => {
    for (const colors of Object.values(ALL_COLOR_CATEGORIES)) {
      for (const hex of Object.values(colors)) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })
})
