import { describe, expect, it } from 'vitest'
import { LOCAL_SHOP_COMPLAINT_THEMES, MODE_DETAILS, getModeDetails } from './modesConfig'

describe('modesConfig', () => {
  it('defines details for both existing mode ids, startup and ecommerce', () => {
    expect(Object.keys(MODE_DETAILS).sort()).toEqual(['ecommerce', 'startup'])
  })

  it('getModeDetails falls back to ecommerce for an unknown id, never throwing', () => {
    expect(getModeDetails('unknown')).toBe(MODE_DETAILS.ecommerce)
  })

  it('getModeDetails returns the real entry for a known id', () => {
    expect(getModeDetails('startup')).toBe(MODE_DETAILS.startup)
    expect(getModeDetails('startup').defaultLanguage).toBe('ms')
  })

  it('startup mode prioritizes the 4 outputs the master prompt names, in order', () => {
    const ids = MODE_DETAILS.startup.prioritizedOutputs.map((o) => o.id)
    expect(ids).toEqual(['weekly_sales_vs_forecast', 'top_complaint_themes', 'festive_preparation', 'simple_stock_advice'])
  })

  it('local shop complaint themes cover all 4 named in the master prompt', () => {
    expect(Object.keys(LOCAL_SHOP_COMPLAINT_THEMES).sort()).toEqual(['harga', 'kebersihan', 'masa_menunggu', 'servis'])
  })
})
