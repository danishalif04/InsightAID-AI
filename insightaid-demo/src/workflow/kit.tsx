import { createContext, useContext } from 'react'
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Backdrop } from '../components/Backdrop'
import { clamp, expoOut, pop } from '../components/motion'
import { serif, ui } from '../fonts'
import { theme } from '../theme'

/**
 * Building blocks for the two workflow videos. Every screen shown is a real
 * capture of the running app (public/assets/wf1, wf2); this kit only moves a
 * camera over it, draws highlight boxes on top and adds a cursor. Nothing
 * inside a screenshot is redrawn or altered.
 */

// ---------------------------------------------------------------------------
// Layout: workflow rail on the left, app window on the right, captions below.
// ---------------------------------------------------------------------------
export const WIN = { x: 452, y: 64, w: 1408, h: 792 } // 16:9, same as the 1440x810 captures
export const CAPTION_CENTER_X = WIN.x + WIN.w / 2

const inOut = Easing.inOut(Easing.cubic)

/** Camera keyframe: centre (cx, cy) and visible width w, all in screenshot CSS px. */
export type Cam = { f: number; cx: number; cy: number; w: number }

const ScaleCtx = createContext(1)

function camAt(frame: number, cams: Cam[]) {
  if (cams.length === 1) return cams[0]
  const fs = cams.map((c) => c.f)
  const pick = (k: 'cx' | 'cy' | 'w') =>
    interpolate(frame, fs, cams.map((c) => c[k]), { ...clamp, easing: inOut })
  return { f: frame, cx: pick('cx'), cy: pick('cy'), w: pick('w') }
}

/**
 * A real screenshot in a rounded app window, with a frame-driven camera.
 * `w`/`h` are the capture's CSS size (the file itself is 2x for sharp zooms).
 * `swap` cross-fades to a second capture of the same page (e.g. after a click).
 */
export const Screen: React.FC<{
  src: string
  w: number
  h: number
  cams: Cam[]
  swap?: { src: string; at: number }
  box?: { x: number; y: number; w: number; h: number }
  children?: React.ReactNode
}> = ({ src, w, h, cams, swap, box = WIN, children }) => {
  const frame = useCurrentFrame()
  const cam = camAt(frame, cams)
  const scale = box.w / cam.w
  const viewH = box.h / scale
  // Keep the camera inside the image; centre the image when it is smaller than the view.
  const tx = w > cam.w ? Math.min(Math.max(cam.cx - cam.w / 2, 0), w - cam.w) : (w - cam.w) / 2
  const ty = h > viewH ? Math.min(Math.max(cam.cy - viewH / 2, 0), h - viewH) : (h - viewH) / 2
  const swapO = swap ? interpolate(frame, [swap.at, swap.at + 10], [0, 1], clamp) : 0

  return (
    <div
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        borderRadius: 24,
        overflow: 'hidden',
        background: '#050807',
        boxShadow: `0 0 0 1px rgba(34,197,94,0.28), 0 30px 90px rgba(0,0,0,0.65), 0 0 70px rgba(34,197,94,0.12)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: w,
          height: h,
          transformOrigin: '0 0',
          transform: `scale(${scale}) translate(${-tx}px, ${-ty}px)`,
        }}
      >
        <Img src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: w, height: h }} />
        {swap && <Img src={staticFile(swap.src)} style={{ position: 'absolute', inset: 0, width: w, height: h, opacity: swapO }} />}
        <ScaleCtx.Provider value={scale}>{children}</ScaleCtx.Provider>
      </div>
    </div>
  )
}

/**
 * Highlight box drawn in screenshot coordinates: glowing outline, the rest of
 * the screen dimmed, and an optional label. Line widths and text are divided
 * by the camera scale so they look the same at any zoom.
 */
export const Mark: React.FC<{
  x: number
  y: number
  w: number
  h: number
  at: number
  until?: number
  label?: string
  labelSide?: 'top' | 'bottom'
  labelAlign?: 'left' | 'right'
  dim?: boolean
}> = ({ x, y, w, h, at, until, label, labelSide = 'top', labelAlign = 'left', dim = true }) => {
  const frame = useCurrentFrame()
  const s = useContext(ScaleCtx)
  const o =
    interpolate(frame, [at, at + 10], [0, 1], { ...clamp, easing: expoOut }) *
    (until === undefined ? 1 : interpolate(frame, [until, until + 10], [1, 0], clamp))
  if (o <= 0) return null
  const grow = interpolate(frame, [at, at + 14], [10, 0], { ...clamp, easing: expoOut }) / s
  const pad = 6 / s
  return (
    <div
      style={{
        position: 'absolute',
        left: x - pad - grow,
        top: y - pad - grow,
        width: w + 2 * (pad + grow),
        height: h + 2 * (pad + grow),
        borderRadius: 16 / s,
        border: `${3 / s}px solid ${theme.brand}`,
        boxShadow: `0 0 ${28 / s}px rgba(34,197,94,0.65)${dim ? `, 0 0 0 ${4000 / s}px rgba(0,0,0,${0.5 * o})` : ''}`,
        opacity: o,
      }}
    >
      {label && (
        <div
          style={{
            position: 'absolute',
            ...(labelAlign === 'left' ? { left: -3 / s } : { right: -3 / s }),
            ...(labelSide === 'top' ? { bottom: `calc(100% + ${10 / s}px)` } : { top: `calc(100% + ${10 / s}px)` }),
            padding: `${8 / s}px ${16 / s}px`,
            borderRadius: 999,
            background: theme.brand,
            color: '#04210f',
            fontFamily: ui,
            fontWeight: 800,
            fontSize: 24 / s,
            whiteSpace: 'nowrap',
            boxShadow: `0 ${6 / s}px ${24 / s}px rgba(0,0,0,0.5)`,
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}

/** Cursor in screenshot coordinates, counter-scaled so it never grows with the zoom. */
export const ShotCursor: React.FC<{ path: { f: number; x: number; y: number }[]; clicks?: number[]; hideAt?: number }> = ({
  path,
  clicks = [],
  hideAt,
}) => {
  const frame = useCurrentFrame()
  const s = useContext(ScaleCtx)
  const fs = path.map((p) => p.f)
  const x = interpolate(frame, fs, path.map((p) => p.x), { ...clamp, easing: expoOut })
  const y = interpolate(frame, fs, path.map((p) => p.y), { ...clamp, easing: expoOut })
  const vis =
    interpolate(frame, [fs[0] - 6, fs[0]], [0, 1], clamp) *
    (hideAt === undefined ? 1 : interpolate(frame, [hideAt, hideAt + 8], [1, 0], clamp))
  if (vis <= 0) return null
  const pressing = clicks.some((c) => frame >= c && frame < c + 6)
  const ripple = clicks.map((c) => frame - c).find((d) => d >= 0 && d < 20)
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: vis, transform: `scale(${1 / s})`, transformOrigin: '0 0', zIndex: 10 }}>
      {ripple !== undefined && (
        <div
          style={{
            position: 'absolute',
            left: -30 * (ripple / 20) - 4,
            top: -30 * (ripple / 20) - 4,
            width: 8 + 60 * (ripple / 20),
            height: 8 + 60 * (ripple / 20),
            borderRadius: '50%',
            border: `3px solid ${theme.brand}`,
            opacity: 1 - ripple / 20,
          }}
        />
      )}
      <svg width="40" height="40" viewBox="0 0 24 24" style={{ transform: `scale(${pressing ? 0.85 : 1})`, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.7))' }}>
        <path d="M4 3l15 8-6.5 1.5L9 19z" fill="white" stroke="#050807" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/** Fade + slight push-in for each scene's window. */
export function sceneIn(frame: number, duration: number) {
  const o = interpolate(frame, [0, 8, duration - 8, duration], [0, 1, 1, 0], clamp)
  const s = interpolate(frame, [0, 14], [0.985, 1], { ...clamp, easing: expoOut })
  return { opacity: o, transform: `scale(${s})` }
}

// ---------------------------------------------------------------------------
// Workflow rail: the pathway's steps, the current one lit, with one line of
// plain explanation. Persistent across the screen scenes.
// ---------------------------------------------------------------------------
export type Step = { title: string; detail: string; from: number }

export const Rail: React.FC<{ path: string; kicker: string; steps: Step[]; footnote: string; start: number; end: number }> = ({
  path,
  kicker,
  steps,
  footnote,
  start,
  end,
}) => {
  const frame = useCurrentFrame()
  const enter = interpolate(frame, [start, start + 18], [0, 1], { ...clamp, easing: expoOut })
  const exit = interpolate(frame, [end - 10, end], [1, 0], clamp)
  if (frame < start || frame > end) return null
  const current = steps.reduce((acc, s, i) => (frame >= s.from ? i : acc), 0)

  return (
    <div
      style={{
        position: 'absolute',
        left: 56,
        top: 70,
        width: 352,
        opacity: enter * exit,
        transform: `translateX(${(1 - enter) * -40}px)`,
        fontFamily: ui,
        zIndex: 40,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.14em', color: theme.brand, textTransform: 'uppercase' }}>{kicker}</div>
      <div style={{ fontSize: 34, fontWeight: 800, color: theme.text, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 8 }}>{path}</div>

      <div style={{ position: 'relative', marginTop: 34 }}>
        {/* the line the steps hang on */}
        <div style={{ position: 'absolute', left: 17, top: 18, bottom: 18, width: 2, background: 'rgba(255,255,255,0.08)' }} />
        <div
          style={{
            position: 'absolute',
            left: 17,
            top: 18,
            width: 2,
            height: `${(current / Math.max(1, steps.length - 1)) * 100}%`,
            maxHeight: 'calc(100% - 36px)',
            background: theme.brand,
            boxShadow: `0 0 12px ${theme.brand}`,
          }}
        />
        {steps.map((s, i) => {
          const done = i < current
          const on = i === current
          const lit = interpolate(frame, [s.from, s.from + 12], [0, 1], clamp)
          return (
            <div key={s.title} style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 20, position: 'relative' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 800,
                  background: on ? theme.brand : done ? 'rgba(34,197,94,0.18)' : theme.card,
                  color: on ? '#04210f' : done ? theme.brand : theme.textFaint,
                  border: `1px solid ${on || done ? theme.brand : theme.borderStrong}`,
                  boxShadow: on ? `0 0 ${24 * lit}px ${theme.brandGlow}` : undefined,
                }}
              >
                {done ? '✓' : i + 1}
              </div>
              <div style={{ paddingTop: 5, minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: on ? 800 : 600, color: on ? theme.text : done ? theme.textMuted : theme.textFaint, lineHeight: 1.2 }}>
                  {s.title}
                </div>
                {on && (
                  <div
                    style={{
                      fontSize: 17,
                      color: theme.textMuted,
                      lineHeight: 1.4,
                      marginTop: 6,
                      opacity: lit,
                      transform: `translateY(${(1 - lit) * 8}px)`,
                    }}
                  >
                    {s.detail}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          marginTop: 14,
          display: 'inline-block',
          padding: '8px 14px',
          borderRadius: 999,
          border: `1px solid ${theme.borderStrong}`,
          fontSize: 14,
          fontWeight: 600,
          color: theme.textFaint,
        }}
      >
        {footnote}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hook and end card
// ---------------------------------------------------------------------------
export const Hook: React.FC<{ duration: number; kicker: string; line: string; accent: string; sub: string; extra?: React.ReactNode }> = ({
  duration,
  kicker,
  line,
  accent,
  sub,
  extra,
}) => {
  const frame = useCurrentFrame()
  const k = interpolate(frame, [4, 20], [0, 1], { ...clamp, easing: expoOut })
  const h = interpolate(frame, [10, 32], [0, 1], { ...clamp, easing: expoOut })
  const sb = interpolate(frame, [44, 62], [0, 1], { ...clamp, easing: expoOut })
  const out = interpolate(frame, [duration - 10, duration], [1, 0], clamp)
  const [a, b] = line.split(accent)
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Backdrop glow={1.2}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', fontFamily: ui, marginTop: -40 }}>
          <div style={{ opacity: k, fontSize: 22, fontWeight: 800, letterSpacing: '0.18em', color: theme.brand, textTransform: 'uppercase' }}>{kicker}</div>
          <div
            style={{
              opacity: h,
              transform: `translateY(${(1 - h) * 30}px)`,
              fontSize: 120,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: theme.text,
              marginTop: 18,
              textAlign: 'center',
              lineHeight: 1.02,
            }}
          >
            {a}
            <span style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 400, color: theme.brand, letterSpacing: '-0.01em' }}>{accent}</span>
            {b}
          </div>
          <div style={{ opacity: sb, transform: `translateY(${(1 - sb) * 16}px)`, fontSize: 40, fontWeight: 600, color: theme.textMuted, marginTop: 22 }}>{sub}</div>
          {extra}
        </AbsoluteFill>
      </Backdrop>
    </AbsoluteFill>
  )
}

export const EndCard: React.FC<{ duration: number; line: string }> = ({ duration, line }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const lock = pop(frame, fps, 6)
  const tag = interpolate(frame, [30, 50], [0, 1], { ...clamp, easing: expoOut })
  const sub = interpolate(frame, [52, 70], [0, 1], { ...clamp, easing: expoOut })
  const breathe = 0.75 + 0.25 * Math.sin(frame / 14)
  const out = interpolate(frame, [duration - 12, duration], [1, 0], clamp)
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Backdrop glow={1.5}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', fontFamily: ui, marginTop: -60 }}>
          <Img
            src={staticFile('assets/logo/insightaid-lockup.png')}
            style={{
              width: 760,
              opacity: frame >= 6 ? 1 : 0,
              transform: `scale(${0.85 + 0.15 * lock})`,
              filter: `drop-shadow(0 0 2px rgba(0,0,0,0.6)) drop-shadow(0 0 ${40 * breathe}px rgba(34,197,94,0.45))`,
            }}
          />
          <div style={{ opacity: tag, transform: `translateY(${(1 - tag) * 16}px)`, fontSize: 52, fontWeight: 700, color: theme.text, marginTop: 10 }}>
            Decisions, backed by <span style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 400, color: theme.brand, fontSize: 58 }}>evidence</span>.
          </div>
          <div style={{ opacity: sub, fontSize: 28, fontWeight: 600, color: theme.textMuted, marginTop: 18 }}>{line}</div>
        </AbsoluteFill>
      </Backdrop>
    </AbsoluteFill>
  )
}

/** Small chip above a screen naming what is being shown (used in montages). */
export const ScreenTag: React.FC<{ text: string; at?: number }> = ({ text, at = 6 }) => {
  const frame = useCurrentFrame()
  const o = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: expoOut })
  return (
    <div
      style={{
        position: 'absolute',
        left: WIN.x + 28,
        top: WIN.y + WIN.h - 76,
        padding: '12px 22px',
        borderRadius: 999,
        background: 'rgba(5,8,7,0.82)',
        border: `1px solid rgba(34,197,94,0.45)`,
        color: theme.text,
        fontFamily: ui,
        fontWeight: 800,
        fontSize: 26,
        opacity: o,
        transform: `translateY(${(1 - o) * 12}px)`,
        zIndex: 30,
      }}
    >
      {text}
    </div>
  )
}
