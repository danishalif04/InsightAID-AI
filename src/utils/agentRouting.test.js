import { describe, expect, it } from 'vitest'
import { AGENTS, routeQuestion } from './agentRouting'

describe('routeQuestion', () => {
  it('routes a sales/forecast question to the Financial Planning Agent', () => {
    expect(routeQuestion('What will my revenue look like next month?')).toEqual(AGENTS.financial)
  })

  it('routes a sentiment/review question to the Business Monitoring Agent', () => {
    expect(routeQuestion('Why are customers leaving bad reviews?')).toEqual(AGENTS.monitoring)
  })

  it('routes a crisis/risk question to the Risk Monitoring Agent', () => {
    expect(routeQuestion('Is my business at risk of a crisis right now?')).toEqual(AGENTS.risk)
  })

  it('routes a recommendation question to the Growth Strategy Agent', () => {
    expect(routeQuestion('What should I do to grow my business?')).toEqual(AGENTS.growth)
  })

  it('falls back to the Business Advisor Agent when nothing matches', () => {
    expect(routeQuestion('Tell me something interesting.')).toEqual(AGENTS.general)
  })

  it('prefers risk over financial when a question mentions both (checked first, more urgent)', () => {
    expect(routeQuestion('Will this sales dip turn into a crisis?')).toEqual(AGENTS.risk)
  })

  it('is case-insensitive and handles empty/missing input without throwing', () => {
    expect(routeQuestion('REVENUE FORECAST PLEASE')).toEqual(AGENTS.financial)
    expect(routeQuestion('')).toEqual(AGENTS.general)
    expect(routeQuestion(undefined)).toEqual(AGENTS.general)
  })
})
