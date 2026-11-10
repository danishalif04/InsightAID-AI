import { describe, expect, it } from 'vitest'
import {
  MAX_TOOL_CALLS_PER_INVESTIGATION,
  TOOL_REGISTRY,
  validateToolCall,
  withinIterationLimit,
} from './agentToolRegistry'

describe('agentToolRegistry', () => {
  it('exposes exactly the one controlled tool for this foundation slice', () => {
    expect(Object.keys(TOOL_REGISTRY)).toEqual(['financial_summary'])
    expect(TOOL_REGISTRY.financial_summary.readOnly).toBe(true)
  })

  it('accepts a call to a known tool with no unexpected fields', () => {
    expect(validateToolCall('financial_summary', {})).toEqual({ valid: true, errors: [] })
  })

  it('rejects a call to an unregistered tool', () => {
    const result = validateToolCall('delete_everything')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/Unknown tool/)
  })

  it('rejects unexpected input fields for a zero-parameter tool', () => {
    const result = validateToolCall('financial_summary', { amount: 100 })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/Unexpected input field "amount"/)
  })

  it('enforces the iteration limit', () => {
    expect(MAX_TOOL_CALLS_PER_INVESTIGATION).toBe(1)
    expect(withinIterationLimit(0)).toBe(true)
    expect(withinIterationLimit(1)).toBe(false)
    expect(withinIterationLimit(2)).toBe(false)
  })
})
