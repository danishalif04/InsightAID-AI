import { describe, expect, it } from 'vitest'
import { resolveSvgExportSize } from './chartExport'

function fakeSvg({ rect = null, viewBox = null } = {}) {
  return {
    getBoundingClientRect: rect ? () => rect : undefined,
    viewBox: viewBox ? { baseVal: viewBox } : undefined,
  }
}

describe('resolveSvgExportSize', () => {
  it('prefers the live measured bounding box', () => {
    const svg = fakeSvg({ rect: { width: 640, height: 320 }, viewBox: { width: 100, height: 50 } })
    expect(resolveSvgExportSize(svg)).toEqual({ width: 640, height: 320 })
  })

  it('falls back to the viewBox when there is no measured size (e.g. a hidden tab)', () => {
    const svg = fakeSvg({ rect: { width: 0, height: 0 }, viewBox: { width: 500, height: 250 } })
    expect(resolveSvgExportSize(svg)).toEqual({ width: 500, height: 250 })
  })

  it('falls back to a safe default when neither is available', () => {
    const svg = fakeSvg({ rect: { width: 0, height: 0 } })
    expect(resolveSvgExportSize(svg)).toEqual({ width: 800, height: 400 })
  })
})
