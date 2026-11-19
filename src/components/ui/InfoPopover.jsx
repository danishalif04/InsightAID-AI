import { useId, useState } from 'react'
import { HelpCircle } from 'lucide-react'

/**
 * Small "(?) icon -> plain-language explanation" popover, for real data
 * displays that aren't wrapped in ChartCard (which already has this exact
 * mechanism built in via its `readingGuide` prop — see
 * src/components/charts/ChartCard.jsx). Same visual pattern reused here
 * (not reinvented) so a stat grid, breakdown list, or table reads
 * consistently with every chart's own (?) icon.
 *
 * @param {string} guide plain-language explanation shown on click
 * @param {string} [label] accessible name for the button (defaults to a generic one)
 */
export default function InfoPopover({ guide, label = 'More information', className = '' }) {
  const [open, setOpen] = useState(false)
  const id = useId()

  if (!guide) return null

  // <span>, not <div>: this popover is used inside <p> labels (StatTile,
  // GlowSection headers, chart captions). A <div> there is invalid HTML and
  // React reports it as a console error on every page that renders one.
  // Spans are phrasing content, so they are legal inside <p>; the display
  // is set by the utility classes below, so nothing changes visually.
  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={id}
        className="flex items-center rounded-lg p-1 text-glow-text/50 hover:bg-white/5 hover:text-glow-text"
        onClick={() => setOpen((value) => !value)}
      >
        <HelpCircle className="size-3.5" aria-hidden="true" />
      </button>
      <span
        id={id}
        role="tooltip"
        className={`absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-glow-border bg-glow-surface p-3 text-xs text-glow-text/70 shadow-xl ${
          open ? 'block' : 'hidden'
        }`}
      >
        {guide}
      </span>
    </span>
  )
}
