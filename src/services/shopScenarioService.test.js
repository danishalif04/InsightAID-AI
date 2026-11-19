import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()
vi.mock('@/config/supabaseClient', () => ({ supabase: { functions: { invoke: (...args) => invoke(...args) } } }))

const { SCENARIO_ERRORS, generateShopScenario } = await import('./shopScenarioService')

/** A scenario the validator accepts, so each test varies one thing. */
function goodScenario(overrides = {}) {
  return {
    name: 'Kopi Warisan',
    category: 'Kopitiam',
    location: 'Ipoh',
    products: [
      { name: 'White Coffee', unit: 'cup', cost: 0.8, price: 2 },
      { name: 'Toast', unit: 'piece', cost: 0.3, price: 1.2 },
      { name: 'Half-boiled Eggs', unit: 'plate', cost: 0.7, price: 2.5 },
    ],
    expenses: [{ category: 'Rental', amount: 1800, kind: 'fixed', controllable: false }],
    ...overrides,
  }
}

const PROFILE = { sector: 'Food & Beverage', revenueTarget: 15000, description: 'A small kopitiam in Ipoh.' }

beforeEach(() => {
  invoke.mockReset()
})

describe('generateShopScenario — input guards', () => {
  it('rejects an empty description without calling the backend', async () => {
    const result = await generateShopScenario({ description: '   ' })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe(SCENARIO_ERRORS.INVALID_INPUT)
    expect(invoke).not.toHaveBeenCalled()
  })

  it.each([['abc'], [0], [-5]])('rejects revenueTarget %s without calling the backend', async (value) => {
    const result = await generateShopScenario({ description: 'A shop.', revenueTarget: value })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe(SCENARIO_ERRORS.INVALID_INPUT)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('accepts a numeric string target from a form field', async () => {
    invoke.mockResolvedValue({ data: { scenario: goodScenario() }, error: null })
    const result = await generateShopScenario({ ...PROFILE, revenueTarget: '15000' })
    expect(result.ok).toBe(true)
    expect(result.shop.revenueTarget).toBe(15000)
  })

  it('treats an omitted target as absent rather than invalid', async () => {
    invoke.mockResolvedValue({ data: { scenario: goodScenario() }, error: null })
    const result = await generateShopScenario({ description: 'A shop.', revenueTarget: '' })
    expect(result.ok).toBe(true)
    expect(result.shop.revenueTarget).toBeNull()
  })
})

describe('generateShopScenario — backend failures', () => {
  it('maps a transport error to UPSTREAM', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('network down') })
    const result = await generateShopScenario(PROFILE)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe(SCENARIO_ERRORS.UPSTREAM)
  })

  it('maps NOT_CONFIGURED to its own reason', async () => {
    invoke.mockResolvedValue({ data: { error: 'NOT_CONFIGURED', message: 'secrets missing' }, error: null })
    const result = await generateShopScenario(PROFILE)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe(SCENARIO_ERRORS.NOT_CONFIGURED)
  })

  it('maps UPSTREAM_MALFORMED to MALFORMED', async () => {
    invoke.mockResolvedValue({ data: { error: 'UPSTREAM_MALFORMED', message: 'not json' }, error: null })
    const result = await generateShopScenario(PROFILE)
    expect(result.reason).toBe(SCENARIO_ERRORS.MALFORMED)
  })

  it('reports a missing scenario rather than returning an empty shop', async () => {
    invoke.mockResolvedValue({ data: {}, error: null })
    const result = await generateShopScenario(PROFILE)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe(SCENARIO_ERRORS.MALFORMED)
  })

  it('never throws when invoke itself throws', async () => {
    invoke.mockRejectedValue(new Error('boom'))
    const result = await generateShopScenario(PROFILE)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe(SCENARIO_ERRORS.UNKNOWN)
  })
})

describe('generateShopScenario — the validator is the gate', () => {
  it('rejects a scenario the validator refuses, and does not half-apply it', async () => {
    invoke.mockResolvedValue({
      data: { scenario: goodScenario({ products: [{ name: 'Teh', cost: 5, price: 5 }] }) },
      error: null,
    })
    const result = await generateShopScenario(PROFILE)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe(SCENARIO_ERRORS.REJECTED)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.shop).toBeUndefined()
  })

  it('strips a model-supplied break-even and still succeeds, with a warning', async () => {
    invoke.mockResolvedValue({ data: { scenario: goodScenario({ breakEvenRevenue: 9999 }) }, error: null })
    const result = await generateShopScenario(PROFILE)
    expect(result.ok).toBe(true)
    expect(result.shop.breakEvenRevenue).toBeUndefined()
    expect(result.warnings.join(' ')).toContain('breakEvenRevenue')
  })

  it("marks the result as AI-generated and illustrative, never the owner's own records", async () => {
    invoke.mockResolvedValue({ data: { scenario: goodScenario() }, error: null })
    const result = await generateShopScenario(PROFILE)
    expect(result.shop.provenance).toBe('ai-generated')
    expect(result.shop.illustrative).toBe(true)
  })

  it('never carries invented sales history or feedback through', async () => {
    invoke.mockResolvedValue({
      data: { scenario: goodScenario({ dailyRecords: [{ date: '2026-01-01', revenue: 900 }], feedback: [{ text: 'Nice' }] }) },
      error: null,
    })
    const result = await generateShopScenario(PROFILE)
    expect(result.shop.dailyRecords).toEqual([])
    expect(result.shop.feedback).toEqual([])
  })

  it("passes the user's own answers to the backend", async () => {
    invoke.mockResolvedValue({ data: { scenario: goodScenario() }, error: null })
    await generateShopScenario(PROFILE)
    expect(invoke).toHaveBeenCalledWith('generate-shop-scenario', {
      body: { sector: 'Food & Beverage', revenueTarget: 15000, description: 'A small kopitiam in Ipoh.' },
    })
  })
})
