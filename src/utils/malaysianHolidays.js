/**
 * Malaysian holiday/event calendar (FYP II Phase 1) — pure lookups over
 * src/data/malaysianHolidays.json, which is GENERATED, not hand-written
 * (see scripts/export_malaysian_holidays.py and
 * ml/forecasting/src/malaysian_holidays.py — the real, library-computed
 * source of truth for lunar-calendar dates). No date math happens in this
 * file; it only filters/indexes what was already computed, so the
 * frontend's chart annotations can never drift from what Prophet (Phase 4)
 * will actually use.
 */
import holidaysData from '@/data/malaysianHolidays.json'

/** @typedef {{date: string, name: string, category: string, source: string}} MalaysianHolidayEvent */

/** Every event, sorted by date (the generated file already is, but never
 * assume an imported JSON's ordering without saying so). */
export function getAllMalaysianHolidays() {
  return [...holidaysData].sort((a, b) => a.date.localeCompare(b.date))
}

/** Events within [startDate, endDate] inclusive, both 'YYYY-MM-DD'. Used
 * to annotate a chart's visible date range without scanning the whole
 * multi-year calendar on every render. */
export function getMalaysianHolidaysInRange(startDate, endDate) {
  if (!startDate || !endDate) return []
  return getAllMalaysianHolidays().filter((event) => event.date >= startDate && event.date <= endDate)
}

/** One category at a time (e.g. 'public_holiday', 'ecommerce_campaign',
 * 'payday', 'ramadan_derived') — see malaysian_holidays.py's module
 * docstring for what each category means and where its date came from. */
export function getMalaysianHolidaysByCategory(category) {
  return getAllMalaysianHolidays().filter((event) => event.category === category)
}

/** The single event on an exact date, or null — never guesses a holiday
 * for a date the generated calendar doesn't cover (e.g. outside the
 * exported year range; re-run scripts/export_malaysian_holidays.py to
 * extend it rather than inferring one here). */
export function getMalaysianHolidayOnDate(isoDate) {
  return getAllMalaysianHolidays().find((event) => event.date === isoDate) ?? null
}
