import { describe, expect, it } from 'vitest'
import { mapXPostsToSocialRows } from './xMapping'

describe('mapXPostsToSocialRows', () => {
  it('maps real X post fields to the social template row shape', () => {
    const rows = mapXPostsToSocialRows([
      { id: '1', text: 'Loving this product!', createdAt: '2026-03-01T12:00:00.000Z', likeCount: 10, replyCount: 2, retweetCount: 3, quoteCount: 1 },
    ])
    expect(rows).toEqual([
      { date: '2026-03-01', platform: 'X', content: 'Loving this product!', likes: '10', comments: '2', shares: '4' },
    ])
  })

  it('never fabricates a metric X did not return', () => {
    const rows = mapXPostsToSocialRows([{ id: '1', text: 'No metrics here', createdAt: '2026-03-01T00:00:00.000Z' }])
    expect(rows[0]).toEqual({ date: '2026-03-01', platform: 'X', content: 'No metrics here' })
    expect('likes' in rows[0]).toBe(false)
  })

  it('skips posts with no real text', () => {
    const rows = mapXPostsToSocialRows([{ id: '1', text: '' }, { id: '2' }])
    expect(rows).toEqual([])
  })

  it('falls back to today only when X did not return a created_at, never inventing a past date', () => {
    const rows = mapXPostsToSocialRows([{ id: '1', text: 'hello' }])
    expect(rows[0].date).toBe(new Date().toISOString().slice(0, 10))
  })

  it('handles an empty list', () => {
    expect(mapXPostsToSocialRows([])).toEqual([])
    expect(mapXPostsToSocialRows()).toEqual([])
  })
})
