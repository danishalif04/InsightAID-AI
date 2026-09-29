/**
 * Dataset upload validation (FYP2.md §35). Never mutates the input rows —
 * every issue is reported, none is silently fixed or dropped.
 */

import { CSV_TEMPLATES } from './csvTemplates'

const NUMERIC_COLUMNS = {
  sales: ['quantity_sold', 'unit_price', 'revenue', 'discount', 'cost'],
  reviews: ['rating'],
  social: ['engagement', 'likes', 'comments', 'shares'],
  product: ['price', 'cost', 'stock'],
  expenses: ['amount'],
}

const DATE_COLUMNS = {
  sales: ['date'],
  reviews: ['date'],
  social: ['date'],
  product: [],
  expenses: ['date'],
}

const NON_NEGATIVE_COLUMNS = {
  sales: ['quantity_sold', 'unit_price', 'revenue', 'cost'],
  reviews: ['rating'],
  social: ['engagement', 'likes', 'comments', 'shares'],
  product: ['price', 'cost', 'stock'],
  expenses: ['amount'],
}

const CATEGORY_COLUMNS = {
  sales: 'category',
  reviews: 'platform',
  social: 'platform',
  product: 'category',
  expenses: 'expense_category',
}

const isBlank = (value) => value === undefined || value === null || String(value).trim() === ''

/**
 * Picks the CSV_TEMPLATES entry whose column set best matches the uploaded
 * file's headers. Returns null (never a low-confidence guess) when nothing
 * overlaps at all.
 */
export function inferTemplateId(headers) {
  const headerSet = new Set(headers.map((header) => header.trim()))
  let best = null
  let bestScore = 0

  for (const template of CSV_TEMPLATES) {
    const overlap = template.columns.filter((column) => headerSet.has(column)).length
    if (overlap > bestScore) {
      bestScore = overlap
      best = template.id
    }
  }

  return bestScore > 0 ? best : null
}

/**
 * @param {string} templateId one of CSV_TEMPLATES' ids
 * @param {Array<Record<string,string>>} records parsed rows (string cells, as csvParser.parseCsv returns)
 * @returns {{templateId, rowCount, missingColumns, duplicateFlags, duplicateCount,
 *            missingValueCounts, invalidDateCount, invalidNumericCount, negativeCount,
 *            categoriesFound, checks: string[], warnings: string[], readyForProcessing: boolean}}
 */
export function validateDataset(templateId, records) {
  const template = CSV_TEMPLATES.find((item) => item.id === templateId)
  if (!template) {
    return {
      templateId,
      rowCount: 0,
      missingColumns: [],
      duplicateFlags: [],
      duplicateCount: 0,
      missingValueCounts: {},
      invalidDateCount: 0,
      invalidNumericCount: 0,
      negativeCount: 0,
      categoriesFound: [],
      checks: [],
      warnings: [`Unknown template "${templateId}".`],
      readyForProcessing: false,
    }
  }

  const checks = []
  const warnings = []
  const presentColumns = records.length > 0 ? Object.keys(records[0]) : []

  // File format / required columns
  const missingColumns = template.columns.filter((column) => !presentColumns.includes(column))
  if (missingColumns.length === 0) {
    checks.push(`All required columns detected (${template.columns.join(', ')}).`)
  } else {
    warnings.push(`Missing required column(s): ${missingColumns.join(', ')}.`)
  }
  checks.push(`${records.length} row(s) detected.`)

  // Missing values
  const missingValueCounts = {}
  for (const column of template.columns) {
    if (!presentColumns.includes(column)) continue
    const count = records.filter((row) => isBlank(row[column])).length
    if (count > 0) missingValueCounts[column] = count
  }
  Object.entries(missingValueCounts).forEach(([column, count]) => warnings.push(`${count} missing value(s) in "${column}".`))

  // Duplicate rows (exact match across the template's own columns)
  const seen = new Set()
  let duplicateCount = 0
  const duplicateFlags = records.map((row) => {
    const key = template.columns.map((column) => row[column] ?? '').join('|')
    if (seen.has(key)) {
      duplicateCount++
      return true
    }
    seen.add(key)
    return false
  })
  if (duplicateCount > 0) warnings.push(`${duplicateCount} duplicate row(s) detected (flagged, not removed).`)

  // Dates
  let invalidDateCount = 0
  for (const column of DATE_COLUMNS[templateId] ?? []) {
    if (!presentColumns.includes(column)) continue
    for (const row of records) {
      if (isBlank(row[column])) continue
      if (Number.isNaN(new Date(row[column]).getTime())) invalidDateCount++
    }
  }
  if (invalidDateCount > 0) warnings.push(`${invalidDateCount} invalid date value(s).`)

  // Numeric types
  let invalidNumericCount = 0
  for (const column of NUMERIC_COLUMNS[templateId] ?? []) {
    if (!presentColumns.includes(column)) continue
    for (const row of records) {
      if (isBlank(row[column])) continue
      if (!Number.isFinite(Number.parseFloat(row[column]))) invalidNumericCount++
    }
  }
  if (invalidNumericCount > 0) warnings.push(`${invalidNumericCount} invalid numeric value(s).`)

  // Negative values where inappropriate
  let negativeCount = 0
  for (const column of NON_NEGATIVE_COLUMNS[templateId] ?? []) {
    if (!presentColumns.includes(column)) continue
    for (const row of records) {
      const value = Number.parseFloat(row[column])
      if (Number.isFinite(value) && value < 0) negativeCount++
    }
  }
  if (negativeCount > 0) warnings.push(`${negativeCount} negative value(s) found in a field that shouldn't be negative.`)

  // Category consistency — reported, not judged (spelling/casing variants are for the user to review).
  const categoryColumn = CATEGORY_COLUMNS[templateId]
  const categoriesFound =
    categoryColumn && presentColumns.includes(categoryColumn)
      ? [...new Set(records.map((row) => row[categoryColumn]).filter((value) => !isBlank(value)))]
      : []
  if (categoriesFound.length > 0) {
    checks.push(`${categoriesFound.length} distinct value(s) found in "${categoryColumn}": ${categoriesFound.join(', ')}.`)
  }

  const readyForProcessing = missingColumns.length === 0 && records.length > 0

  return {
    templateId,
    rowCount: records.length,
    missingColumns,
    duplicateFlags,
    duplicateCount,
    missingValueCounts,
    invalidDateCount,
    invalidNumericCount,
    negativeCount,
    categoriesFound,
    checks,
    warnings,
    readyForProcessing,
  }
}
