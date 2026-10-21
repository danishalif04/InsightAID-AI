import { useContext } from 'react'
import { FilterContext } from '@/contexts/filter-context'

export function useFilters() {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error('useFilters must be used within <FilterProvider>')
  }
  return context
}
