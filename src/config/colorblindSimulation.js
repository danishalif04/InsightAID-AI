/**
 * Simulates how a hex color appears under the three common forms of color
 * vision deficiency, so chart palettes can be CHECKED, not just asserted,
 * to be distinguishable — Phase 6 (FYP II master prompt): "verify against
 * the known Okabe-Ito reference values" rather than trusting a palette is
 * safe because it looks reasonable.
 *
 * The matrices below are the widely-reproduced simplified linear-RGB CVD
 * simulation coefficients used by common open-source color-blindness
 * simulators (e.g. Coblis, Chrome DevTools' vision deficiency emulation),
 * derived from Viénot, Brettel & Mollon (1999)'s approach. They are a
 * practical approximation, not a clinically-calibrated transform — see
 * docs/REFERENCES_TO_VERIFY.md, marked [VERIFY] pending the original paper.
 */

export function hexToRgb(hex) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!match) throw new Error(`Not a 6-digit hex color: ${hex}`)
  return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) }
}

const MATRICES = {
  protanopia: [
    [0.567, 0.433, 0],
    [0.558, 0.442, 0],
    [0, 0.242, 0.758],
  ],
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7],
  ],
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.433, 0.567],
    [0, 0.475, 0.525],
  ],
}

export const CVD_TYPES = Object.keys(MATRICES)

/** @returns {{r:number,g:number,b:number}} the color as a person with `type` CVD would see it. */
export function simulateCvd(hex, type) {
  const matrix = MATRICES[type]
  if (!matrix) throw new Error(`Unknown CVD type: ${type}`)
  const { r, g, b } = hexToRgb(hex)
  return {
    r: matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b,
    g: matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b,
    b: matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b,
  }
}

/** Euclidean distance in simulated RGB space — a simplified stand-in for a
 * full perceptual metric (e.g. CIEDE2000), good enough to catch "these two
 * colors become near-identical under this deficiency," not a precise
 * delta-E. */
export function rgbDistance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}

/** Minimum simulated-RGB distance across every pair in `hexColors`, for one
 * CVD type — the weakest link in the palette, which is the number that
 * actually matters ("is there ANY pair a viewer with this deficiency can't
 * tell apart"), not an average. */
export function minPairwiseDistanceUnderCvd(hexColors, type) {
  const simulated = hexColors.map((hex) => simulateCvd(hex, type))
  let min = Infinity
  for (let i = 0; i < simulated.length; i += 1) {
    for (let j = i + 1; j < simulated.length; j += 1) {
      min = Math.min(min, rgbDistance(simulated[i], simulated[j]))
    }
  }
  return min
}
