import { describe, expect, it } from 'vitest'
import { FIELDS_BY_ID, validateFieldValue } from './businessProfileSchema'

describe('industry field (Business Sector dropdown)', () => {
  it('is a select field with a curated, non-empty option list', () => {
    const field = FIELDS_BY_ID.industry
    expect(field.type).toBe('select')
    expect(Array.isArray(field.options)).toBe(true)
    expect(field.options.length).toBeGreaterThan(0)
    expect(field.options).toContain('Other')
  })
})

describe('validateFieldValue — select type', () => {
  it('accepts a value from the field\'s option list', () => {
    const result = validateFieldValue('industry', 'Beauty & Skincare')
    expect(result).toEqual({ valid: true, value: 'Beauty & Skincare' })
  })

  it('rejects a value not in the option list rather than silently accepting free text', () => {
    const result = validateFieldValue('industry', 'Not A Real Sector')
    expect(result.valid).toBe(false)
    expect(result.value).toBeNull()
  })

  it('treats an empty value as valid-but-unset, same as every other field type', () => {
    const result = validateFieldValue('industry', '')
    expect(result).toEqual({ valid: true, value: null })
  })
})

describe('validateFieldValue — revenue_target (number)', () => {
  it('accepts a positive number', () => {
    const result = validateFieldValue('revenue_target', '5000')
    expect(result).toEqual({ valid: true, value: 5000 })
  })

  it('rejects a non-numeric value', () => {
    const result = validateFieldValue('revenue_target', 'lots')
    expect(result.valid).toBe(false)
  })
})
