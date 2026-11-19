import { describe, expect, it } from 'vitest'
import {
  FORBIDDEN_COMPUTED_KEYS,
  LIMITS,
  roundMoney,
  slugify,
  validateShopScenario,
} from './shopScenarioSchema'

/** Smallest scenario that should pass, so each test varies one thing. */
function validScenario(overrides = {}) {
  return {
    name: 'Kedai Contoh',
    category: 'Grocery shop',
    location: 'Perak',
    products: [
      { name: 'Mineral Water', unit: 'bottle', cost: 1.0, price: 1.5 },
      { name: 'Bread', unit: 'loaf', cost: 2.0, price: 3.0 },
      { name: 'Coffee', unit: 'cup', cost: 5.0, price: 8.0 },
    ],
    expenses: [
      { category: 'Rental', amount: 1200, kind: 'fixed', controllable: false },
      { category: 'Marketing', amount: 100, kind: 'variable', controllable: true },
    ],
    ...overrides,
  }
}

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Mineral Water', 'x')).toBe('mineral-water')
  })

  it('strips punctuation and collapses separators', () => {
    expect(slugify('Nasi  Lemak!! (Special)', 'x')).toBe('nasi-lemak-special')
  })

  it('falls back when nothing survives', () => {
    expect(slugify('!!!', 'p-1')).toBe('p-1')
    expect(slugify(null, 'p-2')).toBe('p-2')
  })
})

describe('roundMoney', () => {
  it('rounds to sen', () => {
    expect(roundMoney(2.345)).toBe(2.35)
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
    expect(roundMoney(1199.999)).toBe(1200)
  })

  // Documented, not worked around. `1.005 * 100` is 100.49999999999999 in
  // IEEE-754, so it rounds DOWN. This is identical to the Local Shop
  // engine's own `round` (engine/core.js) — deliberately so, since a
  // validator that rounded differently from the engine would show a cost
  // on Products & Pricing that disagreed with the one break-even used.
  // Consistency with the engine matters more here than decimal purity.
  it('inherits the engine’s floating-point edge cases, on purpose', () => {
    expect(roundMoney(1.005)).toBe(1)
  })
})

describe('validateShopScenario — accepting a good scenario', () => {
  it('returns a shop the Local Shop pages can render', () => {
    const result = validateShopScenario(validScenario())
    expect(result.ok).toBe(true)
    expect(result.shop.name).toBe('Kedai Contoh')
    expect(result.shop.products).toHaveLength(3)
    expect(result.shop.expenses).toHaveLength(2)
    expect(result.shop.currency).toBe('MYR')
  })

  it('derives unique ids rather than trusting the model for them', () => {
    const result = validateShopScenario(
      validScenario({
        products: [
          { name: 'Teh', unit: 'cup', cost: 1, price: 2 },
          { name: 'Teh', unit: 'cup', cost: 1, price: 2.5 },
          { name: 'Teh', unit: 'glass', cost: 1, price: 3 },
        ],
      })
    )
    expect(result.ok).toBe(true)
    expect(result.shop.products.map((p) => p.id)).toEqual(['teh', 'teh-2', 'teh-3'])
  })

  it('leaves dailyRecords and feedback empty — this pathway has no history', () => {
    const result = validateShopScenario(
      validScenario({
        dailyRecords: [{ date: '2026-01-01', revenue: 500 }],
        feedback: [{ text: 'Great shop!' }],
      })
    )
    expect(result.ok).toBe(true)
    expect(result.shop.dailyRecords).toEqual([])
    expect(result.shop.feedback).toEqual([])
  })

  it('always marks a generated shop as illustrative and AI-generated', () => {
    const result = validateShopScenario(validScenario({ illustrative: false }))
    expect(result.ok).toBe(true)
    expect(result.shop.illustrative).toBe(true)
    expect(result.shop.provenance).toBe('ai-generated')
  })
})

describe("validateShopScenario — the LLM may not supply computed figures", () => {
  it.each(FORBIDDEN_COMPUTED_KEYS)('strips a top-level %s and warns', (key) => {
    const result = validateShopScenario(validScenario({ [key]: 999 }))
    expect(result.ok).toBe(true)
    expect(result.shop[key]).toBeUndefined()
    expect(result.warnings.join(' ')).toContain(key)
  })

  it('strips a per-product margin rather than displaying it', () => {
    const result = validateShopScenario(
      validScenario({
        products: [
          { name: 'Teh', unit: 'cup', cost: 1, price: 2, margin: 50 },
          { name: 'Kopi', unit: 'cup', cost: 2, price: 4 },
          { name: 'Roti', unit: 'loaf', cost: 2, price: 3 },
        ],
      })
    )
    expect(result.ok).toBe(true)
    expect(result.shop.products[0].margin).toBeUndefined()
    expect(result.warnings.some((w) => w.includes('products[0].margin'))).toBe(true)
  })

  it('strips a break-even the model tried to compute', () => {
    const result = validateShopScenario(validScenario({ breakEvenRevenue: 7131 }))
    expect(result.ok).toBe(true)
    expect(result.shop.breakEvenRevenue).toBeUndefined()
  })
})

describe('validateShopScenario — rejecting bad input', () => {
  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'not a scenario'],
    ['a number', 42],
  ])('rejects %s', (_label, input) => {
    const result = validateShopScenario(input)
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('rejects a missing name', () => {
    const result = validateShopScenario(validScenario({ name: '   ' }))
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('name')
  })

  it('rejects too few products', () => {
    const result = validateShopScenario(validScenario({ products: [{ name: 'Teh', cost: 1, price: 2 }] }))
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain(`at least ${LIMITS.minProducts}`)
  })

  it('rejects a price at or below cost instead of silently repairing it', () => {
    const result = validateShopScenario(
      validScenario({
        products: [
          { name: 'Teh', unit: 'cup', cost: 5, price: 5 },
          { name: 'Kopi', unit: 'cup', cost: 2, price: 4 },
          { name: 'Roti', unit: 'loaf', cost: 2, price: 3 },
        ],
      })
    )
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('must be greater than cost')
  })

  it('rejects a non-numeric cost rather than coercing the string', () => {
    const result = validateShopScenario(
      validScenario({
        products: [
          { name: 'Teh', unit: 'cup', cost: '1.00', price: 2 },
          { name: 'Kopi', unit: 'cup', cost: 2, price: 4 },
          { name: 'Roti', unit: 'loaf', cost: 2, price: 3 },
        ],
      })
    )
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('cost must be a number')
  })

  it.each([NaN, Infinity, -Infinity])('rejects %s as an expense amount', (amount) => {
    const result = validateShopScenario(
      validScenario({ expenses: [{ category: 'Rental', amount, kind: 'fixed' }] })
    )
    expect(result.ok).toBe(false)
  })

  it('rejects a scenario with no fixed cost — break-even needs one', () => {
    const result = validateShopScenario(
      validScenario({ expenses: [{ category: 'Marketing', amount: 100, kind: 'variable' }] })
    )
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('at least one fixed cost')
  })

  it('rejects a negative availableCapital', () => {
    const result = validateShopScenario(validScenario({ availableCapital: -100 }))
    expect(result.ok).toBe(false)
  })

  it('rejects an absurd amount above the cap', () => {
    const result = validateShopScenario(
      validScenario({ expenses: [{ category: 'Rental', amount: LIMITS.maxAmount + 1, kind: 'fixed' }] })
    )
    expect(result.ok).toBe(false)
  })

  it('never throws, whatever it is handed', () => {
    const nasty = [undefined, Symbol('x'), () => {}, { products: 'no' }, { expenses: {} }]
    for (const input of nasty) {
      expect(() => validateShopScenario(input)).not.toThrow()
    }
  })
})

describe("validateShopScenario — the user's own answers win", () => {
  it('prefers the profile over the model echo', () => {
    const result = validateShopScenario(
      validScenario({ sector: 'Model guess', revenueTarget: 1, description: 'Model text' }),
      { sector: 'Retail / E-commerce', revenueTarget: 9000, description: 'My own words' }
    )
    expect(result.ok).toBe(true)
    expect(result.shop.sector).toBe('Retail / E-commerce')
    expect(result.shop.revenueTarget).toBe(9000)
    expect(result.shop.description).toBe('My own words')
  })

  it('falls back to the model value when the profile omits one', () => {
    const result = validateShopScenario(validScenario({ sector: 'Grocery' }), {})
    expect(result.ok).toBe(true)
    expect(result.shop.sector).toBe('Grocery')
  })

  it('rejects a non-positive revenue target from either source', () => {
    const result = validateShopScenario(validScenario(), { revenueTarget: 0 })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('revenueTarget')
  })
})

describe('validateShopScenario — startup items', () => {
  it('keeps recognised buckets and drops unknown ones', () => {
    const result = validateShopScenario(
      validScenario({ startupItems: { renovation: 8000, crypto_fund: 5000 } })
    )
    expect(result.ok).toBe(true)
    expect(result.shop.startupItems).toEqual({ renovation: 8000 })
    expect(result.warnings.join(' ')).toContain('crypto_fund')
  })

  it('defaults to an empty object when absent', () => {
    const result = validateShopScenario(validScenario())
    expect(result.shop.startupItems).toEqual({})
  })
})
