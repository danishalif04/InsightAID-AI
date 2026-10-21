import { useEffect, useRef, useState } from 'react'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const SPEEDS = [
  { label: '0.5x', ms: 2000 },
  { label: '1x', ms: 1000 },
  { label: '2x', ms: 500 },
]

/**
 * Play/pause/speed scrubber that steps through `dates` one at a time,
 * calling `onChange` with each date in turn — the caller is responsible
 * for making the rest of the page (gauge, signal list, matrix, stack)
 * react to that date, this component only owns playback state. Auto-stops
 * at the last date rather than looping, since looping a real incident
 * replay implies it repeats, which it didn't.
 *
 * @param {string[]} dates ascending, the episode's real date range (+ a little context)
 * @param {string|null} value currently displayed date — controlled by the caller
 * @param {(date:string) => void} onChange
 */
export default function CrisisReplay({ dates = [], value = null, onChange }) {
  const [playing, setPlaying] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(1)
  const reducedMotion = useReducedMotion()
  const timerRef = useRef(null)

  const index = Math.max(0, dates.indexOf(value))

  useEffect(() => {
    if (!playing || dates.length === 0) return undefined
    timerRef.current = setInterval(
      () => {
        const next = dates.indexOf(value) + 1
        if (next >= dates.length) {
          setPlaying(false)
          return
        }
        onChange(dates[next])
      },
      reducedMotion ? SPEEDS[0].ms : SPEEDS[speedIndex].ms
    )
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speedIndex, value, dates, reducedMotion])

  if (dates.length === 0) return null

  const step = (delta) => {
    const next = Math.min(dates.length - 1, Math.max(0, index + delta))
    onChange(dates[next])
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="secondary"
          icon={SkipBack}
          aria-label="Previous day"
          onClick={() => step(-1)}
        />
        <Button
          size="sm"
          icon={playing ? Pause : Play}
          aria-label={playing ? 'Pause replay' : 'Play replay'}
          onClick={() => setPlaying((current) => !current)}
        >
          {playing ? 'Pause' : 'Play'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={SkipForward}
          aria-label="Next day"
          onClick={() => step(1)}
        />
      </div>

      <input
        type="range"
        min={0}
        max={dates.length - 1}
        value={index}
        onChange={(event) => onChange(dates[Number(event.target.value)])}
        className="h-1.5 flex-1 accent-accent-500"
        aria-label="Replay position"
      />

      <span className="w-24 shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
        {dates[index]} ({index + 1}/{dates.length})
      </span>

      <div className="flex items-center gap-1">
        {SPEEDS.map((speed, speedOptionIndex) => (
          <button
            key={speed.label}
            type="button"
            onClick={() => setSpeedIndex(speedOptionIndex)}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              speedOptionIndex === speedIndex
                ? 'bg-accent-500 text-white'
                : 'text-slate-500 hover:bg-canvas dark:text-slate-400 dark:hover:bg-canvas-dark'
            }`}
          >
            {speed.label}
          </button>
        ))}
      </div>
    </div>
  )
}
