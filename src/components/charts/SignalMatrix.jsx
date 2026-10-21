import { Fragment, useEffect, useRef } from 'react'
import { CRISIS_COLORS } from '@/config/colorTokens'

/**
 * Heatmap grid: 7 crisis signals (rows) x days in the selected range
 * (columns). Cell shade = severity (normal/warning/critical share one hue
 * family at increasing opacity so the ORDERING reads correctly;
 * insufficient_data gets a visually distinct hatched pattern rather than
 * just a lighter shade of the same color, so it's never confused with "a
 * mild normal day"). Every cell also carries a real `title` (native
 * tooltip) with the signal's actual evidence text and an accessible name —
 * meaning is never color-only.
 *
 * Deliberately NOT wrapped in ChartCard's role="img" pattern: this grid is
 * interactive (each cell is a real, focusable button), and role="img" on
 * an interactive ancestor is itself an accessibility anti-pattern. ChartCard
 * remains the right wrapper for loading/error/empty state and the method
 * badge; this component only renders the grid body.
 *
 * @param {Array<{date:string, signals:Array<{id:string, level:string, evidence:string}>}>} history computeCrisisHistory() output
 * @param {string[]} signalIds row order
 * @param {Record<string,string>} signalLabels id -> human label
 * @param {string|null} [selectedDate]
 * @param {(date:string) => void} [onSelectDate]
 * @param {{start:string, end:string}|null} [focusEpisode] scrolled into view on mount/change, for usability on a long range
 */
export default function SignalMatrix({
  history = [],
  signalIds = [],
  signalLabels = {},
  selectedDate = null,
  onSelectDate,
  focusEpisode = null,
}) {
  const containerRef = useRef(null)
  const focusCellRef = useRef(null)

  useEffect(() => {
    focusCellRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [focusEpisode?.start])

  if (history.length === 0) return null

  return (
    <div ref={containerRef} className="overflow-x-auto">
      <div
        className="inline-grid gap-px"
        style={{ gridTemplateColumns: `140px repeat(${history.length}, 18px)` }}
      >
        <div />
        {history.map((point) => (
          <div
            key={`head-${point.date}`}
            className="flex h-6 items-end justify-center text-[9px] text-slate-400 dark:text-slate-500"
            title={point.date}
          >
            {new Date(point.date).getUTCDate() % 5 === 0 ? new Date(point.date).getUTCDate() : ''}
          </div>
        ))}

        {signalIds.map((signalId) => (
          <Fragment key={signalId}>
            <div className="flex items-center truncate pr-2 text-xs text-slate-600 dark:text-slate-300">
              {signalLabels[signalId] ?? signalId}
            </div>
            {history.map((point) => {
              const signal = point.signals.find((candidate) => candidate.id === signalId)
              const level = signal?.level ?? 'insufficient_data'
              const isFocusStart = focusEpisode && point.date === focusEpisode.start
              const isSelected = point.date === selectedDate

              const style =
                level === 'insufficient_data'
                  ? {
                      backgroundImage:
                        'repeating-linear-gradient(45deg, var(--color-line) 0, var(--color-line) 2px, transparent 2px, transparent 4px)',
                    }
                  : {
                      backgroundColor: CRISIS_COLORS[level],
                      opacity: level === 'normal' ? 0.12 : level === 'warning' ? 0.55 : 1,
                    }

              return (
                <button
                  key={`${signalId}-${point.date}`}
                  ref={isFocusStart ? focusCellRef : undefined}
                  type="button"
                  title={signal?.evidence ?? 'Not enough history to compute this signal yet.'}
                  aria-label={`${signalLabels[signalId] ?? signalId} on ${point.date}: ${level.replace('_', ' ')}. ${signal?.evidence ?? ''}`}
                  onClick={() => onSelectDate?.(point.date)}
                  className={`size-[18px] transition-transform hover:z-10 hover:scale-125 ${
                    isSelected ? 'ring-2 ring-accent-500 ring-offset-1' : ''
                  }`}
                  style={style}
                />
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
