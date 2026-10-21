import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { AXIS_LINE_DEFAULTS, AXIS_TICK_DEFAULTS, GRID_DEFAULTS } from './chartDefaults'

/**
 * Generic "ranked list with a count" horizontal bar chart — one component
 * for every "top N things by count" chart (hashtags, languages, products,
 * recommendation categories, …), replacing the audit's 4 separate ad-hoc
 * variants (docs/audit/INSIGHTAID_SYSTEM_AUDIT.md §5.2).
 *
 * @param {Array<{label:string, value:number, color?:string}>} items already sorted by the caller (not re-sorted here, so a caller can rank by something other than value if it wants)
 * @param {number} [height=240]
 * @param {(value:number) => string} [valueFormat]
 * @param {string} [barColor='#64748b']
 */
export default function RankedBar({ items = [], height = 240, valueFormat, barColor = '#64748b' }) {
  if (items.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={items} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid {...GRID_DEFAULTS} horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK_DEFAULTS} {...AXIS_LINE_DEFAULTS} />
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS_TICK_DEFAULTS}
          {...AXIS_LINE_DEFAULTS}
          width={110}
        />
        <Tooltip
          content={
            <ChartTooltip formatter={(value) => (valueFormat ? valueFormat(value) : value)} />
          }
        />
        <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {items.map((item, index) => (
            <Cell key={item.label ?? index} fill={item.color ?? barColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
