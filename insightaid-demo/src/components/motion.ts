import { Easing, interpolate, spring } from 'remotion'

/** Expo-out, the plan's text curve: bezier(0.16, 1, 0.3, 1). */
export const expoOut = Easing.bezier(0.16, 1, 0.3, 1)

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** 0 -> 1 over `dur` frames starting at `start`, eased. */
export function progress(frame: number, start: number, dur = 18, easing = expoOut) {
  return interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing })
}

/** The plan's standard entrance: fade + 24px rise + 0.96 -> 1 scale. */
export function rise(frame: number, start: number, dur = 18) {
  const p = progress(frame, start, dur)
  return {
    opacity: p,
    transform: `translateY(${(1 - p) * 24}px) scale(${0.96 + 0.04 * p})`,
  }
}

/** UI spring from the plan: damping 200, stiffness 120. */
export function ui(frame: number, fps: number, delay = 0) {
  return spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 120 } })
}

/** Springier variant for logo pops - allows overshoot. */
export function pop(frame: number, fps: number, delay = 0) {
  return spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 140, mass: 0.8 } })
}

/** Fade the whole scene out over its last `tail` frames. */
export function sceneFade(frame: number, duration: number, tail = 10, head = 8) {
  return interpolate(frame, [0, head, duration - tail, duration], [0, 1, 1, 0], clamp)
}
