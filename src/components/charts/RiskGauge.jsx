import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { RadialBar, RadialBarChart } from 'recharts'
import { CRISIS_COLORS } from '@/config/colorTokens'
import { RISK_LEVEL_THRESHOLDS } from '@/config/crisisThresholds'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { GAUGE_END_ANGLE, GAUGE_START_ANGLE, pointOnRing } from './riskGaugeMath'

const LEVEL_META = {
  normal: { label: 'Normal', icon: CheckCircle2, color: CRISIS_COLORS.normal },
  warning: { label: 'Warning', icon: AlertTriangle, color: CRISIS_COLORS.warning },
  critical: { label: 'Critical', icon: ShieldAlert, color: CRISIS_COLORS.critical },
}

/**
 * 0-100 radial risk gauge. Level bands (normal/warning/critical) come from
 * src/config/crisisThresholds.js's RISK_LEVEL_THRESHOLDS, never
 * hardcoded here. A slow pulse ring appears only at warning/critical
 * (skipped under prefers-reduced-motion), and the level is always also
 * shown as text + icon — never color alone.
 *
 * @param {number} riskScore 0-100
 * @param {'normal'|'warning'|'critical'} riskLevel
 * @param {string} [asOfDate] the date being viewed (ISO), shown under the score
 * @param {number} [size=200] gauge diameter in px
 */
export default function RiskGauge({ riskScore, riskLevel, asOfDate, size = 200 }) {
  const reducedMotion = useReducedMotion()
  const meta = LEVEL_META[riskLevel] ?? LEVEL_META.normal
  const Icon = meta.icon
  const data = [{ value: riskScore, fill: meta.color }]
  const radius = size / 2 - 14

  const warningPoint = pointOnRing(RISK_LEVEL_THRESHOLDS.warning, radius, size)
  const criticalPoint = pointOnRing(RISK_LEVEL_THRESHOLDS.critical, radius, size)

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {riskLevel !== 'normal' && !reducedMotion && (
        <span
          className="absolute inset-0 animate-ping rounded-full opacity-20"
          style={{ backgroundColor: meta.color, animationDuration: '2.5s' }}
          aria-hidden="true"
        />
      )}

      <RadialBarChart
        width={size}
        height={size}
        cx="50%"
        cy="50%"
        innerRadius="78%"
        outerRadius="100%"
        startAngle={GAUGE_START_ANGLE}
        endAngle={GAUGE_END_ANGLE}
        data={data}
      >
        <RadialBar
          dataKey="value"
          cornerRadius={8}
          background={{ fill: 'currentColor', opacity: 0.08 }}
          isAnimationActive={!reducedMotion}
        />
      </RadialBarChart>

      {/* Threshold tick marks — real positions from RISK_LEVEL_THRESHOLDS, not decoration. */}
      <span
        className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500"
        style={{ left: warningPoint.x, top: warningPoint.y }}
        title={`Warning threshold: ${RISK_LEVEL_THRESHOLDS.warning}`}
      />
      <span
        className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600"
        style={{ left: criticalPoint.x, top: criticalPoint.y }}
        title={`Critical threshold: ${RISK_LEVEL_THRESHOLDS.critical}`}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-semibold tabular-nums text-glow-text">
          {Math.round(riskScore)}
        </p>
        <p className="text-xs text-glow-text/50">/ 100</p>
        <span
          className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium"
          style={{ color: meta.color }}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {meta.label}
        </span>
        {asOfDate && <p className="mt-1 text-[11px] text-glow-text/50">as of {asOfDate}</p>}
      </div>
    </div>
  )
}
