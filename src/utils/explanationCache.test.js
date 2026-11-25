import { describe, expect, it } from 'vitest'
import { explanationCacheKey, splitCached, stableStringify } from './explanationCache'

const rec = { id: 'crisis_warning', category: 'risk', priority: 'high', title: 'Review complaints', evidence: ['Negative share 62%'], rule: 'not sent' }
const ctx = [{ factor: 'stage', value: 'Operating' }]

describe('stableStringify', () => {
  it('ignores key order', () => {
    expect(stableStringify({ b: 1, a: [2, { d: 3, c: 4 }] })).toBe(stableStringify({ a: [2, { c: 4, d: 3 }], b: 1 }))
  })
})

describe('explanationCacheKey', () => {
  it('is stable for the same inputs and a 64 character hex hash', async () => {
    const a = await explanationCacheKey(rec, ctx)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await explanationCacheKey({ ...rec }, [...ctx])).toBe(a)
  })

  it('changes when evidence, priority or business context change', async () => {
    const base = await explanationCacheKey(rec, ctx)
    expect(await explanationCacheKey({ ...rec, evidence: ['Negative share 63%'] }, ctx)).not.toBe(base)
    expect(await explanationCacheKey({ ...rec, priority: 'medium' }, ctx)).not.toBe(base)
    expect(await explanationCacheKey(rec, [{ factor: 'stage', value: 'Idea' }])).not.toBe(base)
  })

  it('ignores fields that are not sent to the AI', async () => {
    expect(await explanationCacheKey({ ...rec, rule: 'changed' }, ctx)).toBe(await explanationCacheKey(rec, ctx))
  })
})

describe('splitCached', () => {
  it('uses stored wording for hits and lists the rest as missing', () => {
    const recs = [{ id: 'a' }, { id: 'b' }]
    const { cached, missing } = splitCached(recs, ['k1', 'k2'], [{ cache_key: 'k2', rationale: 'R', context: 'C' }])
    expect(cached).toEqual({ b: { rationale: 'R', context: 'C' } })
    expect(missing).toEqual([{ id: 'a' }])
  })
})
