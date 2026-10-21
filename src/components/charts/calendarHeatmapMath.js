/**
 * Pure week-grid math for CalendarHeatmap.jsx, split into its own file so
 * that component file only exports the component (react-refresh's
 * only-export-components rule — mixing a component default export with a
 * named pure-function export in one file breaks Fast Refresh reliability).
 */
export function buildCalendarWeeks(points = []) {
  if (points.length === 0) return []
  const byDate = new Map(points.map((point) => [point.date, point]))
  const dates = points.map((point) => new Date(`${point.date}T00:00:00Z`))
  const minDate = new Date(Math.min(...dates))
  const maxDate = new Date(Math.max(...dates))

  const start = new Date(minDate)
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())

  const weeks = []
  const cursor = new Date(start)
  while (cursor <= maxDate) {
    const week = []
    for (let day = 0; day < 7; day += 1) {
      const iso = cursor.toISOString().slice(0, 10)
      const point = byDate.get(iso)
      week.push({
        date: iso,
        value: point?.value ?? null,
        note: point?.note,
        inRange: iso >= points[0].date,
      })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}
