const TONES = {
  accent: 'bg-accent-500',
  info: 'bg-info',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

/** Horizontal progress meter — forecast accuracy, impact score, storage usage. */
export default function ProgressBar({ value, max = 100, tone = 'accent', label, className = '' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{label}</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{Math.round(pct)}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-line dark:bg-line-dark"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${TONES[tone]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
