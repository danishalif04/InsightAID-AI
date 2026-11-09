import { useUIMode } from './useUIMode'

/** True when the user has explicitly chosen Low-Sensory mode — distinct
 * from (and checked alongside) the OS-level prefers-reduced-motion signal
 * useReducedMotion() already reads. Framer Motion is JS-driven, so the
 * CSS animation-duration override in index.css can't stop it alone;
 * components that animate must check this too. */
export function useLowSensoryMode() {
  const { uiMode } = useUIMode()
  return uiMode === 'low_sensory'
}
