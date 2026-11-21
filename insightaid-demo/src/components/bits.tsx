import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { ui } from '../fonts'
import { radius, theme } from '../theme'
import { clamp, expoOut, ui as uiSpring } from './motion'

/** Number that counts up. Tabular figures so the width never jitters. */
export const CountUp: React.FC<{
  to: number
  start: number
  dur?: number
  decimals?: number
  prefix?: string
  suffix?: string
  style?: React.CSSProperties
}> = ({ to, start, dur = 36, decimals = 0, prefix = '', suffix = '', style }) => {
  const frame = useCurrentFrame()
  const v = interpolate(frame, [start, start + dur], [0, to], { ...clamp, easing: expoOut })
  const text = v.toLocaleString('en-MY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      {prefix}
      {text}
      {suffix}
    </span>
  )
}

/** Animated cursor that travels between points and clicks. */
export const Cursor: React.FC<{
  path: { f: number; x: number; y: number }[]
  clickAt?: number[]
  /** Fade the cursor out from this frame, so it never lingers on a new view. */
  hideAt?: number
}> = ({ path, clickAt = [], hideAt }) => {
  const frame = useCurrentFrame()
  const fs = path.map((p) => p.f)
  const x = interpolate(frame, fs, path.map((p) => p.x), { ...clamp, easing: expoOut })
  const y = interpolate(frame, fs, path.map((p) => p.y), { ...clamp, easing: expoOut })
  const pressing = clickAt.some((c) => frame >= c && frame < c + 6)
  const ripple = clickAt.map((c) => frame - c).find((d) => d >= 0 && d < 20)
  const visible =
    interpolate(frame, [fs[0] - 6, fs[0]], [0, 1], clamp) *
    (hideAt === undefined ? 1 : interpolate(frame, [hideAt, hideAt + 8], [1, 0], clamp))

  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: visible, zIndex: 60, pointerEvents: 'none' }}>
      {ripple !== undefined && (
        <div
          style={{
            position: 'absolute',
            left: -30 * (ripple / 20) - 4,
            top: -30 * (ripple / 20) - 4,
            width: 8 + 60 * (ripple / 20),
            height: 8 + 60 * (ripple / 20),
            borderRadius: '50%',
            border: `2px solid ${theme.brand}`,
            opacity: 1 - ripple / 20,
          }}
        />
      )}
      <svg width="34" height="34" viewBox="0 0 24 24" style={{ transform: `scale(${pressing ? 0.86 : 1})`, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))' }}>
        <path d="M4 3l15 8-6.5 1.5L9 19z" fill="white" stroke="#050807" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/** Frosted notification toast that drops in from the top. */
export const Toast: React.FC<{
  at: number
  tone?: 'warning' | 'brand'
  title: string
  body: string
  /** Default is top-centre; pass top/right to anchor it clear of the nav. */
  top?: number
  right?: number
}> = ({ at, tone = 'warning', title, body, top = 60, right }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = uiSpring(frame, fps, at)
  const color = tone === 'warning' ? theme.warning : theme.brand
  return (
    <div
      style={{
        position: 'absolute',
        top,
        ...(right === undefined ? { left: '50%' } : { right }),
        transform: right === undefined ? `translate(-50%, ${(1 - s) * -140}px)` : `translateX(${(1 - s) * 160}px)`,
        opacity: s,
        width: right === undefined ? 760 : 640,
        padding: '18px 24px',
        borderRadius: 18,
        background: 'rgba(15,23,19,0.88)',
        border: `1px solid ${color}66`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${color}33`,
        backdropFilter: 'blur(12px)',
        fontFamily: ui,
        zIndex: 55,
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 26, fontWeight: 800 }}>
        !
      </div>
      <div>
        <div style={{ color, fontWeight: 700, fontSize: 20 }}>{title}</div>
        <div style={{ color: theme.textMuted, fontSize: 17, marginTop: 2 }}>{body}</div>
      </div>
    </div>
  )
}

/** Large on-screen headline. At most one on screen, per the plan. */
export const Headline: React.FC<{
  text: string
  accent?: string
  at: number
  size?: number
  y?: number
  serifAccent?: boolean
}> = ({ text, accent, at, size = 104, y = 0 }) => {
  const frame = useCurrentFrame()
  const p = interpolate(frame, [at, at + 22], [0, 1], { ...clamp, easing: expoOut })
  const parts = accent ? text.split(accent) : [text]
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `translateY(${y}px)` }}>
      <div
        style={{
          fontFamily: ui,
          fontWeight: 800,
          fontSize: size,
          letterSpacing: '-0.035em',
          color: theme.text,
          textAlign: 'center',
          opacity: p,
          transform: `translateY(${(1 - p) * 30}px)`,
          lineHeight: 1.02,
          maxWidth: 1600,
        }}
      >
        {parts[0]}
        {accent && (
          <span style={{ background: 'linear-gradient(120deg, #34d399, #22c55e 50%, #a3e635)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            {accent}
          </span>
        )}
        {parts[1]}
      </div>
    </AbsoluteFill>
  )
}

export const Pill: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 20px',
      borderRadius: radius.pill,
      background: theme.cardRaised,
      border: `1px solid ${theme.borderStrong}`,
      fontFamily: ui,
      fontSize: 20,
      fontWeight: 600,
      color: theme.text,
      ...style,
    }}
  >
    {children}
  </span>
)
