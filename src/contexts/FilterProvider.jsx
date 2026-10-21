import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FilterContext } from './filter-context'
import {
  filtersToSearchParams,
  parseFiltersFromSearchParams,
  resolveDateRange,
} from '@/utils/filterParams'

/**
 * Global date-range + platform + product filter, synced to the URL query
 * string (so /crisis-detection?from=2026-09-01&to=2026-09-10 opens that
 * exact view — PLAN.md's Phase B charter). Scoped per-mount: wrap only
 * the pages that should share one filter bar, not necessarily the whole
 * app (Phase C decides where this actually mounts; this phase only builds
 * and proves the provider itself).
 *
 * Reads the CURRENT URL's query params on every render rather than
 * keeping separate React state that could drift from the URL — the URL
 * is the single source of truth, exactly like the mode/theme toggles
 * use localStorage as theirs.
 */
export default function FilterProvider({ children }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => parseFiltersFromSearchParams(searchParams), [searchParams])

  const applyFilters = useCallback(
    (next) => {
      setSearchParams(filtersToSearchParams(next), { replace: true })
    },
    [setSearchParams]
  )

  const setPreset = useCallback(
    (preset) =>
      applyFilters({
        ...filters,
        preset,
        ...(preset !== 'custom' ? { from: null, to: null } : {}),
      }),
    [filters, applyFilters]
  )

  const setCustomRange = useCallback(
    (from, to) => applyFilters({ ...filters, preset: 'custom', from, to }),
    [filters, applyFilters]
  )

  const setPlatforms = useCallback(
    (platforms) => applyFilters({ ...filters, platforms }),
    [filters, applyFilters]
  )
  const setProducts = useCallback(
    (products) => applyFilters({ ...filters, products }),
    [filters, applyFilters]
  )

  const resolvedRange = useMemo(() => resolveDateRange(filters), [filters])

  const value = useMemo(
    () => ({ filters, setPreset, setCustomRange, setPlatforms, setProducts, resolvedRange }),
    [filters, setPreset, setCustomRange, setPlatforms, setProducts, resolvedRange]
  )

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}
