import { describe, expect, it } from 'vitest'
import { MODES } from '@/constants/modes'
import { isGroupVisibleInMode, visibleGroupsForMode } from './navVisibility'

const LOCAL_SHOP_GROUP = { label: 'Local Shop', modes: ['startup'] }
const ALWAYS = { label: 'Insights' }

// The ids are inverted relative to their labels, so these tests assert the
// LABEL a pathway shows, not just its id. Anyone who "corrects" the id in
// TopNav/MobileNavSheet to the one that reads correctly will fail here.
const LOCAL_SHOP_MODE = Object.values(MODES).find((m) => m.label === 'Malaysian Local Shop')
const BUSINESS_STARTUP_MODE = Object.values(MODES).find((m) => m.label === 'Business Startup')

describe('mode ids are the inverted ones this rule depends on', () => {
  it('"Malaysian Local Shop" is the id "startup"', () => {
    expect(LOCAL_SHOP_MODE?.id).toBe('startup')
  })

  it('"Business Startup" is the id "ecommerce"', () => {
    expect(BUSINESS_STARTUP_MODE?.id).toBe('ecommerce')
  })
})

describe('isGroupVisibleInMode', () => {
  it('shows the Local Shop group in the Malaysian Local Shop pathway', () => {
    expect(isGroupVisibleInMode(LOCAL_SHOP_GROUP, LOCAL_SHOP_MODE.id)).toBe(true)
  })

  it('HIDES the Local Shop group in the Business Startup pathway', () => {
    expect(isGroupVisibleInMode(LOCAL_SHOP_GROUP, BUSINESS_STARTUP_MODE.id)).toBe(false)
  })

  it('shows a group with no modes list in every pathway', () => {
    for (const mode of Object.values(MODES)) {
      expect(isGroupVisibleInMode(ALWAYS, mode.id)).toBe(true)
    }
  })

  it('treats an unknown mode as showing only the unrestricted groups', () => {
    expect(isGroupVisibleInMode(ALWAYS, 'nonsense')).toBe(true)
    expect(isGroupVisibleInMode(LOCAL_SHOP_GROUP, 'nonsense')).toBe(false)
  })

  it('does not throw on a missing group', () => {
    expect(isGroupVisibleInMode(undefined, 'startup')).toBe(true)
  })
})

describe('visibleGroupsForMode', () => {
  const GROUPS = [
    { label: 'Overview' },
    LOCAL_SHOP_GROUP,
    { label: 'Insights' },
    { label: 'Intelligence' },
    { label: 'Data' },
  ]

  it('Business Startup sees four groups, without Local Shop', () => {
    const labels = visibleGroupsForMode(GROUPS, BUSINESS_STARTUP_MODE.id).map((g) => g.label)
    expect(labels).toEqual(['Overview', 'Insights', 'Intelligence', 'Data'])
    expect(labels).not.toContain('Local Shop')
  })

  it('Malaysian Local Shop sees all five, in order', () => {
    const labels = visibleGroupsForMode(GROUPS, LOCAL_SHOP_MODE.id).map((g) => g.label)
    expect(labels).toEqual(['Overview', 'Local Shop', 'Insights', 'Intelligence', 'Data'])
  })

  it('returns an empty list rather than throwing on no groups', () => {
    expect(visibleGroupsForMode(undefined, 'startup')).toEqual([])
  })
})
