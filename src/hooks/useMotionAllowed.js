import { useReducedMotion } from './useReducedMotion'
import { useLowSensoryMode } from './useLowSensoryMode'

/** Combines the OS-level prefers-reduced-motion signal with FYP II Phase
 * 7's explicit Low-Sensory mode (which disables Framer Motion regardless
 * of the OS setting) — the one check every new Framer Motion usage in the
 * "dark glow" redesign should gate on, so neither signal can be missed. */
export function useMotionAllowed() {
  const reduced = useReducedMotion()
  const lowSensory = useLowSensoryMode()
  return !reduced && !lowSensory
}
