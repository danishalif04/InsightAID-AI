/**
 * Crisis detection thresholds (FYP2.md §52): "Thresholds must be
 * configurable and documented." This is the one file every threshold in
 * src/utils/crisisDetection.js reads from — change a number here, not
 * inside the rule engine.
 *
 * Seven signals, deliberately non-overlapping:
 *   - LEVEL checks (negativeRatio, mentionVolume, ratingDeterioration) ask
 *     "is today bad in absolute terms?"
 *   - VELOCITY checks (negativeRatioVelocity: drift vs a multi-day
 *     baseline; mentionVolumeVelocity: single-day-over-day jump) ask
 *     "is it getting worse?", at two different time scales on purpose —
 *     a slow sustained drift and a sudden one-day spike are different
 *     failure modes and would be missed by only checking one.
 *   - ANOMALY checks (sentimentAnomaly, reviewVolumeAnomaly) are z-scores
 *     against the business's OWN recent history, not a fixed threshold —
 *     this catches a small business where 3 bad reviews is a huge
 *     deviation from its norm even though its raw negativeRatio never
 *     crosses the fixed 30%/50% thresholds below.
 */

export const BASELINE_WINDOW_DAYS = 7
export const MIN_BASELINE_POINTS = 3 // fewer than this -> signal is 'insufficient_data', never guessed

export const CRISIS_THRESHOLDS = {
  negativeRatioLevel: { warning: 0.3, critical: 0.5 }, // raw negative_ratio (0-1)
  negativeRatioVelocity: { warning: 0.1, critical: 0.2 }, // absolute increase vs baseline mean
  mentionVolumeLevel: { warning: 1.5, critical: 2.5 }, // ratio to baseline mean (guards baseline <= 0)
  mentionVolumeVelocity: { warning: 0.5, critical: 1.0 }, // fractional day-over-day change (0.5 = +50%)
  ratingDeterioration: { warning: 0.3, critical: 0.6 }, // baseline mean rating - latest rating, on a 1-5 scale
  sentimentAnomaly: { warning: 1.5, critical: 2.5 }, // |z-score| of negative_ratio vs baseline
  reviewVolumeAnomaly: { warning: 1.5, critical: 2.5 }, // |z-score| of mention_volume vs baseline
}

// Points added to risk_score per triggered signal, summed and capped at 100.
export const SEVERITY_POINTS = { warning: 10, critical: 20 }

// risk_score -> risk_level. FYP2.md §52's own 3-level scheme (Normal/Warning/Critical).
export const RISK_LEVEL_THRESHOLDS = { warning: 25, critical: 60 }
