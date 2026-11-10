/**
 * Real report exports (FYP2.md §70 — PDF first, then CSV). Both work from
 * the exact same report object src/utils/reportBuilders.js produces — no
 * separate "export data" is assembled, so what you see is what exports.
 *
 * PDF layout (this version): a two-column "deal-memo" style format per an
 * explicit user request to follow a reference document's structure —
 * header with a logo/wordmark, a narrow right-hand "Summary"/overview
 * sidebar of label/value facts, and a wider left-hand main column with a
 * Description (the report's own executive-summary narrative), an
 * optional real forecast chart, and the rest of the report's sections as
 * narrative + ACTUAL/SCENARIO tables. Every value still comes from the
 * `report` object already built by reportBuilders.js — this file only
 * ever FORMATS, never computes or invents a number (same rule as before).
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { downloadCsv } from './csvExport'

function slug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** One flat row per data point, tagged ACTUAL / SCENARIO-ESTIMATED /
 * NARRATIVE — the CSV equivalent of the PDF's separate, labeled tables. */
export function buildReportCsvRows(report) {
  const rows = []
  for (const section of report.sections) {
    for (const p of section.actual) rows.push({ section: section.title, type: 'ACTUAL', label: p.label, value: p.value })
    for (const p of section.scenario) rows.push({ section: section.title, type: 'SCENARIO/ESTIMATED', label: p.label, value: p.value })
    if (section.narrative) rows.push({ section: section.title, type: 'NARRATIVE', label: '', value: section.narrative })
    if (section.note) rows.push({ section: section.title, type: 'NOTE', label: '', value: section.note })
  }
  return rows
}

export function exportReportCsv(report) {
  downloadCsv(`${slug(report.title)}.csv`, buildReportCsvRows(report))
}

const PAGE_MARGIN = 14
const SIDEBAR_WIDTH = 58
const COLUMN_GAP = 8
const BRAND_GREEN = [22, 163, 74]
const CONTENT_BOTTOM = 270

/** `field_name` -> `Field name` — a pure display transform of the same
 * real field key splitByProvenance (reportBuilders.js) already produced;
 * never changes which value it's attached to. */
function humanizeLabel(label) {
  const text = String(label).replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function drawWatermark(doc) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.saveGraphicsState()
  doc.setGState(new doc.GState({ opacity: 0.08 }))
  doc.setFontSize(34)
  doc.setTextColor(16, 24, 20)
  doc.text('INSIGHTAID AI - FYP DEMONSTRATION', pageWidth / 2, pageHeight / 2, {
    angle: 45,
    align: 'center',
  })
  doc.restoreGraphicsState()
}

function drawHeader(doc, report) {
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(16)
  doc.setTextColor(0)
  doc.text(report.title, PAGE_MARGIN, 18)
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Generated ${new Date(report.generatedAt).toLocaleString()} · Mode: ${report.mode}`, PAGE_MARGIN, 24)

  // Wordmark, top-right — text-based (no logo image asset exists for this
  // yet), bold brand green, right-aligned to the page margin.
  doc.setFontSize(13)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(...BRAND_GREEN)
  doc.text('InsightAid AI', pageWidth - PAGE_MARGIN, 18, { align: 'right' })
  doc.setFont(undefined, 'normal')
  doc.setTextColor(0)

  doc.setDrawColor(220)
  doc.line(PAGE_MARGIN, 28, pageWidth - PAGE_MARGIN, 28)
  return 36
}

/** Thin-rule label/bold-value pairs — the reference's Summary/Overview
 * sidebar boxes. Returns the Y position after the box. */
function drawFactBox(doc, { title, facts, x, width, y }) {
  if (facts.length === 0) return y

  doc.setFontSize(9)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(...BRAND_GREEN)
  doc.text(title.toUpperCase(), x, y)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(0)
  let cursor = y + 5

  for (const fact of facts) {
    const labelLines = doc.splitTextToSize(fact.label, width)
    doc.setFontSize(7.5)
    doc.setTextColor(120)
    doc.text(labelLines, x, cursor)
    cursor += labelLines.length * 3.2 + 1

    const valueLines = doc.splitTextToSize(String(fact.value), width)
    doc.setFontSize(9.5)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(0)
    doc.text(valueLines, x, cursor)
    doc.setFont(undefined, 'normal')
    cursor += valueLines.length * 4 + 2

    doc.setDrawColor(230)
    doc.line(x, cursor, x + width, cursor)
    cursor += 4
  }

  return cursor + 2
}

/** Parses the real `RM12,345`-shaped scenario points salesForecastSection
 * (reportBuilders.js) produces back into {date, value} numbers for
 * charting — never invents a point; a value that doesn't parse (e.g.
 * 'n/a') is simply dropped, same honesty rule as everywhere else. */
function extractForecastSeries(section) {
  if (!section || section.id !== 'sales_forecast') return []
  return (section.scenario ?? [])
    .map((p) => {
      const match = /RM([\d,]+)/.exec(String(p.value))
      if (!match) return null
      const value = Number.parseFloat(match[1].replace(/,/g, ''))
      return Number.isFinite(value) ? { date: p.label, value } : null
    })
    .filter(Boolean)
}

/** Renders a simple real line chart to a PNG data URL via a plain Canvas
 * 2D context — no new chart-library dependency for one PDF-only chart.
 * Returns null (never throws) when no DOM/canvas is available (e.g. a
 * Node/test environment) or the series is too short to plot — the caller
 * falls back to the existing ACTUAL/SCENARIO tables either way, so no
 * data is ever lost by skipping this. */
function renderForecastChartDataUrl(series) {
  if (series.length < 2) return null
  if (typeof document === 'undefined') return null

  try {
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 380
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const padding = 50
    const w = canvas.width - padding * 2
    const h = canvas.height - padding * 2
    const values = series.map((p) => p.value)
    const min = Math.min(...values, 0)
    const max = Math.max(...values)
    const range = max - min || 1

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Axes
    ctx.strokeStyle = '#cccccc'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, padding + h)
    ctx.lineTo(padding + w, padding + h)
    ctx.stroke()

    // Line
    ctx.strokeStyle = '#16a34a'
    ctx.lineWidth = 3
    ctx.beginPath()
    series.forEach((point, index) => {
      const x = padding + (index / (series.length - 1)) * w
      const y = padding + h - ((point.value - min) / range) * h
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Points
    ctx.fillStyle = '#16a34a'
    series.forEach((point, index) => {
      const x = padding + (index / (series.length - 1)) * w
      const y = padding + h - ((point.value - min) / range) * h
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    })

    // First/last date labels only, to keep this simple and legible
    ctx.fillStyle = '#555555'
    ctx.font = '16px sans-serif'
    ctx.fillText(series[0].date, padding, padding + h + 24)
    ctx.textAlign = 'right'
    ctx.fillText(series[series.length - 1].date, padding + w, padding + h + 24)
    ctx.textAlign = 'left'

    return canvas.toDataURL('image/png')
  } catch {
    // Any canvas/DOM failure degrades to "no chart," never a broken PDF.
    return null
  }
}

/** Renders one section's narrative + ACTUAL/SCENARIO tables into the main
 * column at `x`/`width`, returning the new Y and a page-tracking object
 * mutated in place so callers share pagination state. */
function drawSection(doc, section, { x, width, y }) {
  let cursor = y
  if (cursor > CONTENT_BOTTOM) {
    doc.addPage()
    cursor = 15
  }

  doc.setFontSize(12)
  doc.setTextColor(0)
  doc.text(section.title, x, cursor)
  cursor += 4

  if (section.narrative) {
    doc.setFontSize(9.5)
    const lines = doc.splitTextToSize(section.narrative, width)
    doc.text(lines, x, cursor + 5)
    cursor += 5 + lines.length * 4.5
  }

  if (section.actual.length > 0) {
    autoTable(doc, {
      startY: cursor + 3,
      head: [['ACTUAL DATA', '']],
      body: section.actual.map((p) => [String(p.label), String(p.value)]),
      theme: 'striped',
      headStyles: { fillColor: BRAND_GREEN },
      margin: { left: x, right: doc.internal.pageSize.getWidth() - x - width },
      tableWidth: width,
      styles: { fontSize: 8.5 },
    })
    cursor = doc.lastAutoTable.finalY + 3
  }

  if (section.scenario.length > 0) {
    autoTable(doc, {
      startY: cursor,
      head: [['SCENARIO / ESTIMATED DATA', '']],
      body: section.scenario.map((p) => [String(p.label), String(p.value)]),
      theme: 'striped',
      headStyles: { fillColor: [217, 119, 6] },
      margin: { left: x, right: doc.internal.pageSize.getWidth() - x - width },
      tableWidth: width,
      styles: { fontSize: 8.5 },
    })
    cursor = doc.lastAutoTable.finalY + 3
  }

  if (section.note) {
    doc.setFontSize(8.5)
    doc.setTextColor(120)
    const noteLines = doc.splitTextToSize(section.note, width)
    doc.text(noteLines, x, cursor + 4)
    cursor += 4 + noteLines.length * 4
    doc.setTextColor(0)
  }

  return cursor + 6
}

/** Builds the jsPDF document without saving it — the testable half (mirrors
 * csvExport.js's rowsToCsv/downloadCsv split). exportReportPdf() below is
 * just this + the browser-download side effect. */
export function buildReportPdfDoc(report) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  const sections = report.sections ?? []
  const descriptionSection = sections.find((s) => s.id === 'executive_summary') ?? null
  const profileSection = sections.find((s) => s.id === 'business_profile') ?? null
  const overviewSection =
    sections.find((s) => s.id === 'key_findings' && (s.actual.length > 0 || s.scenario.length > 0)) ??
    sections.find(
      (s) => s.id !== 'business_profile' && s.id !== 'executive_summary' && (s.actual.length > 0 || s.scenario.length > 0)
    ) ??
    null

  const usedSidebarIds = new Set([profileSection?.id, overviewSection?.id, descriptionSection?.id].filter(Boolean))
  const mainSections = sections.filter((s) => !usedSidebarIds.has(s.id))

  const mainX = PAGE_MARGIN
  const mainWidth = pageWidth - PAGE_MARGIN * 2 - SIDEBAR_WIDTH - COLUMN_GAP
  const sidebarX = mainX + mainWidth + COLUMN_GAP

  let topY = drawHeader(doc, report)

  // Sidebar — a fixed "fact sheet" on page 1 only, same as the reference's
  // Summary/Overview boxes (they don't continue across pages).
  let sidebarY = topY
  if (profileSection) {
    const facts = [...profileSection.actual, ...profileSection.scenario]
      .slice(0, 6)
      .map((p) => ({ label: humanizeLabel(p.label), value: p.value }))
    sidebarY = drawFactBox(doc, { title: 'Summary', facts, x: sidebarX, width: SIDEBAR_WIDTH, y: sidebarY })
  }
  if (overviewSection) {
    const facts = [...overviewSection.actual, ...overviewSection.scenario].slice(0, 6)
    drawFactBox(doc, { title: overviewSection.title, facts, x: sidebarX, width: SIDEBAR_WIDTH, y: sidebarY })
  }

  // Main column
  let mainY = topY
  if (descriptionSection?.narrative) {
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text('Description', mainX, mainY)
    mainY += 4
    doc.setFontSize(9.5)
    const lines = doc.splitTextToSize(descriptionSection.narrative, mainWidth)
    doc.text(lines, mainX, mainY + 5)
    mainY += 5 + lines.length * 4.5 + 6
  }

  const forecastSection = sections.find((s) => s.id === 'sales_forecast')
  const forecastSeries = extractForecastSeries(forecastSection)
  const chartDataUrl = renderForecastChartDataUrl(forecastSeries)
  if (chartDataUrl) {
    if (mainY > CONTENT_BOTTOM - 60) {
      doc.addPage()
      mainY = 15
    }
    doc.setFontSize(12)
    doc.text('Forecast Chart', mainX, mainY)
    mainY += 4
    const chartHeight = (mainWidth * 380) / 900
    doc.addImage(chartDataUrl, 'PNG', mainX, mainY, mainWidth, chartHeight)
    mainY += chartHeight + 6
  }

  for (const section of mainSections) {
    mainY = drawSection(doc, section, { x: mainX, width: mainWidth, y: mainY })
  }

  for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
    doc.setPage(page)
    drawWatermark(doc)
  }

  return doc
}

export function exportReportPdf(report) {
  const doc = buildReportPdfDoc(report)
  doc.save(`${slug(report.title)}.pdf`)
}
