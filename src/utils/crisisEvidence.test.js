import { describe, expect, it } from 'vitest'
import {
  buildRootCauseSankey,
  selectEvidencePosts,
  selectNegativeEpisodeRows,
} from './crisisEvidence'

// Deliberately NOT the real Embun Botanica crisis window (2026-09-02..07) —
// an arbitrary, clearly-synthetic range, same reasoning as crisisHistory.test.js.
const EPISODE = { start: '2025-03-08', end: '2025-03-13' }

function post(overrides = {}) {
  return {
    id: 'p1',
    sentiment: 'negative',
    collected_at: '2025-03-09T10:00:00Z',
    platform: 'tiktok',
    language: 'en',
    cleaned_text: 'the packaging leaked all over my bag, so disappointed',
    engagement: 10,
    product: null,
    ...overrides,
  }
}

describe('selectNegativeEpisodeRows', () => {
  it('keeps only negative rows inside the episode window, tagged with real aspects', () => {
    const rows = [
      post(),
      post({ id: 'p2', sentiment: 'positive' }),
      post({ id: 'p3', collected_at: '2025-02-01T00:00:00Z' }),
    ]
    const result = selectNegativeEpisodeRows(rows, EPISODE)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p1')
    expect(result[0].aspects).toContain('Packaging & leakage')
  })

  it('returns [] for a null episode rather than throwing', () => {
    expect(selectNegativeEpisodeRows([post()], null)).toEqual([])
  })
})

describe('buildRootCauseSankey', () => {
  it('returns null when nothing negative falls inside the episode — an honest absence', () => {
    expect(buildRootCauseSankey([post({ sentiment: 'positive' })], EPISODE)).toBeNull()
  })

  it('builds platform -> aspect -> product links only where a product was actually captured', () => {
    const rows = [
      post({ id: 'p1', product: 'Rice Water Foaming Wash' }),
      post({
        id: 'p2',
        platform: 'x',
        cleaned_text: 'delivery was so lambat, still waiting',
        product: null,
      }),
    ]
    const result = buildRootCauseSankey(rows, EPISODE)

    expect(result.totalNegativePosts).toBe(2)
    expect(result.productAttributedCount).toBe(1)

    const nodeNames = result.nodes.map((n) => n.name)
    expect(nodeNames).toContain('tiktok')
    expect(nodeNames).toContain('Packaging & leakage')
    expect(nodeNames).toContain('Rice Water Foaming Wash')

    // p2 has no product, so its aspect should have no outgoing link to any product node.
    const deliveryAspectIndex = result.nodes.findIndex((n) => n.name === 'Delivery delay')
    const hasProductLinkFromDelivery = result.links.some(
      (link) =>
        link.source === deliveryAspectIndex && result.nodes[link.target].category === 'product'
    )
    expect(hasProductLinkFromDelivery).toBe(false)
  })

  it('falls back to "Unclassified" when no lexicon keyword matches', () => {
    const result = buildRootCauseSankey(
      [post({ cleaned_text: 'zzz random text with no signal' })],
      EPISODE
    )
    expect(result.nodes.map((n) => n.name)).toContain('Unclassified')
  })
})

describe('selectEvidencePosts', () => {
  it('ranks by real engagement and caps at the limit, preserving original text untouched', () => {
    const rows = [
      post({ id: 'low', engagement: 5 }),
      post({ id: 'high', engagement: 500 }),
      post({ id: 'mid', engagement: 50 }),
    ]
    const result = selectEvidencePosts(rows, EPISODE, 2)
    expect(result.map((r) => r.id)).toEqual(['high', 'mid'])
    expect(result[0].text).toBe(post().cleaned_text)
  })
})
