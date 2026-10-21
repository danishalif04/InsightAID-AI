import { ReferenceArea } from 'recharts'
import { CRISIS_COLORS } from '@/config/colorTokens'

/**
 * Shades crisis episodes on a time-series chart. Deliberately a plain
 * function returning an array of <ReferenceArea> elements, NOT a React
 * component rendered as a JSX child — Recharts matches reference/axis
 * children by their exact element type before it renders a composite
 * component's own output, so `<CrisisBands episodes={x} />` placed inside
 * a chart silently fails to position anything. Call it inline instead:
 *
 *   <AreaChart data={series}>
 *     ...
 *     {renderCrisisBands(episodes)}
 *   </AreaChart>
 *
 * @param {Array<{start:string, end:string, riskLevel?:'warning'|'critical'}>} episodes x1/x2 must match the chart's own date-string dataKey values exactly
 */
export function renderCrisisBands(episodes = []) {
  return episodes.map((episode, index) => (
    <ReferenceArea
      key={`${episode.start}-${episode.end}-${index}`}
      x1={episode.start}
      x2={episode.end}
      fill={episode.riskLevel === 'critical' ? CRISIS_COLORS.critical : CRISIS_COLORS.warning}
      fillOpacity={0.08}
      stroke={episode.riskLevel === 'critical' ? CRISIS_COLORS.critical : CRISIS_COLORS.warning}
      strokeOpacity={0.3}
      strokeDasharray="4 2"
    />
  ))
}
