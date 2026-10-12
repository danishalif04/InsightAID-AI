/**
 * Recommendation rule engine thresholds (FYP2.md §54, §56). Kept in one
 * file for the same reason as src/config/crisisThresholds.js — change a
 * number here, not inside src/utils/recommendationRules.js.
 */

export const RECOMMENDATION_THRESHOLDS = {
  // dataReadiness.level (1-5, see src/utils/dataReadiness.js) at or below
  // this triggers the "collect more data" recommendation.
  lowDataReadinessLevel: 2,
  // at or above this, the business has earned a "things look healthy"
  // recommendation IF nothing else is wrong.
  highDataReadinessLevel: 4,
  // a growth-case revenue projection must fall short of the stated
  // revenue_target by at least this fraction to count as "falling short" —
  // avoids firing on a trivial 1-2% miss.
  growthShortfallTolerance: 0.1,
}
