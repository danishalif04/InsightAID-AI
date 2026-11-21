import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { serif, ui } from '../fonts'
import { radius, shadow, theme } from '../theme'
import { clamp } from './motion'

/** A rebuilt app card: elevated surface, hairline border, deep shadow. */
export const Card: React.FC<{
  style?: React.CSSProperties
  glow?: 'brand' | 'critical' | null
  children: React.ReactNode
}> = ({ style, glow = null, children }) => (
  <div
    style={{
      background: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: radius.card,
      boxShadow: glow === 'brand' ? `${shadow.card}, ${shadow.glow}` : glow === 'critical' ? `${shadow.card}, ${shadow.critical}` : shadow.card,
      fontFamily: ui,
      color: theme.text,
      ...style,
    }}
  >
    {children}
  </div>
)

const BADGE_TONES: Record<string, { bg: string; fg: string; bd: string }> = {
  brand: { bg: 'rgba(34,197,94,0.14)', fg: '#4ade80', bd: 'rgba(34,197,94,0.35)' },
  critical: { bg: 'rgba(220,38,38,0.16)', fg: '#f87171', bd: 'rgba(220,38,38,0.40)' },
  warning: { bg: 'rgba(224,144,24,0.16)', fg: '#fbbf24', bd: 'rgba(224,144,24,0.40)' },
  neutral: { bg: 'rgba(255,255,255,0.06)', fg: theme.textMuted, bd: theme.border },
  info: { bg: 'rgba(14,150,233,0.16)', fg: '#7dd3fc', bd: 'rgba(14,150,233,0.40)' },
}

export const Badge: React.FC<{ tone?: keyof typeof BADGE_TONES; size?: number; children: React.ReactNode }> = ({
  tone = 'neutral',
  size = 15,
  children,
}) => {
  const t = BADGE_TONES[tone]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: `${size * 0.3}px ${size * 0.7}px`,
        borderRadius: radius.pill,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        fontSize: size,
        fontWeight: 600,
        fontFamily: ui,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

/** Page title in the app's own style: Manrope with one Instrument Serif italic word. */
export const PageTitle: React.FC<{ before: string; accent: string; after?: string; size?: number }> = ({
  before,
  accent,
  after = '',
  size = 64,
}) => (
  <div style={{ fontFamily: ui, fontSize: size, fontWeight: 600, letterSpacing: '-0.03em', color: theme.text, lineHeight: 1.05 }}>
    {before}
    <span style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.01em' }}>{accent}</span>
    {after}
  </div>
)

export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '6px 14px',
      borderRadius: radius.pill,
      border: '1px solid rgba(34,197,94,0.4)',
      background: 'rgba(34,197,94,0.10)',
      color: '#4ade80',
      fontSize: 15,
      fontWeight: 700,
      letterSpacing: '0.06em',
      fontFamily: ui,
    }}
  >
    {children}
  </span>
)

/** The app's floating pill top-nav, as in every dark-mode screenshot. */
export const AppNav: React.FC<{ active?: string; width?: number }> = ({ active = 'Overview', width = 1240 }) => (
  <div
    style={{
      width,
      height: 58,
      margin: '0 auto',
      borderRadius: 30,
      background: 'rgba(10,16,13,0.92)',
      border: `1px solid ${theme.border}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 18px',
      gap: 26,
      fontFamily: ui,
      fontSize: 17,
      color: theme.textMuted,
    }}
  >
    <Img src={staticFile('assets/logo/insightaid-mark.png')} style={{ width: 34, height: 34 }} />
    <span style={{ color: theme.text, fontWeight: 700, marginRight: 40 }}>InsightAid</span>
    {['Overview', 'Local Shop', 'Insights', 'Intelligence', 'Data'].map((item) => (
      <span
        key={item}
        style={
          item === active
            ? { background: theme.brand, color: '#04210f', padding: '7px 16px', borderRadius: 20, fontWeight: 700 }
            : undefined
        }
      >
        {item}
      </span>
    ))}
  </div>
)

/**
 * Small pill marking a scene's invented data, exactly as the app ribbons its
 * own demo shop. Kept deliberately quiet - top-right, low contrast - so it
 * labels without competing with the product.
 */
export const IllustrativeRibbon: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame()
  const o = interpolate(frame, [6, 20], [0, 1], clamp)
  return (
    <div
      style={{
        position: 'absolute',
        top: 34,
        right: 40,
        opacity: o * 0.85,
        padding: '6px 14px',
        borderRadius: radius.pill,
        background: 'rgba(5,8,7,0.7)',
        border: `1px solid ${theme.border}`,
        color: theme.textFaint,
        fontFamily: ui,
        fontSize: 14,
        fontWeight: 500,
        zIndex: 50,
      }}
    >
      {text}
    </div>
  )
}

export const PlatformChip: React.FC<{ id: string; label: string; logo: string | null; size?: number }> = ({
  id,
  label,
  logo,
  size = 44,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      overflow: 'hidden',
      background: theme.platform[id] ?? theme.cardRaised,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: ui,
      fontWeight: 800,
      fontSize: size * 0.42,
      flexShrink: 0,
    }}
  >
    {logo ? <Img src={staticFile(`assets/${logo}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : label[0]}
  </div>
)
