import { MODES } from '@/constants/modes'

/** Two-option segmented control — switches the active business context (FYP2.md §7–§9). */
export default function ModeSwitcher({ mode, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Business mode"
      className="flex items-center gap-0.5 rounded-full border border-line bg-canvas p-0.5 dark:border-line-dark dark:bg-canvas-dark"
    >
      {Object.values(MODES).map((option) => {
        const Icon = option.icon
        const isActive = option.id === mode
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={option.description}
            onClick={() => onChange(option.id)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 ${
              isActive
                ? 'bg-accent-500 text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{option.shortLabel}</span>
          </button>
        )
      })}
    </div>
  )
}
