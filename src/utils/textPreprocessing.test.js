import { describe, expect, it } from 'vitest'
import { detectLanguage, extractHashtags, extractMentions, preprocessText } from './textPreprocessing'

describe('detectLanguage', () => {
  it('detects English from common function words', () => {
    expect(
      detectLanguage(
        'Just tried the new InsightAid dashboard demo and honestly the crisis detection alerts are a game changer for my small business.'
      )
    ).toBe('en')
  })

  it('detects Bahasa Melayu from common function words', () => {
    expect(
      detectLanguage('Penghantaran lambat minggu ni, harap boleh diperbaiki secepat mungkin sebab pelanggan dah mula merungut.')
    ).toBe('ms')
  })

  it('detects Mandarin from CJK script', () => {
    expect(detectLanguage('这个产品的包装设计很好看,但是价格对学生党来说有点贵。')).toBe('zh')
  })

  it('detects code-mixed Malay-English when both are present in comparable proportion', () => {
    expect(detectLanguage('This dashboard tu memang sangat helpful and boleh save a lot of time')).toBe('ms-en')
  })

  it('returns "unknown" for text with no recognizable function words, never a guess', () => {
    expect(detectLanguage('Serum Cleanser Toner')).toBe('unknown')
  })

  it('returns "unknown" for empty text', () => {
    expect(detectLanguage('')).toBe('unknown')
    expect(detectLanguage('   ')).toBe('unknown')
  })
})

describe('extractHashtags / extractMentions', () => {
  it('extracts hashtags', () => {
    expect(extractHashtags('Loving this #skincare #tiktokmademebuyit')).toEqual(['skincare', 'tiktokmademebuyit'])
  })

  it('extracts mentions', () => {
    expect(extractMentions('cc @insightaid @founder')).toEqual(['insightaid', 'founder'])
  })

  it('returns empty arrays when none are present', () => {
    expect(extractHashtags('plain text')).toEqual([])
    expect(extractMentions('plain text')).toEqual([])
  })
})

describe('preprocessText', () => {
  it('preserves the original raw text untouched', () => {
    const result = preprocessText('Check this out https://example.com/product soooo good!!')
    expect(result.rawText).toBe('Check this out https://example.com/product soooo good!!')
  })

  it('removes URLs from the cleaned text but flags hasUrl', () => {
    const result = preprocessText('Check this out https://example.com/product')
    expect(result.cleanedText).not.toContain('http')
    expect(result.hasUrl).toBe(true)
  })

  it('caps excessive repeated letters instead of erasing the emphasis entirely', () => {
    const result = preprocessText('This is soooooooo good')
    expect(result.cleanedText).toContain('sooo') // capped to 3 repeats, not collapsed to 1
    expect(result.cleanedText).not.toContain('soooooooo')
    expect(result.hasRepeatedChars).toBe(true)
  })

  it('strips a retweet prefix as a platform-specific symbol', () => {
    const result = preprocessText('RT @someuser: great product!')
    expect(result.cleanedText).toBe('great product!')
  })

  it('keeps hashtags and mentions in the cleaned text while also extracting them separately', () => {
    const result = preprocessText('Loving this #skincare from @brandname')
    expect(result.cleanedText).toContain('#skincare')
    expect(result.cleanedText).toContain('@brandname')
    expect(result.hashtags).toEqual(['skincare'])
    expect(result.mentions).toEqual(['brandname'])
  })

  it('detects language before cleaning removes evidence (URL-heavy Malay text)', () => {
    const result = preprocessText('Boleh check kat https://shopee.com.my/produk ni, memang sangat murah')
    expect(result.language).toBe('ms')
  })

  it('handles empty input without throwing', () => {
    const result = preprocessText('')
    expect(result.rawText).toBe('')
    expect(result.cleanedText).toBe('')
    expect(result.language).toBe('unknown')
  })

  it('handles null/undefined input without throwing', () => {
    expect(() => preprocessText(undefined)).not.toThrow()
    expect(() => preprocessText(null)).not.toThrow()
  })
})
