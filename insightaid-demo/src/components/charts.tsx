import { interpolate, useCurrentFrame } from 'remotion'
import { ui } from '../fonts'
import { theme } from '../theme'
import { clamp, expoOut } from './motion'

/**
 * All charts are hand-built SVG driven by the current frame - no charting
 * library, no auto-animation - so every render of a given frame is identical.
 */

const GRID = 'rgba(255,255,255,0.06)'

function toPath(pts: [number, number][]) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
}

/** Approximate polyline length, for stroke-dash drawing. */
function length(pts: [number, number][]) {
  let l = 0
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  return l
}

/**
 * Sales history (solid) running into a forecast (dashed) with a widening
 * uncertainty band and a "Today" marker. Values are 0..1 shape only - no
 * axis numbers are drawn, so the curve cannot be read as a measured figure.
 */
export const ForecastChart: React.FC<{
  w: number
  h: number
  history: number[]
  forecast: number[]
  start: number
}> = ({ w, h, history, forecast, start }) => {
  const frame = useCurrentFrame()
  const n = history.length + forecast.length - 1
  const pad = { l: 20, r: 20, t: 24, b: 40 }
  const X = (i: number) => pad.l + (i / n) * (w - pad.l - pad.r)
  const Y = (v: number) => pad.t + (1 - v) * (h - pad.t - pad.b)

  const hist: [number, number][] = history.map((v, i) => [X(i), Y(v)])
  const fcIdx0 = history.length - 1
  const fc: [number, number][] = [[X(fcIdx0), Y(history[fcIdx0])], ...forecast.map((v, i) => [X(fcIdx0 + i + 1), Y(v)] as [number, number])]

  const histLen = length(hist)
  const fcLen = length(fc)
  const pH = interpolate(frame, [start, start + 40], [0, 1], { ...clamp, easing: expoOut })
  const pF = interpolate(frame, [start + 34, start + 70], [0, 1], { ...clamp, easing: expoOut })
  const pB = interpolate(frame, [start + 40, start + 80], [0, 1], { ...clamp, easing: expoOut })

  // Band widens with horizon - uncertainty grows the further ahead you look.
  const upper = fc.map(([x, y], i) => [x, y - (i / fc.length) * 70 * pB] as [number, number])
  const lower = fc.map(([x, y], i) => [x, y + (i / fc.length) * 70 * pB] as [number, number])
  const band = `${toPath(upper)} ${lower.reverse().map((p) => `L${p[0]},${p[1]}`).join(' ')} Z`
  const area = `${toPath(hist)} L${hist[hist.length - 1][0]},${h - pad.b} L${hist[0][0]},${h - pad.b} Z`
  const todayX = X(fcIdx0)

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.brand} stopOpacity={0.28} />
          <stop offset="100%" stopColor={theme.brand} stopOpacity={0} />
        </linearGradient>
        <clipPath id="histClip">
          <rect x={0} y={0} width={pad.l + pH * (todayX - pad.l)} height={h} />
        </clipPath>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={pad.l} x2={w - pad.r} y1={Y(g)} y2={Y(g)} stroke={GRID} strokeDasharray="4 6" />
      ))}
      <path d={area} fill="url(#areaFill)" clipPath="url(#histClip)" />
      <path d={band} fill="rgba(110,231,183,0.12)" stroke="none" />
      <path d={toPath(hist)} fill="none" stroke={theme.brand} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={histLen} strokeDashoffset={histLen * (1 - pH)} />
      <path d={toPath(fc)} fill="none" stroke={theme.mint} strokeWidth={4} strokeDasharray="10 9" strokeLinecap="round" opacity={pF > 0 ? 1 : 0} style={{ clipPath: `inset(0 ${(1 - pF) * 100}% 0 0)` }} />
      <line x1={todayX} x2={todayX} y1={pad.t - 10} y2={h - pad.b} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 5" opacity={pH} />
      <text x={todayX} y={h - 12} textAnchor="middle" fill={theme.textMuted} fontFamily={ui} fontSize={18} fontWeight={600} opacity={pH}>
        Today
      </text>
    </svg>
  )
}

/** Horizontal bars that grow in sequence. `max` sets the full-width value. */
export const HBars: React.FC<{
  w: number
  rows: { label: string; value: number; color: string; display?: string }[]
  start: number
  max?: number
  barH?: number
  gap?: number
  labelW?: number
}> = ({ w, rows, start, max = 100, barH = 30, gap = 26, labelW = 200 }) => {
  const frame = useCurrentFrame()
  const trackW = w - labelW - 110
  return (
    <div style={{ width: w, fontFamily: ui }}>
      {rows.map((r, i) => {
        const p = interpolate(frame, [start + i * 6, start + i * 6 + 30], [0, 1], { ...clamp, easing: expoOut })
        return (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', marginBottom: gap }}>
            <div style={{ width: labelW, color: theme.textMuted, fontSize: 22, fontWeight: 600 }}>{r.label}</div>
            <div style={{ width: trackW, height: barH, borderRadius: barH / 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{ width: `${(r.value / max) * 100 * p}%`, height: '100%', borderRadius: barH / 2, background: r.color, boxShadow: `0 0 24px ${r.color}55` }} />
            </div>
            <div style={{ width: 110, textAlign: 'right', color: theme.text, fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', opacity: p }}>
              {r.display ?? `${(r.value * p).toFixed(2)}%`}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** The Crisis page's risk ring: arc sweeps to `score`/100. */
export const RiskDial: React.FC<{ score: number; start: number; size?: number; color: string; label: string }> = ({
  score,
  start,
  size = 260,
  color,
  label,
}) => {
  const frame = useCurrentFrame()
  const p = interpolate(frame, [start, start + 40], [0, 1], { ...clamp, easing: expoOut })
  const r = size / 2 - 16
  const c = 2 * Math.PI * r
  const shown = Math.round(score * p)
  return (
    <div style={{ position: 'relative', width: size, height: size, fontFamily: ui }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={16} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (score / 100) * p)}
          style={{ filter: `drop-shadow(0 0 12px ${color})` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: size * 0.27, fontWeight: 800, color: theme.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{shown}</div>
        <div style={{ fontSize: size * 0.07, color: theme.textMuted, marginTop: 4 }}>/ 100</div>
        <div style={{ fontSize: size * 0.075, color, fontWeight: 700, marginTop: 6 }}>{label}</div>
      </div>
    </div>
  )
}

/** Small sparkline-style sentiment trend for the dashboard rebuild. */
export const MiniTrend: React.FC<{ w: number; h: number; values: number[]; start: number; color?: string }> = ({
  w,
  h,
  values,
  start,
  color = theme.brand,
}) => {
  const frame = useCurrentFrame()
  const pts: [number, number][] = values.map((v, i) => [10 + (i / (values.length - 1)) * (w - 20), 10 + (1 - v) * (h - 20)])
  const L = length(pts)
  const p = interpolate(frame, [start, start + 40], [0, 1], { ...clamp, easing: expoOut })
  const area = `${toPath(pts)} L${w - 10},${h} L10,${h} Z`
  return (
    <svg width={w} height={h}>
      <defs>
        <linearGradient id="mt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#mt)" opacity={p} />
      <path d={toPath(pts)} fill="none" stroke={color} strokeWidth={3.5} strokeDasharray={L} strokeDashoffset={L * (1 - p)} strokeLinecap="round" />
    </svg>
  )
}
