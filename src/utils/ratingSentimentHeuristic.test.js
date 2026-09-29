import { describe, expect, it } from 'vitest'
import { classifyByRating } from './ratingSentimentHeuristic'

describe('classifyByRating', () => {
  it('maps 4-5 stars to positive', () => {
    expect(classifyByRating(5).sentiment).toBe('positive')
    expect(classifyByRating(4).sentiment).toBe('positive')
  })

  it('maps 3 stars to neutral', () => {
    expect(classifyByRating(3).sentiment).toBe('neutral')
  })

  it('normalizes rating to a [-1, 1] score', () => {
    expect(classifyByRating(5).score).toBe(1)
    expect(classifyByRating(3).score).toBe(0)
    expect(classifyByRating(1).score).toBe(-1)
  })

  it('maps 1-2 stars to negative', () => {
    expect(classifyByRating(1).sentiment).toBe('negative')
    expect(classifyByRating(2).sentiment).toBe('negative')
  })

  it('accepts numeric strings', () => {
    expect(classifyByRating('5').sentiment).toBe('positive')
  })

  it('returns null for missing or out-of-range ratings rather than guessing', () => {
    expect(classifyByRating(null)).toBeNull()
    expect(classifyByRating(undefined)).toBeNull()
    expect(classifyByRating(0)).toBeNull()
    expect(classifyByRating(6)).toBeNull()
    expect(classifyByRating('not-a-rating')).toBeNull()
  })
})
