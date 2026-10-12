import { describe, expect, it } from 'vitest'
import { rowsToCsv } from './csvExport'

describe('rowsToCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(rowsToCsv([])).toBe('')
  })

  it('builds a header row from the first object\'s keys', () => {
    const csv = rowsToCsv([{ a: 1, b: 2 }])
    expect(csv.split('\n')[0]).toBe('a,b')
  })

  it('quotes and escapes values containing commas, quotes, or newlines', () => {
    const csv = rowsToCsv([{ text: 'hello, "world"\nnext line' }])
    expect(csv).toBe('text\n"hello, ""world""\nnext line"')
  })

  it('renders null/undefined as an empty cell, never the literal string', () => {
    const csv = rowsToCsv([{ a: null, b: undefined, c: 0 }])
    expect(csv.split('\n')[1]).toBe(',,0')
  })
})
