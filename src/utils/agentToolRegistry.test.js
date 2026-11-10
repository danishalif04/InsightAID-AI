import { describe, expect, it } from 'vitest'
import {
  MAX_TOOL_CALLS_PER_INVESTIGATION,
  TOOL_REGISTRY,
  validateToolCall,
  withinIterationLimit,
} from './agentToolRegistry'

describe('agentToolRegistry', () => {
  it('exposes exactly the controlled tools for this foundation slice', () => {
    expect(Object.keys(TOOL_REGISTRY)).toEqual(['financial_summary', 'startup_capital_summary', 'simulate_price_change'])
    expect(TOOL_REGISTRY.financial_summary.readOnly).toBe(true)
    expect(TOOL_REGISTRY.startup_capital_summary.readOnly).toBe(true)
    expect(TOOL_REGISTRY.simulate_price_change.readOnly).toBe(true)
  })

  it('accepts a call to a zero-parameter tool with no fields', () => {
    expect(validateToolCall('financial_summary', {})).toEqual({ valid: true, errors: [] })
    expect(validateToolCall('startup_capital_summary', {})).toEqual({ valid: true, errors: [] })
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

  it('accepts a valid call to simulate_price_change', () => {
    expect(validateToolCall('simulate_price_change', { new_selling_price: 9 })).toEqual({ valid: true, errors: [] })
  })

  it('rejects simulate_price_change when the required field is missing', () => {
    const result = validateToolCall('simulate_price_change', {})
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/Missing required input field "new_selling_price"/)
  })

  it('rejects simulate_price_change when the field is not a finite number', () => {
    const result = validateToolCall('simulate_price_change', { new_selling_price: 'nine' })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatch(/must be a finite number/)
  })

  it('enforces the iteration limit', () => {
    expect(MAX_TOOL_CALLS_PER_INVESTIGATION).toBe(1)
    expect(withinIterationLimit(0)).toBe(true)
    expect(withinIterationLimit(1)).toBe(false)
    expect(withinIterationLimit(2)).toBe(false)
  })
})
