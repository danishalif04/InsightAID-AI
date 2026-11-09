import { UI_MODES } from '@/constants/uiModes'
import { useUIMode } from '@/hooks/useUIMode'

/** Three-option segmented control for the FYP II Phase 7 accessibility
 * modes (Standard / Low-Sensory / Senior). Self-contained (reads
 * useUIMode() directly) rather than threaded through DashboardLayout's
 * props like the older business-mode ModeSwitcher — simpler to drop into
 * both the header and Settings without widening that prop chain. */
export default function UIModeSwitcher({ compact = false }) {
  const { uiMode, setUiMode } = useUIMode()

  return (
    <div
      role="tablist"
      aria-label="Accessibility mode"
      className="flex items-center gap-0.5 rounded-full border border-line bg-canvas p-0.5 dark:border-line-dark dark:bg-canvas-dark"
    >
      {Object.values(UI_MODES).map((option) => {
        const Icon = option.icon
        const isActive = option.id === uiMode
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={option.description}
            onClick={() => setUiMode(option.id)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 ${
              isActive
                ? 'bg-accent-500 text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            {!compact && <span className="hidden sm:inline">{option.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
