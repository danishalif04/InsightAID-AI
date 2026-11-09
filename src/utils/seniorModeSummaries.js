/**
 * FYP II Phase 7, Senior/Mod Warga Emas mode — one spoken-style sentence
 * in Bahasa Melayu per chart, built from the SAME real score object the
 * chart already renders (never a static placeholder sentence; a score
 * with no real delta yet says so honestly instead of inventing a number).
 */

/** @param {{label: string, value: number|null, delta: number|null}} score
 * @returns {string} e.g. "Sentimen Positif ialah 67%, naik 4.2 mata peratusan berbanding 7 hari lepas." */
export function summarizeScoreBM(score) {
  if (!score || score.value == null) return `${score?.label ?? 'Data'} tidak tersedia buat masa ini.`

  const base = `${score.label} ialah ${score.value}%`
  if (score.delta == null) return `${base}.`

  const direction = score.delta > 0 ? 'naik' : score.delta < 0 ? 'turun' : 'tidak berubah'
  const magnitude = Math.abs(score.delta)
  if (magnitude === 0) return `${base}, tidak berubah berbanding 7 hari lepas.`
  return `${base}, ${direction} ${magnitude} mata peratusan berbanding 7 hari lepas.`
}

/** @param {{label: string, value: number, unit?: string}} current
 *  @param {{value: number}} previous
 *  @returns {string} e.g. "Jualan ialah RM1,250, naik 12% berbanding tempoh sebelumnya." */
export function summarizeChangeBM(current, previous) {
  if (!current || current.value == null) return `${current?.label ?? 'Data'} tidak tersedia buat masa ini.`
  const unit = current.unit ?? ''
  const base = `${current.label} ialah ${unit}${current.value.toLocaleString('ms-MY')}`
  if (!previous || previous.value == null || previous.value === 0) return `${base}.`

  const percentChange = Math.round(((current.value - previous.value) / Math.abs(previous.value)) * 1000) / 10
  const direction = percentChange > 0 ? 'naik' : percentChange < 0 ? 'turun' : 'tidak berubah'
  if (percentChange === 0) return `${base}, tidak berubah berbanding tempoh sebelumnya.`
  return `${base}, ${direction} ${Math.abs(percentChange)}% berbanding tempoh sebelumnya.`
}
