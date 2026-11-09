import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import { useMotionAllowed } from '@/hooks/useMotionAllowed'

/** Large KPI tile with a count-up animation (skipped outright when motion
 * is disallowed — Low-Sensory mode or prefers-reduced-motion — showing the
 * final value immediately rather than an incomplete count). `value` must
 * be a real finite number; a non-numeric/null value renders an em dash,
 * never a fabricated count-up to 0. */
export default function StatTile({ label, value, unit = '', decimals = 0, delta }) {
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
    typeof display === 'number' && Number.isFinite(display) ? display.toFixed(decimals) : '—'

  return (
    <div
      ref={nodeRef}
      className="rounded-3xl border border-glow-border bg-glow-surface-elevated px-5 py-4"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-glow-text/50">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold tabular-nums text-glow-text">
        {formatted}
        {formatted !== '—' && unit}
      </p>
      {delta != null && (
        <p className={`mt-1 text-xs font-medium ${delta >= 0 ? 'text-glow-brand' : 'text-rose-400'}`}>
          {delta >= 0 ? '+' : ''}
          {delta}
        </p>
      )}
    </div>
  )
}
