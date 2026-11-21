/**
 * Dark theme, taken from the running app rather than the plan's placeholders:
 *   surfaces/text  -> src/styles/index.css  (--color-glow-*)
 *   data colours   -> src/config/colorTokens.js (all pass 3:1 on dark)
 * so the rebuilt UI matches the dark-mode screenshots it is modelled on.
 */
export const theme = {
  bg: '#050807',
  surface: '#0a100d',
  card: '#0f1713',
  cardRaised: '#13201a',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',

  brand: '#22c55e',
  emerald: '#10b981',
  mint: '#6ee7b7',
  lime: '#a3e635',
  brandGlow: 'rgba(34,197,94,0.35)',

  text: '#f2f5f3',
  textMuted: 'rgba(242,245,243,0.62)',
  textFaint: 'rgba(242,245,243,0.40)',

  positive: '#22c55e',
  neutral: '#78716c',
  negative: '#ef4444',
  warning: '#e09018',
  critical: '#dc2626',
  criticalGlow: 'rgba(220,38,38,0.35)',

  platform: {
    tiktok: '#0e96e9',
    x: '#c3103b',
    shopee: '#db7509',
    threads: '#a855f7',
  } as Record<string, string>,
}

export const radius = { card: 22, pill: 999, button: 12 }

export const shadow = {
  card: '0 0 0 1px rgba(255,255,255,0.03), 0 30px 80px rgba(0,0,0,0.55)',
  glow: `0 0 0 1px rgba(34,197,94,0.35), 0 0 60px rgba(34,197,94,0.28)`,
  critical: `0 0 0 1px rgba(220,38,38,0.45), 0 0 60px rgba(220,38,38,0.30)`,
}

export const VIDEO = { width: 1920, height: 1080, fps: 30, frames: 3600 }

/** Inside 1680x945, per the plan's safe-area rule. */
export const SAFE = { x: 120, y: 68, w: 1680, h: 945 }
