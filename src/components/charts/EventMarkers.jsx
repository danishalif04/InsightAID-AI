import { ReferenceLine } from 'recharts'

/**
 * Vertical markers for single-day events (a detected promo day, "today" on
 * a forecast chart, the peak day of a crisis episode). Same reasoning as
 * CrisisBands.jsx: a plain function returning <ReferenceLine> elements,
 * called inline inside the chart — never rendered as `<EventMarkers />`.
 *
 *   {renderEventMarkers(events)}
 *
 * @param {Array<{date:string, label?:string, color?:string}>} events x matches the chart's date-string dataKey
 * @param {string} [defaultColor='#64748b']
 */
export function renderEventMarkers(events = [], defaultColor = '#64748b') {
  return events.map((event, index) => (
    <ReferenceLine
      key={`${event.date}-${index}`}
      x={event.date}
      stroke={event.color ?? defaultColor}
      strokeDasharray="3 3"
      strokeWidth={1.5}
      label={
        event.label
          ? { value: event.label, position: 'top', fontSize: 11, fill: event.color ?? defaultColor }
          : undefined
      }
    />
  ))
}
