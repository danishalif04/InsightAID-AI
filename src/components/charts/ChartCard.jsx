import { useEffect, useId, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, HelpCircle, ImageIcon, Info, Maximize2, MoreVertical } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import AsyncSection from '@/components/common/AsyncSection'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useLowSensoryMode } from '@/hooks/useLowSensoryMode'
import { downloadCsv } from '@/utils/csvExport'
import { exportChartAsPng, toggleFullscreen } from '@/utils/chartExport'
import { fadeInUp } from '@/animations/motionPresets'
import { CHART_HEIGHTS } from './chartDefaults'

/**
 * "Real data" / "Heuristic" / "Baseline" / "Scenario" — the exact four
 * labels PLAN.md's honesty convention requires on every chart (rule 0.1).
 * Never add a fifth without updating this map; nothing here should fall
 * back to a guessed label.
 */
const METHOD_BADGES = {
  real: { label: 'Real data', tone: 'info' },
  heuristic: { label: 'Heuristic', tone: 'warning' },
  baseline: { label: 'Baseline', tone: 'neutral' },
  scenario: { label: 'Scenario', tone: 'brand' },
}

function resolveHeight(height) {
  if (typeof height === 'number') return height
  return CHART_HEIGHTS[height] ?? CHART_HEIGHTS.md
}

/**
 * The shared wrapper every redesigned chart renders inside: title/subtitle,
 * a method badge with an info tooltip explaining how the number was
 * produced, an actions menu (Export CSV / Export PNG / Fullscreen), and
 * the project's standard 5-state async handling (loading/success/empty/
 * error/unavailable — see useAsyncData/AsyncSection) baked in so no page
 * has to re-implement it per chart.
 *
 * `children` is a render-prop `(data) => ReactNode`, same contract as
 * AsyncSection, so a chart body only ever renders once there's real data.
 *
 * @param {string} title
 * @param {string} [subtitle]
 * @param {'real'|'heuristic'|'baseline'|'scenario'} method
 * @param {string} methodNote one-sentence explanation shown in the info tooltip
 * @param {'sm'|'md'|'lg'|'hero'|number} [height='md']
 * @param {string} ariaLabel one-sentence REAL data summary for role="img" — must describe the actual rendered data, not a static caption
 * @param {'loading'|'success'|'error'|'unavailable'} status
 * @param {*} data
 * @param {Error} [error]
 * @param {() => void} [reload]
 * @param {(data:*) => boolean} [emptyWhen]
 * @param {string} [emptyMessage]
 * @param {string} [unavailableMessage]
 * @param {string} [readingGuide] plain-language "how to read this chart" text — NOT the data method
 *   (that's `methodNote`). E.g. "Each dot is one day. Above the dashed line means risk is rising faster
 *   than normal for this business." Shown behind a separate (?) icon next to the title (Phase 6, FYP II
 *   master prompt — "every chart must have a 'How to read this chart' (i) popover in plain language").
 * @param {Array<object>|((data:*) => Array<object>)} [csvRows] when provided, enables "Export CSV"
 * @param {string} [csvFilename]
 * @param {import('react').ReactNode} [headerActions] extra controls rendered left of the actions menu (e.g. a chart-mode toggle)
 * @param {(data:*) => import('react').ReactNode} children
 */
export default function ChartCard({
  title,
  subtitle,
  method,
  methodNote,
  height = 'md',
  ariaLabel,
  status,
  data,
  error,
  reload,
  emptyWhen,
  emptyMessage,
  unavailableMessage,
  readingGuide,
  csvRows,
  csvFilename = 'chart-data.csv',
  headerActions,
  className = '',
  // 'default' = the original Card-based chrome every not-yet-redesigned
  // page still uses; 'glow' = the dark-glow redesign's hero-card treatment
  // (used by a page once ITS redesign step runs — see docs/redesign-v2/).
  // Same header/badge/popover/menu/AsyncSection logic either way, only the
  // outer container's visual chrome changes.
  surface = 'default',
  children,
}) {
  const bodyRef = useRef(null)
  const osReducedMotion = useReducedMotion()
  const lowSensory = useLowSensoryMode()
  const reducedMotion = osReducedMotion || lowSensory
  const [menuOpen, setMenuOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [exportError, setExportError] = useState(null)
  const menuRef = useRef(null)
  const infoId = useId()
  const guideId = useId()
  const pixelHeight = resolveHeight(height)
  const badge = method ? METHOD_BADGES[method] : null

  useEffect(() => {
    if (!menuOpen) return undefined
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  const handleExportCsv = () => {
    setMenuOpen(false)
    const rows = typeof csvRows === 'function' ? csvRows(data) : csvRows
    if (!rows || rows.length === 0) return
    downloadCsv(csvFilename, rows)
  }

  const handleExportPng = async () => {
    setMenuOpen(false)
    setExportError(null)
    try {
      await exportChartAsPng(bodyRef.current, `${csvFilename.replace(/\.csv$/i, '')}.png`)
    } catch (err) {
      setExportError(err.message)
    }
  }

  const handleFullscreen = () => {
    setMenuOpen(false)
    toggleFullscreen(bodyRef.current)
  }

  const motionProps = reducedMotion ? {} : fadeInUp

  const bodyNode = (
    <>
      {exportError && <p className="mb-2 text-xs text-danger">{exportError}</p>}
      <div ref={bodyRef} style={{ minHeight: pixelHeight }}>
        {status === 'loading' ? (
          <div style={{ height: pixelHeight }}>
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <AsyncSection
            status={status}
            data={data}
            error={error}
            reload={reload}
            emptyWhen={emptyWhen}
            emptyMessage={emptyMessage}
            unavailableMessage={unavailableMessage}
          >
            {(resolvedData) => (
              // role="img" only wraps actual rendered chart content, never
              // the error/retry UI — a screen reader must still reach the
              // Retry button, which role="img" on an ancestor would hide.
              <div role="img" aria-label={ariaLabel ?? title}>
                {children(resolvedData)}
              </div>
            )}
          </AsyncSection>
        )}
      </div>
    </>
  )

  if (surface === 'glow') {
    return (
      <motion.div {...motionProps} className={`rounded-3xl border border-glow-border bg-glow-surface-elevated ${className}`}>
        <div className="flex items-start justify-between gap-4 border-b border-glow-border px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-glow-text/60">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {readingGuide && (
              <div className="relative">
                <button
                  type="button"
                  aria-label="How to read this chart"
                  aria-expanded={guideOpen}
                  aria-describedby={guideId}
                  className="flex items-center rounded-lg p-1 text-glow-text/50 hover:bg-white/5 hover:text-glow-text"
                  onClick={() => setGuideOpen((open) => !open)}
                >
                  <HelpCircle className="size-3.5" aria-hidden="true" />
                </button>
                <div
                  id={guideId}
                  role="tooltip"
                  className={`absolute right-0 z-20 mt-2 w-64 rounded-lg border border-glow-border bg-glow-surface p-3 text-xs text-glow-text/70 shadow-xl ${
                    guideOpen ? 'block' : 'hidden'
                  }`}
                >
                  <p className="mb-1 font-medium text-glow-text">How to read this chart</p>
                  {readingGuide}
                </div>
              </div>
            )}
            {badge && (
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-1"
                  aria-expanded={infoOpen}
                  aria-describedby={methodNote ? infoId : undefined}
                  onClick={() => setInfoOpen((open) => !open)}
                >
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                  {methodNote && <Info className="size-3.5 text-glow-text/50" aria-hidden="true" />}
                </button>
                {methodNote && (
                  <div
                    id={infoId}
                    role="tooltip"
                    className={`absolute right-0 z-20 mt-2 w-64 rounded-lg border border-glow-border bg-glow-surface p-3 text-xs text-glow-text/70 shadow-xl ${
                      infoOpen ? 'block' : 'hidden'
                    }`}
                  >
                    {methodNote}
                  </div>
                )}
              </div>
            )}
            {headerActions}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label="Chart actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="rounded-lg p-1.5 text-glow-text/50 hover:bg-white/5 hover:text-glow-text"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <MoreVertical className="size-4" aria-hidden="true" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-glow-border bg-glow-surface py-1 text-sm shadow-xl"
                >
                  {csvRows && (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-glow-text hover:bg-white/5"
                      onClick={handleExportCsv}
                    >
                      <Download className="size-3.5" aria-hidden="true" /> Export CSV
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-glow-text hover:bg-white/5"
                    onClick={handleExportPng}
                  >
                    <ImageIcon className="size-3.5" aria-hidden="true" /> Export PNG
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-glow-text hover:bg-white/5"
                    onClick={handleFullscreen}
                  >
                    <Maximize2 className="size-3.5" aria-hidden="true" /> Fullscreen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-5">{bodyNode}</div>
      </motion.div>
    )
  }

  return (
    <motion.div {...motionProps}>
      <Card
        className={className}
        title={title}
        description={subtitle}
        actions={
          <div className="flex items-center gap-1.5">
            {readingGuide && (
              <div className="relative">
                <button
                  type="button"
                  aria-label="How to read this chart"
                  aria-expanded={guideOpen}
                  aria-describedby={guideId}
                  className="flex items-center rounded-lg p-1 text-slate-400 hover:bg-canvas hover:text-slate-700 dark:hover:bg-canvas-dark dark:hover:text-slate-200"
                  onClick={() => setGuideOpen((open) => !open)}
                >
                  <HelpCircle className="size-3.5" aria-hidden="true" />
                </button>
                <div
                  id={guideId}
                  role="tooltip"
                  className={`absolute right-0 z-20 mt-2 w-64 rounded-lg border border-line bg-surface p-3 text-xs text-slate-600 shadow-card dark:border-line-dark dark:bg-surface-dark dark:text-slate-300 ${
                    guideOpen ? 'block' : 'hidden'
                  }`}
                >
                  <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">How to read this chart</p>
                  {readingGuide}
                </div>
              </div>
            )}
            {badge && (
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-1"
                  aria-expanded={infoOpen}
                  aria-describedby={methodNote ? infoId : undefined}
                  onClick={() => setInfoOpen((open) => !open)}
                >
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                  {methodNote && <Info className="size-3.5 text-slate-400" aria-hidden="true" />}
                </button>
                {methodNote && (
                  <div
                    id={infoId}
                    role="tooltip"
                    className={`absolute right-0 z-20 mt-2 w-64 rounded-lg border border-line bg-surface p-3 text-xs text-slate-600 shadow-card dark:border-line-dark dark:bg-surface-dark dark:text-slate-300 ${
                      infoOpen ? 'block' : 'hidden'
                    }`}
                  >
                    {methodNote}
                  </div>
                )}
              </div>
            )}
            {headerActions}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label="Chart actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-canvas hover:text-slate-700 dark:hover:bg-canvas-dark dark:hover:text-slate-200"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <MoreVertical className="size-4" aria-hidden="true" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-line bg-surface py-1 text-sm shadow-card dark:border-line-dark dark:bg-surface-dark"
                >
                  {csvRows && (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-canvas dark:text-slate-200 dark:hover:bg-canvas-dark"
                      onClick={handleExportCsv}
                    >
                      <Download className="size-3.5" aria-hidden="true" /> Export CSV
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-canvas dark:text-slate-200 dark:hover:bg-canvas-dark"
                    onClick={handleExportPng}
                  >
                    <ImageIcon className="size-3.5" aria-hidden="true" /> Export PNG
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-canvas dark:text-slate-200 dark:hover:bg-canvas-dark"
                    onClick={handleFullscreen}
                  >
                    <Maximize2 className="size-3.5" aria-hidden="true" /> Fullscreen
                  </button>
                </div>
              )}
            </div>
          </div>
        }
      >
        {bodyNode}
      </Card>
    </motion.div>
  )
}
