import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/** Live-updating `prefers-reduced-motion` read — every chart entrance
 * animation in src/components/charts/ checks this before animating. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY).matches : false
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mediaQuery = window.matchMedia(QUERY)
    const handleChange = (event) => setReduced(event.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return reduced
}
