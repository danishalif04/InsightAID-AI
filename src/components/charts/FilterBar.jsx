import { useFilters } from '@/hooks/useFilters'
import { DATE_RANGE_PRESETS } from '@/utils/filterParams'

const PRESET_LABELS = { '7D': '7D', '30D': '30D', '90D': '90D', All: 'All', custom: 'Custom' }

/**
 * The visible control surface for FilterProvider (src/contexts/) — date
 * range presets + an optional platform multi-select. Phase B built the
 * context/URL-sync plumbing; this is the widget that actually lets someone
 * change it, shared across every redesigned page rather than each one
 * inventing its own filter UI.
 *
 * @param {string[]} [availablePlatforms] real platform values present in this page's own loaded data — never a fixed guessed list
 * @param {boolean} [showPlatformFilter=true]
 */
export default function FilterBar({ availablePlatforms = [], showPlatformFilter = true }) {
  const { filters, setPreset, setPlatforms } = useFilters()

  const togglePlatform = (platform) => {
    const current = filters.platforms ?? []
    setPlatforms(
      current.includes(platform) ? current.filter((p) => p !== platform) : [...current, platform]
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 rounded-full bg-canvas p-1 dark:bg-canvas-dark">
        {DATE_RANGE_PRESETS.filter((preset) => preset !== 'custom').map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setPreset(preset)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filters.preset === preset
                ? 'bg-accent-500 text-white'
                : 'text-slate-600 hover:bg-surface dark:text-slate-300 dark:hover:bg-surface-dark'
            }`}
          >
            {PRESET_LABELS[preset]}
          </button>
        ))}
      </div>

      {showPlatformFilter && availablePlatforms.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {availablePlatforms.map((platform) => {
            const active = (filters.platforms ?? []).includes(platform)
            return (
              <button
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  active
                    ? 'border-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400'
                    : 'border-line text-slate-500 hover:bg-canvas dark:border-line-dark dark:text-slate-400 dark:hover:bg-canvas-dark'
                }`}
              >
                {platform}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
