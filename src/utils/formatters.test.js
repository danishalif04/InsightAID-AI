import { describe, expect, it } from 'vitest'
import { capitalize, initialsFromName } from './formatters'

describe('capitalize', () => {
  it('uppercases the first letter only', () => {
    expect(capitalize('tiktok')).toBe('Tiktok')
  })

  it('passes through empty/null unchanged', () => {
    expect(capitalize('')).toBe('')
    expect(capitalize(null)).toBe(null)
  })
})

describe('initialsFromName', () => {
  it('takes the first letter of the first and last name', () => {
    expect(initialsFromName('Admin User')).toBe('AU')
    expect(initialsFromName('Jane Mary Doe')).toBe('JD')
  })

  it('handles a single name', () => {
    expect(initialsFromName('Cher')).toBe('C')
  })

  it('falls back to "?" for empty/missing input, never a hardcoded name', () => {
    expect(initialsFromName('')).toBe('?')
    expect(initialsFromName('   ')).toBe('?')
    expect(initialsFromName(null)).toBe('?')
    expect(initialsFromName(undefined)).toBe('?')
  })

  it('uppercases the result', () => {
    expect(initialsFromName('jane doe')).toBe('JD')
  })
})
