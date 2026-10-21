/**
 * Pure angle/position math for RiskGauge.jsx, split out so that component
 * file only exports the component (react-refresh's only-export-components
 * rule).
 */
export const GAUGE_START_ANGLE = 90
export const GAUGE_END_ANGLE = -270 // full circle, clockwise

/** Angle (degrees, SVG convention: 0 = +x axis, counter-clockwise positive)
 * for a given 0-100 score on the gauge's start/end sweep. */
export function angleForScore(score) {
  const clamped = Math.max(0, Math.min(100, score))
  return GAUGE_START_ANGLE + (clamped / 100) * (GAUGE_END_ANGLE - GAUGE_START_ANGLE)
}

/** A point on the gauge's ring at `score`, for placing threshold ticks. */
export function pointOnRing(score, radius, size) {
  const angleRad = (angleForScore(score) * Math.PI) / 180
  const center = size / 2
  return { x: center + radius * Math.cos(angleRad), y: center - radius * Math.sin(angleRad) }
}
