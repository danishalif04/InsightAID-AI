/**
 * Data readiness indicator (FYP2.md §32) — "a system readiness indicator...
 * not a scientifically validated score." Computed from signals this app
 * actually owns end-to-end (business profile/assumptions completeness from
 * Part 1). Counts passed in as `null` mean "not yet knowable" (e.g. the
 * dataset_imports/sentiment_posts tables aren't deployed yet) and are
 * treated as not-met — never a fabricated checkmark.
 */

import { calculateCompleteness } from './businessProfileSchema'

export const READINESS_LEVELS = [
  { level: 1, label: 'No Data' },
  { level: 2, label: 'Basic Data' },
  { level: 3, label: 'Operational Data' },
  { level: 4, label: 'Customer Intelligence' },
  { level: 5, label: 'Full Analytics' },
]

/**
 * @param {object} params
 * @param {object} [params.values] flat business_profiles + business_assumptions values
 * @param {number|null} [params.salesRecordsCount] null = unknown/unavailable
 * @param {number|null} [params.reviewsCount]
 * @param {number|null} [params.socialRecordsCount]
 * @param {number|null} [params.historicalMonthsCount]
 */
export function calculateReadiness({
  values = {},
  salesRecordsCount = null,
  reviewsCount = null,
  socialRecordsCount = null,
  historicalMonthsCount = null,
} = {}) {
  const { percent: profileCompleteness } = calculateCompleteness(values)

  const checklist = [
    { id: 'business_plan', label: 'Business Profile & Assumptions', met: profileCompleteness >= 50 },
    { id: 'sales', label: 'Sales Data', met: (salesRecordsCount ?? 0) > 0 },
    { id: 'reviews', label: 'Customer Reviews', met: (reviewsCount ?? 0) > 0 },
    { id: 'social', label: 'Social Data', met: (socialRecordsCount ?? 0) > 0 },
    { id: 'historical', label: 'Historical Data (3+ months)', met: (historicalMonthsCount ?? 0) >= 3 },
  ]

  const metCount = checklist.filter((item) => item.met).length
  const percent = Math.round((metCount / checklist.length) * 100)
  const level = Math.min(READINESS_LEVELS.length, metCount + 1)

  return { level, levelLabel: READINESS_LEVELS[level - 1].label, percent, checklist }
}
