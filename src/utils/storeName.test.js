import { describe, expect, it } from 'vitest'
import { resolveStoreName } from './storeName'

describe('resolveStoreName', () => {
  it('Business Startup shows the business profile name', () => {
    expect(resolveStoreName({ mode: 'ecommerce', profileName: 'Embun Botanica', localShopName: 'Kedai Makmur' })).toBe('Embun Botanica')
  })

  it('Local Shop prefers the loaded shop name', () => {
    expect(resolveStoreName({ mode: 'startup', profileName: 'My Profile', localShopName: 'Kedai Makmur' })).toBe('Kedai Makmur')
  })

  it('Local Shop falls back to the profile name when no shop is loaded', () => {
    expect(resolveStoreName({ mode: 'startup', profileName: 'Kopitiam Ali', localShopName: null })).toBe('Kopitiam Ali')
  })

  it('trims whitespace and treats blank names as missing', () => {
    expect(resolveStoreName({ mode: 'ecommerce', profileName: '  Embun Botanica  ' })).toBe('Embun Botanica')
    expect(resolveStoreName({ mode: 'startup', profileName: '   ', localShopName: '' })).toBeNull()
  })

  it('returns null rather than a placeholder when nothing is set', () => {
    expect(resolveStoreName({ mode: 'ecommerce' })).toBeNull()
    expect(resolveStoreName({ mode: 'startup', profileName: 42, localShopName: undefined })).toBeNull()
  })
})
