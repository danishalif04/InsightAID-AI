/**
 * Real report exports (FYP2.md §70 — PDF first, then CSV). Both work from
 * the exact same report object src/utils/reportBuilders.js produces — no
 * separate "export data" is assembled, so what you see is what exports.
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

/** Builds the jsPDF document without saving it — the testable half (mirrors
 * csvExport.js's rowsToCsv/downloadCsv split). exportReportPdf() below is
 * just this + the browser-download side effect. */
export function buildReportPdfDoc(report) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginLeft = 14
  let y = 15

  doc.setFontSize(16)
  doc.text(report.title, marginLeft, y)
  y += 7
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Generated ${new Date(report.generatedAt).toLocaleString()} · Mode: ${report.mode}`, marginLeft, y)
  doc.setTextColor(0)
  y += 8

  for (const section of report.sections) {
    if (y > 265) {
      doc.addPage()
      y = 15
    }

    doc.setFontSize(13)
    doc.text(section.title, marginLeft, y)
    y += 4

    if (section.narrative) {
      doc.setFontSize(10)
      const lines = doc.splitTextToSize(section.narrative, pageWidth - marginLeft * 2)
      doc.text(lines, marginLeft, y + 5)
      y += 5 + lines.length * 5
    }

    if (section.actual.length > 0) {
      autoTable(doc, {
        startY: y + 3,
        head: [['ACTUAL DATA', '']],
        body: section.actual.map((p) => [String(p.label), String(p.value)]),
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] },
        margin: { left: marginLeft, right: marginLeft },
        styles: { fontSize: 9 },
      })
      y = doc.lastAutoTable.finalY + 3
    }

    if (section.scenario.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['SCENARIO / ESTIMATED DATA', '']],
        body: section.scenario.map((p) => [String(p.label), String(p.value)]),
        theme: 'striped',
        headStyles: { fillColor: [217, 119, 6] },
        margin: { left: marginLeft, right: marginLeft },
        styles: { fontSize: 9 },
      })
      y = doc.lastAutoTable.finalY + 3
    }

    if (section.note) {
      doc.setFontSize(9)
      doc.setTextColor(120)
      const noteLines = doc.splitTextToSize(section.note, pageWidth - marginLeft * 2)
      doc.text(noteLines, marginLeft, y + 4)
      y += 4 + noteLines.length * 4
      doc.setTextColor(0)
    }

    y += 6
  }

  return doc
}

export function exportReportPdf(report) {
  const doc = buildReportPdfDoc(report)
  doc.save(`${slug(report.title)}.pdf`)
}
