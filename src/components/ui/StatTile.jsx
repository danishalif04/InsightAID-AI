import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import { useMotionAllowed } from '@/hooks/useMotionAllowed'
import InfoPopover from './InfoPopover'

/** Large KPI tile with a count-up animation (skipped outright when motion
 * is disallowed — Low-Sensory mode or prefers-reduced-motion — showing the
 * final value immediately rather than an incomplete count). `value` must
 * be a real finite number; a non-numeric/null value renders an em dash,
 * never a fabricated count-up to 0. `guide`, when given, renders the same
 * (?) info icon ChartCard's charts already use (see InfoPopover) — optional,
 * since not every KPI needs explaining. */
export default function StatTile({ label, value, prefix = '', unit = '', decimals = 0, delta, guide }) {
  const motionAllowed = useMotionAllowed()
  const [display, setDisplay] = useState(motionAllowed && typeof value === 'number' ? 0 : value)
  const nodeRef = useRef(null)

  useEffect(() => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      setDisplay(value)
      return undefined
    }
    if (!motionAllowed) {
      setDisplay(value)
      return undefined
    }
    const controls = animate(0, value, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    })
    return () => controls.stop()
  }, [value, motionAllowed])

  const formatted =
    typeof display === 'number' && Number.isFinite(display) ? display.toFixed(decimals) : 'N/A'

  return (
    <div
      ref={nodeRef}
      className="rounded-3xl border border-glow-border bg-glow-surface-elevated px-5 py-4 shadow-[0_0_0_1px_rgba(34,197,94,0.06),0_12px_32px_-16px_rgba(34,197,94,0.35)]"
    >
      <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-glow-text/50">
        {label}
        {guide && <InfoPopover guide={guide} label={`About ${label}`} />}
      </p>
      <p className="mt-1.5 text-4xl font-bold tracking-tight tabular-nums text-glow-text">
        {formatted !== 'N/A' && prefix}
        {formatted}
        {formatted !== 'N/A' && unit}
      </p>
      {delta != null && (
        <span
          className={`mt-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
            delta >= 0 ? 'bg-glow-brand/15 text-glow-brand' : 'bg-rose-500/15 text-rose-400'
          }`}
        >
          {delta >= 0 ? '+' : ''}
          {delta}
        </span>
      )}
    </div>
  )
}
