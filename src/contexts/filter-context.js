import { createContext } from 'react'

/**
 * Holds { filters, setPreset, setCustomRange, setPlatforms, setProducts,
 * resolvedRange }. Consume via the useFilters() hook in
 * src/hooks/useFilters.js.
 */
export const FilterContext = createContext(null)
