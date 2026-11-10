const OPTIONS = [
  { id: 'day', label: 'Day' },
  { id: 'month', label: 'Month' },
]

/**
 * Small Day/Month segmented control for per-day trend charts — meant to
 * sit in `ChartCard`'s `headerActions` slot (see that component's own doc
 * comment). Controlled: the caller owns the `value` state and re-fetches/
 * re-aggregates its chart data on change (src/utils/chartGranularity.js's
 * `aggregateToMonthly` does the actual bucketing) — this component only
 * renders the two buttons, same dark-glow pill pattern used elsewhere
 * (e.g. Social Intelligence's platform picker).
 */
export default function GranularityToggle({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Chart granularity" className="flex items-center gap-0.5 rounded-full border border-glow-border p-0.5">
      {OPTIONS.map((option) => {
        const isActive = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              isActive ? 'bg-glow-brand text-glow-bg' : 'text-glow-text/60 hover:bg-white/5 hover:text-glow-text'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
