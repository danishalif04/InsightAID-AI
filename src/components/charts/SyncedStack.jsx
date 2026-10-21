import { useId } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { AXIS_LINE_DEFAULTS, AXIS_TICK_DEFAULTS, GRID_DEFAULTS } from './chartDefaults'
import { renderEventMarkers } from './EventMarkers'

/**
 * Several small single-series charts stacked vertically, all sharing one
 * Recharts `syncId` so hovering any one of them shows the crosshair (and
 * tooltip) on all the others at the same x position — for comparing
 * several daily metrics (mention volume, negative ratio, rating, revenue…)
 * that only make sense read together.
 *
 * @param {Array<{key:string, label:string, color:string, format?:(value:number)=>string}>} panels one dataKey per stacked mini-chart
 * @param {Array<object>} data shared rows — each panel reads its own `key` from the same array
 * @param {Array<{date:string, label?:string}>} [events] rendered on every panel via EventMarkers
 * @param {number} [panelHeight=120]
 */
export default function SyncedStack({ panels = [], data = [], events = [], panelHeight = 120 }) {
  const syncId = useId()
  if (panels.length === 0 || data.length === 0) return null

  return (
    <div className="space-y-3">
      {panels.map((panel) => (
        <div key={panel.key}>
          <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {panel.label}
          </p>
          <ResponsiveContainer width="100%" height={panelHeight}>
            <LineChart
              data={data}
              syncId={syncId}
              margin={{ left: -20, top: 4, right: 8, bottom: 0 }}
            >
              <CartesianGrid {...GRID_DEFAULTS} />
              <XAxis dataKey="date" tick={AXIS_TICK_DEFAULTS} {...AXIS_LINE_DEFAULTS} />
              <YAxis tick={AXIS_TICK_DEFAULTS} {...AXIS_LINE_DEFAULTS} width={48} />
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(value) => (panel.format ? panel.format(value) : value)}
                  />
                }
              />
              {renderEventMarkers(events)}
              <Line
                type="monotone"
                dataKey={panel.key}
                name={panel.label}
                stroke={panel.color}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  )
}
