import { describe, expect, it } from 'vitest'
import { calculateCapabilities, CAPABILITY_RULES } from './capabilityMapping'

const readinessWithMet = (metIds) => ({
  checklist: ['business_plan', 'sales', 'reviews', 'social', 'historical'].map((id) => ({ id, met: metIds.includes(id) })),
})

describe('capabilityMapping', () => {
  it('marks every capability unavailable when nothing is met', () => {
    const result = calculateCapabilities(readinessWithMet([]))
    expect(result).toHaveLength(CAPABILITY_RULES.length)
    expect(result.every((row) => row.available === false)).toBe(true)
  })

  it('marks only the capability tied to a met checklist item as available', () => {
    const result = calculateCapabilities(readinessWithMet(['business_plan']))
    expect(result.find((row) => row.capability.includes('break-even')).available).toBe(true)
    expect(result.find((row) => row.capability === 'Sales trend analysis').available).toBe(false)
  })

  it('handles an empty/missing readiness object without throwing', () => {
    expect(calculateCapabilities({})).toHaveLength(CAPABILITY_RULES.length)
    expect(calculateCapabilities(undefined)).toHaveLength(CAPABILITY_RULES.length)
  })
})
