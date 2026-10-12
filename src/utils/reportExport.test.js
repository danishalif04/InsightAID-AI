import { describe, expect, it } from 'vitest'
import { buildReportCsvRows, buildReportPdfDoc } from './reportExport'

function sampleReport() {
  return {
    title: 'Business Health Report',
    type: 'business_health',
    mode: 'startup',
    generatedAt: '2026-03-01T00:00:00.000Z',
    sections: [
      {
        id: 'business_profile',
        title: 'Business Profile',
        actual: [{ label: 'business_name', value: 'Acme' }],
        scenario: [{ label: 'expected_growth_rate', value: 40 }],
        narrative: 'Acme is a growth-stage business.',
        note: null,
      },
      {
        id: 'assumptions_limitations',
        title: 'Assumptions and Limitations',
        actual: [{ label: '1', value: 'No sentiment model has been trained yet.' }],
        scenario: [],
        narrative: null,
        note: null,
      },
    ],
  }
}

describe('buildReportCsvRows', () => {
  it('tags every data point with its section and ACTUAL/SCENARIO type', () => {
    const rows = buildReportCsvRows(sampleReport())
    const actualRow = rows.find((r) => r.label === 'business_name')
    const scenarioRow = rows.find((r) => r.label === 'expected_growth_rate')
    expect(actualRow.type).toBe('ACTUAL')
    expect(scenarioRow.type).toBe('SCENARIO/ESTIMATED')
    expect(actualRow.section).toBe('Business Profile')
  })

  it('includes narrative rows when present', () => {
    const rows = buildReportCsvRows(sampleReport())
    const narrativeRow = rows.find((r) => r.type === 'NARRATIVE')
    expect(narrativeRow.value).toBe('Acme is a growth-stage business.')
  })

  it('never mixes actual and scenario values in the same row', () => {
    const rows = buildReportCsvRows(sampleReport())
    for (const row of rows) {
      expect(['ACTUAL', 'SCENARIO/ESTIMATED', 'NARRATIVE', 'NOTE']).toContain(row.type)
    }
  })
})

describe('buildReportPdfDoc', () => {
  it('produces a real, non-empty PDF document without throwing', () => {
    const doc = buildReportPdfDoc(sampleReport())
    const buffer = doc.output('arraybuffer')
    expect(buffer.byteLength).toBeGreaterThan(500)
  })

  it('handles a report with many sections by adding pages as needed', () => {
    const manySections = Array.from({ length: 20 }, (_, i) => ({
      id: `s${i}`,
      title: `Section ${i}`,
      actual: [{ label: 'metric', value: i }],
      scenario: [],
      narrative: null,
      note: null,
    }))
    const doc = buildReportPdfDoc({ ...sampleReport(), sections: manySections })
    expect(doc.getNumberOfPages()).toBeGreaterThan(1)
  })

  it('handles an empty-sections report without throwing', () => {
    expect(() => buildReportPdfDoc({ ...sampleReport(), sections: [] })).not.toThrow()
  })
})
