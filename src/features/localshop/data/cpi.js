import snapshot from './cpi.snapshot.json'

const PLACEHOLDER = 'TODO_FROM_DOSM'

const isReal = (value) => typeof value === 'number' && Number.isFinite(value)

/**
 * Reads the CPI snapshot, keeping placeholder rows out of the chart data
 * entirely. A `TODO_FROM_DOSM` must never reach a chart as 0 — that would
 * turn "we don't have this figure" into "this figure is zero".
 */
export function readCpiSnapshot() {
  const rows = (snapshot.regions ?? [])
    .map((region) => ({
      id: region.id,
      label: region.label,
      overall: isReal(region.overall) ? region.overall : null,
      food_beverages: isReal(region.food_beverages) ? region.food_beverages : null,
    }))
    .filter((region) => region.overall !== null || region.food_beverages !== null)

  const hasData = snapshot.status === 'loaded' && rows.length > 0

  return {
    hasData,
    rows,
    series: snapshot.series ?? [],
    unit: snapshot.unit,
    source: snapshot.source === PLACEHOLDER ? null : snapshot.source,
    sourceUrl: snapshot.sourceUrl,
    period: snapshot.period === PLACEHOLDER ? null : snapshot.period,
    retrievedOn: snapshot.retrievedOn === PLACEHOLDER ? null : snapshot.retrievedOn,
    priceWatch: snapshot.priceWatch ?? { status: 'awaiting_data' },
  }
}
