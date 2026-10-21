import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  filtersToSearchParams,
  parseFiltersFromSearchParams,
  resolveDateRange,
} from './filterParams'

describe('parseFiltersFromSearchParams', () => {
  it('returns the defaults for an empty query string', () => {
    expect(parseFiltersFromSearchParams(new URLSearchParams())).toEqual(DEFAULT_FILTERS)
  })

  it('parses a preset range', () => {
    const result = parseFiltersFromSearchParams(new URLSearchParams('range=30D'))
    expect(result.preset).toBe('30D')
  })

  it('infers "custom" when from/to are present without an explicit range', () => {
    const result = parseFiltersFromSearchParams(
      new URLSearchParams('from=2026-09-01&to=2026-09-10')
    )
    expect(result.preset).toBe('custom')
    expect(result.from).toBe('2026-09-01')
    expect(result.to).toBe('2026-09-10')
  })

  it('splits comma-separated platform/product lists', () => {
    const result = parseFiltersFromSearchParams(
      new URLSearchParams('platform=tiktok,x&product=Serum')
    )
    expect(result.platforms).toEqual(['tiktok', 'x'])
    expect(result.products).toEqual(['Serum'])
  })

  it('never throws on an invalid preset value', () => {
    const result = parseFiltersFromSearchParams(new URLSearchParams('range=bogus'))
    expect(result.preset).toBe('All')
  })
})

describe('filtersToSearchParams', () => {
  it('produces an empty query string for all-default filters', () => {
    expect(filtersToSearchParams(DEFAULT_FILTERS).toString()).toBe('')
  })

  it('round-trips through parseFiltersFromSearchParams', () => {
    const filters = {
      preset: 'custom',
      from: '2026-09-01',
      to: '2026-09-10',
      platforms: ['tiktok', 'x'],
      products: [],
    }
    const params = filtersToSearchParams(filters)
    expect(parseFiltersFromSearchParams(params)).toEqual(filters)
  })
})

describe('resolveDateRange', () => {
  const today = new Date('2026-10-21T00:00:00Z')

  it('resolves "All" to an unbounded range', () => {
    expect(resolveDateRange({ ...DEFAULT_FILTERS, preset: 'All' }, today)).toEqual({
      from: null,
      to: null,
    })
  })

  it('resolves "7D" to a 7-day inclusive window ending today', () => {
    expect(resolveDateRange({ ...DEFAULT_FILTERS, preset: '7D' }, today)).toEqual({
      from: '2026-10-15',
      to: '2026-10-21',
    })
  })

  it('resolves "custom" to the filters\' own from/to, unmodified', () => {
    const filters = { ...DEFAULT_FILTERS, preset: 'custom', from: '2026-09-02', to: '2026-09-07' }
    expect(resolveDateRange(filters, today)).toEqual({ from: '2026-09-02', to: '2026-09-07' })
  })

  it('resolves an incomplete custom range to nulls rather than guessing the missing bound', () => {
    const filters = { ...DEFAULT_FILTERS, preset: 'custom', from: '2026-09-02', to: null }
    expect(resolveDateRange(filters, today)).toEqual({ from: '2026-09-02', to: null })
  })
})
