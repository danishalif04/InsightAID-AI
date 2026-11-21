import { buildCalendarWeeks } from './calendarHeatmapMath'

/**
 * Week-row calendar heatmap (GitHub-contribution-graph style) for a daily
 * metric — e.g. revenue per day, so a crisis week visually stands out on
 * its own. Pure divs, not a Recharts chart (calendar heatmaps aren't an
 * XY chart type Recharts models well).
 *
 * @param {Array<{date:string, value:number|null, note?:string}>} points sparse is fine — a missing date just renders as an empty cell
 * @param {(value:number, min:number, max:number) => string} [colorScale] defaults to an accent-green intensity ramp
 * @param {(value:number) => string} [valueFormat]
 * @param {string} [emptyColor]
 */
function defaultColorScale(value, min, max) {
  const t = max > min ? (value - min) / (max - min) : 1
  return `rgba(34, 197, 94, ${0.12 + t * 0.7})`
}

export default function CalendarHeatmap({
  points = [],
  colorScale = defaultColorScale,
  valueFormat,
  emptyColor = '#e6ece9',
}) {
  if (points.length === 0) return null

  const weeks = buildCalendarWeeks(points)
  const values = points.map((point) => point.value).filter((value) => value != null)
  const max = values.length ? Math.max(...values) : 0
  const min = values.length ? Math.min(...values) : 0

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="flex flex-col gap-1">
          {week.map((cell) => (
            <div
              key={cell.date}
              title={
                cell.value != null
                  ? `${cell.date}: ${valueFormat ? valueFormat(cell.value) : cell.value}${cell.note ? `, ${cell.note}` : ''}`
                  : cell.date
              }
              className="size-3.5 rounded-sm"
              style={{
                backgroundColor: cell.value == null ? emptyColor : colorScale(cell.value, min, max),
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
