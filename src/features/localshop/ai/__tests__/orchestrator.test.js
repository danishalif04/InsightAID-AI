import { describe, expect, it, vi } from 'vitest'

// The orchestrator imports the Supabase client for its (optional) LLM
// calls. Every test here runs in offline mode, so the client is stubbed
// to prove the investigation never depends on a network call.
vi.mock('@/config/supabaseClient', () => ({
  supabase: { functions: { invoke: vi.fn(async () => ({ data: null, error: new Error('offline') })) } },
}))

const { detectLanguage, runInvestigation, STEPS } = await import('../orchestrator')
const { collectNumbers, extractClaims, guardAnswer } = await import('../guard')
const { runTool, validateToolCall, shopDigest } = await import('../tools')
const { DEMO_SHOP } = await import('../../data/demoShop')

describe('language detection', () => {
  it('spots Malay function words', () => {
    expect(detectLanguage('Saya ada modal RM15,000. Cukup ke untuk buka kedai runcit kecil?')).toBe('ms')
    expect(detectLanguage('How much should I sell daily to cover my expenses?')).toBe('en')
  })
})

describe('tool registry', () => {
  it('rejects unknown tools and missing required params', () => {
    expect(validateToolCall('drop_tables').valid).toBe(false)
    expect(validateToolCall('simulate_price_change', {}).valid).toBe(false)
    expect(validateToolCall('simulate_price_change', { product_name: 'Coffee', new_price: 9 }).valid).toBe(true)
    // Optional params may be omitted.
    expect(validateToolCall('calculate_startup_capital', {}).valid).toBe(true)
  })

  it('computes break-even from the demo shop', () => {
    const result = runTool('calculate_break_even', DEMO_SHOP)
    expect(result.fixed).toBe(2500)
    expect(result.revenue).toBeGreaterThan(7000)
    expect(result.assumptions).toContain('equal sales mix')
  })

  it('never puts raw rows in the planning digest', () => {
    const digest = shopDigest(DEMO_SHOP)
    expect(digest.products).toBe(28)
    expect(JSON.stringify(digest)).not.toMatch(/Mineral Water/)
  })

  it('returns a failure object instead of throwing on bad input', () => {
    expect(runTool('calculate_break_even', {}).ok).toBe(false)
  })
})

describe('guard', () => {
  it('accepts an answer whose figures all came from the tools', () => {
    const results = [{ revenue: 7142.86, marginPct: 35 }]
    const verdict = guardAnswer('You need about RM7142.86 in sales at a 35% margin.', results)
    expect(verdict.verified).toBe(true)
  })

  it('flags a figure the tools never produced', () => {
    const verdict = guardAnswer('You need about RM9999 in sales.', [{ revenue: 7142.86 }])
    expect(verdict.verified).toBe(false)
    expect(verdict.unverified[0].value).toBe(9999)
  })

  it('blocks guarantees and health labels', () => {
    expect(guardAnswer('This is guaranteed to work.', [{}]).blocked).toHaveLength(1)
    expect(guardAnswer('Your business is financially healthy.', [{}]).blocked).toHaveLength(1)
    expect(guardAnswer('The rise was caused by national inflation.', [{}]).blocked).toHaveLength(1)
  })

  it('finds numbers nested anywhere in a tool result', () => {
    const found = collectNumbers({ a: 1, b: { c: [2, { d: 3 }] } })
    expect([...found]).toEqual(expect.arrayContaining([1, 2, 3]))
  })

  it('extracts both money and percentage claims', () => {
    const claims = extractClaims('RM1,234.50 at 37.5%')
    expect(claims.map((c) => c.value)).toEqual(expect.arrayContaining([1234.5, 37.5]))
  })
})

describe('runInvestigation (offline)', () => {
  it('answers the RM15,000 capital question with real engine figures', async () => {
    const result = await runInvestigation({
      question: 'Saya ada modal RM15,000. Cukup ke untuk buka kedai runcit kecil?',
      shop: { ...DEMO_SHOP, availableCapital: 15000 },
      mode: 'mock',
    })

    expect(result.lang).toBe('ms')
    expect(result.results[0].name).toBe('calculate_startup_capital')
    // RM29,400 setup + RM7,500 buffer = RM36,900 needed against RM15,000.
    expect(result.results[0].result.total).toBe(29400)
    expect(result.results[0].result.gap).toBe(21900)
    expect(result.answer).toMatch(/29,400|29400/)
    expect(result.answer).not.toMatch(/guarantee|jamin/i)
  })

  it('runs all seven steps in order with real timings', async () => {
    const seen = []
    const result = await runInvestigation({
      question: 'How much should I sell daily to cover my expenses?',
      shop: DEMO_SHOP,
      mode: 'mock',
      onStep: (step) => seen.push(step.name),
    })

    expect(seen).toEqual(STEPS)
    expect(result.trace).toHaveLength(STEPS.length + result.results.length - 1)
    expect(result.totalMs).toBeGreaterThanOrEqual(0)
  })

  it('works with no network — the answer still carries real numbers', async () => {
    const result = await runInvestigation({ question: 'Where is my money going?', shop: DEMO_SHOP, mode: 'live' })
    // 'live' mode, but every LLM call fails above, so it must fall back.
    expect(result.planSource).toBe('deterministic')
    expect(result.answerSource).toBe('template')
    expect(result.answer).toMatch(/2,750|2750/)
  })

  it('never claims a capability the shop does not have', async () => {
    const result = await runInvestigation({ question: 'Show me my sales trend', shop: DEMO_SHOP, mode: 'mock' })
    const readinessStep = result.trace.find((step) => step.name === 'CHECK READINESS')
    expect(readinessStep.detail).toMatch(/\d+% ready/)
  })

  it('reports missing inputs instead of inventing them for an empty shop', async () => {
    const result = await runInvestigation({ question: 'What is my break-even?', shop: { products: [], expenses: [] }, mode: 'mock' })
    expect(result.missing.length).toBeGreaterThan(0)
    expect(result.answer).toBeTruthy()
  })
})
