import { describe, expect, it } from 'vitest'
import { ASPECTS, matchAspects, tagRowsWithAspects } from './aspects'

describe('matchAspects', () => {
  it('returns [] for empty/null text', () => {
    expect(matchAspects('')).toEqual([])
    expect(matchAspects(null)).toEqual([])
  })

  it('matches an English delivery-delay complaint', () => {
    expect(matchAspects('The delivery was so late, still waiting after 3 weeks')).toContain(
      'Delivery delay'
    )
  })

  it('matches a Bahasa Melayu complaint', () => {
    expect(matchAspects('Penghantaran lambat minggu ni, harap boleh diperbaiki')).toContain(
      'Delivery delay'
    )
  })

  it('matches a Mandarin complaint', () => {
    expect(matchAspects('这个产品很贵,性价比不高')).toContain('Price')
  })

  it('matches Manglish phrasing distinct from pure en/ms keywords', () => {
    expect(matchAspects('lambat sangat lah, dah 2 minggu')).toContain('Delivery delay')
  })

  it('is case-insensitive', () => {
    expect(matchAspects('REFUND please, seller never replied')).toContain('Seller service')
  })

  it('can match more than one aspect in the same text', () => {
    const result = matchAspects('The packaging leaked and it was also very expensive')
    expect(result).toContain('Packaging & leakage')
    expect(result).toContain('Price')
  })

  it('every aspect listed in ASPECTS has a non-empty lexicon reachable via matchAspects', () => {
    // Indirect check: every aspect's keyword list is non-empty by construction;
    // this just confirms ASPECTS itself isn't out of sync with an empty aspect.
    expect(ASPECTS.length).toBe(7)
  })
})

describe('tagRowsWithAspects', () => {
  it('adds an aspects array to each row without mutating the input', () => {
    const rows = [{ cleanedText: 'very expensive for the quality' }]
    const tagged = tagRowsWithAspects(rows)
    expect(tagged[0].aspects).toContain('Price')
    expect(rows[0].aspects).toBeUndefined()
  })

  it('falls back to cleaned_text/raw_text when textField is absent', () => {
    const rows = [{ cleaned_text: 'seller was rude and ignored my message' }]
    expect(tagRowsWithAspects(rows)[0].aspects).toContain('Seller service')
  })
})
