import { describe, expect, it } from 'vitest'
import { mapThreadsPostsToSocialRows } from './threadsMapping'

describe('mapThreadsPostsToSocialRows', () => {
  it('maps real Threads post fields to the social template row shape, including the reply count when permitted', () => {
    const rows = mapThreadsPostsToSocialRows(
      [{ id: 'p1', text: 'Loving this product!', timestamp: '2026-03-01T12:00:00+0000', replies: [{ id: 'r1' }, { id: 'r2' }] }],
      { repliesAvailable: true }
    )
    expect(rows).toEqual([
      { date: '2026-03-01', platform: 'Threads', content: 'Loving this product!', source_post_id: 'p1', comments: '2' },
    ])
  })

  it('never fabricates a reply count when the permission was not confirmed', () => {
    const rows = mapThreadsPostsToSocialRows(
      [{ id: 'p1', text: 'No replies data here', timestamp: '2026-03-01T00:00:00+0000', replies: [] }],
      { repliesAvailable: false }
    )
    expect(rows[0]).toEqual({ date: '2026-03-01', platform: 'Threads', content: 'No replies data here', source_post_id: 'p1' })
    expect('comments' in rows[0]).toBe(false)
  })

  it('defaults repliesAvailable to false when not passed', () => {
    const rows = mapThreadsPostsToSocialRows([{ id: 'p1', text: 'hello', timestamp: '2026-03-01T00:00:00+0000' }])
    expect('comments' in rows[0]).toBe(false)
  })

  it('skips posts with no real text', () => {
    const rows = mapThreadsPostsToSocialRows([{ id: 'p1', text: '' }, { id: 'p2' }], { repliesAvailable: true })
    expect(rows).toEqual([])
  })

  it('falls back to today only when Threads did not return a timestamp, never inventing a past date', () => {
    const rows = mapThreadsPostsToSocialRows([{ id: 'p1', text: 'hello' }])
    expect(rows[0].date).toBe(new Date().toISOString().slice(0, 10))
  })

  it('handles an empty list', () => {
    expect(mapThreadsPostsToSocialRows([])).toEqual([])
    expect(mapThreadsPostsToSocialRows()).toEqual([])
  })
})
