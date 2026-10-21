import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { formatDelta } from '@/utils/formatters'
import Sparkline from './Sparkline'

const METHOD_BADGES = {
  real: { label: 'Real data', tone: 'info' },
  heuristic: { label: 'Heuristic', tone: 'warning' },
  baseline: { label: 'Baseline', tone: 'neutral' },
  scenario: { label: 'Scenario', tone: 'brand' },
}

const COUNT_UP_MS = 600

/** Animates from 0 to `target` once, skipped entirely under
 * prefers-reduced-motion (returns `target` immediately). */
function useCountUp(target, skip) {
  const [value, setValue] = useState(skip ? target : 0)
  const frame = useRef(null)

  useEffect(() => {
    if (skip || target == null || !Number.isFinite(target)) {
      setValue(target)
      return undefined
    }
    const start = performance.now()
    const from = 0
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / COUNT_UP_MS)
      setValue(from + (target - from) * progress)
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [target, skip])

  return value
}

/**
 * A single real metric — value, WoW/period delta, an embedded sparkline,
 * and a method badge (rule 0.1 — every number must say how it was
 * produced). If `value` is null/undefined, renders an honest "Unavailable"
 * note instead of a placeholder number (never 0 or "—" standing in for a
 * real figure that couldn't be computed).
 *
 * @param {string} label
 * @param {number|null} value real value, already in display units
 * @param {(value:number) => string} [format] e.g. formatCurrencyMYR — defaults to String()
 * @param {number|null} [delta] percentage-point or percent change vs previous period — formatted with formatDelta
 * @param {boolean} [invertDeltaTone=false] set true when a NEGATIVE delta is the good direction (e.g. crisis risk score)
 * @param {Array<number>} [sparklinePoints]
 * @param {string} [sparklineColor]
 * @param {'real'|'heuristic'|'baseline'|'scenario'} [method]
 * @param {string} [unavailableReason] shown when value is null
 */
export default function KpiCard({
  label,
  value,
  format,
  delta,
  invertDeltaTone = false,
  sparklinePoints,
  sparklineColor = '#64748b',
  method,
  unavailableReason = 'Not enough data yet to compute this metric.',
}) {
  const reducedMotion = useReducedMotion()
  const animated = useCountUp(
    typeof value === 'number' ? value : null,
    reducedMotion || typeof value !== 'number'
  )
  const badge = method ? METHOD_BADGES[method] : null
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta)
  const isGoodDelta = hasDelta && (invertDeltaTone ? delta <= 0 : delta >= 0)
  const DeltaIcon = hasDelta && delta >= 0 ? ArrowUp : ArrowDown

  return (
    <Card bodyClassName="p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
      </div>

      {typeof value !== 'number' ? (
        <p className="mt-2 text-sm italic text-slate-500 dark:text-slate-400">
          {unavailableReason}
        </p>
      ) : (
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {format ? format(animated) : Math.round(animated).toLocaleString()}
            </p>
            {hasDelta && (
              <span
                className={`mt-1.5 inline-flex items-center gap-0.5 text-xs font-medium ${
                  isGoodDelta ? 'text-accent-600 dark:text-accent-400' : 'text-danger'
                }`}
              >
                <DeltaIcon className="size-3" aria-hidden="true" />
                {formatDelta(delta)}
              </span>
            )}
          </div>
          {sparklinePoints && sparklinePoints.length > 1 && (
            <Sparkline points={sparklinePoints} color={sparklineColor} />
          )}
        </div>
      )}
    </Card>
  )
}
