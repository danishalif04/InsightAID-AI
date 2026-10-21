import { describe, expect, it } from 'vitest'
import { buildHashtagGraph, computeWeeklyHashtagRank, weekStartOf } from './hashtagGraph'

describe('buildHashtagGraph', () => {
  it('counts each hashtag once per post even if repeated within it', () => {
    const graph = buildHashtagGraph([{ hashtags: ['glow', 'glow', 'skincare'] }])
    expect(graph.nodes.find((n) => n.id === 'glow').count).toBe(1)
  })

  it('creates a co-occurrence edge for hashtags appearing together', () => {
    const graph = buildHashtagGraph([
      { hashtags: ['glow', 'skincare'] },
      { hashtags: ['glow', 'skincare'] },
    ])
    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0].weight).toBe(2)
  })

  it('does not create an edge between hashtags that never co-occur', () => {
    const graph = buildHashtagGraph([{ hashtags: ['a'] }, { hashtags: ['b'] }])
    expect(graph.edges).toEqual([])
  })

  it('computes avg sentiment per hashtag only from posts that have a sentimentScore', () => {
    const graph = buildHashtagGraph([
      { hashtags: ['glow'], sentimentScore: 1 },
      { hashtags: ['glow'], sentimentScore: -1 },
      { hashtags: ['glow'] }, // no sentiment — excluded from the average, not treated as 0
    ])
    expect(graph.nodes.find((n) => n.id === 'glow').avgSentiment).toBe(0)
  })

  it('leaves avgSentiment null when no post with that hashtag has a sentimentScore', () => {
    const graph = buildHashtagGraph([{ hashtags: ['glow'] }])
    expect(graph.nodes[0].avgSentiment).toBeNull()
  })

  it('filters out nodes below minCount', () => {
    const graph = buildHashtagGraph(
      [{ hashtags: ['rare'] }, { hashtags: ['common'] }, { hashtags: ['common'] }],
      { minCount: 2 }
    )
    expect(graph.nodes.map((n) => n.id)).toEqual(['common'])
  })
})

describe('weekStartOf', () => {
  it('returns the Monday of the week for a mid-week date', () => {
    expect(weekStartOf('2026-10-21')).toBe('2026-10-19') // Wed -> preceding Monday
  })

  it('returns the same date when given a Monday', () => {
    expect(weekStartOf('2026-10-19')).toBe('2026-10-19')
  })

  it('handles Sunday correctly (ISO week ends on Sunday)', () => {
    expect(weekStartOf('2026-10-25')).toBe('2026-10-19')
  })
})

describe('computeWeeklyHashtagRank', () => {
  it('groups by week and ranks by frequency within each week', () => {
    const posts = [
      { date: '2026-10-19', hashtags: ['a', 'b'] },
      { date: '2026-10-20', hashtags: ['a'] },
      { date: '2026-10-26', hashtags: ['c'] },
    ]
    const result = computeWeeklyHashtagRank(posts)
    expect(result).toHaveLength(2)
    expect(result[0].week).toBe('2026-10-19')
    expect(result[0].hashtags[0]).toMatchObject({ hashtag: 'a', count: 2, rank: 1 })
  })

  it('respects topN', () => {
    const posts = [
      { date: '2026-01-05', hashtags: ['a'] },
      { date: '2026-01-05', hashtags: ['b'] },
      { date: '2026-01-05', hashtags: ['c'] },
    ]
    expect(computeWeeklyHashtagRank(posts, { topN: 2 })[0].hashtags).toHaveLength(2)
  })

  it('skips posts with no date rather than throwing', () => {
    expect(computeWeeklyHashtagRank([{ hashtags: ['a'] }])).toEqual([])
  })
})
