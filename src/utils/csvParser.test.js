import { describe, expect, it } from 'vitest'
import { parseCsv, parseCsvRows } from './csvParser'

describe('parseCsvRows', () => {
  it('splits simple comma-separated rows', () => {
    expect(parseCsvRows('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('handles quoted fields containing commas', () => {
    expect(parseCsvRows('name,note\n"Doe, Jane",hello')).toEqual([
      ['name', 'note'],
      ['Doe, Jane', 'hello'],
    ])
  })

  it('handles escaped quotes inside quoted fields', () => {
    expect(parseCsvRows('text\n"She said ""hi"""')).toEqual([['text'], ['She said "hi"']])
  })

  it('handles quoted fields containing newlines', () => {
    expect(parseCsvRows('text\n"line one\nline two"')).toEqual([['text'], ['line one\nline two']])
  })

  it('handles CRLF line endings', () => {
    expect(parseCsvRows('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('parseCsv', () => {
  it('maps rows to header-keyed objects', () => {
    const { headers, records } = parseCsv('date,product,revenue\n2026-01-01,Serum,35')
    expect(headers).toEqual(['date', 'product', 'revenue'])
    expect(records).toEqual([{ date: '2026-01-01', product: 'Serum', revenue: '35' }])
  })

  it('returns empty output for empty input rather than throwing', () => {
    expect(parseCsv('')).toEqual({ headers: [], records: [] })
  })

  it('fills missing trailing cells with empty strings instead of misaligning columns', () => {
    const { records } = parseCsv('a,b,c\n1,2')
    expect(records).toEqual([{ a: '1', b: '2', c: '' }])
  })
})
