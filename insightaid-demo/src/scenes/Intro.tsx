import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Backdrop } from '../components/Backdrop'
import { Headline } from '../components/bits'
import { clamp, expoOut, pop, sceneFade } from '../components/motion'
import { IllustrativeRibbon, PlatformChip } from '../components/ui'
import { brand, illustrativeRibbon, platforms, problemStats, scenario, sceneCaptions } from '../data/content'
import { serif, ui } from '../fonts'
import { theme } from '../theme'

// ---------------------------------------------------------------------------
// Scene 1 - Cold open: tiles orbit, multilingual comments pop, headline rolls.
// ---------------------------------------------------------------------------
export const S01ColdOpen: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame()
  const tiles = [...platforms, { id: 'chat', label: '💬', logo: null }, { id: 'chart', label: '📈', logo: null }, { id: 'receipt', label: '🧾', logo: null }]

  // Slot-roll words, then the full line.
  const words = ['Comments.', 'Reviews.', 'Sales.']
  const wordIdx = Math.min(2, Math.floor(Math.max(0, frame - 8) / 22))
  const showWords = frame < 82
  const comments = scenario.comments.value

  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, duration) }}>
      <Backdrop noisy>
        <AbsoluteFill style={{ perspective: 1600 }}>
          {tiles.map((t, i) => {
            const a = (i / tiles.length) * Math.PI * 2 + frame * 0.012
            const enter = interpolate(frame, [i * 3, i * 3 + 30], [0, 1], { ...clamp, easing: expoOut })
            // Wide ellipse so the tiles circle the headline instead of crossing it.
            const x = Math.cos(a) * 760
            const y = Math.sin(a) * 330
            const z = Math.sin(a) * 260 - (1 - enter) * 1400
            // Recede behind the headline once it lands, so it always reads.
            const behind = interpolate(frame, [80, 100], [1, 0.35], clamp)
            return (
              <div
                key={t.id}
                style={{
                  position: 'absolute',
                  left: 960 - 46 + x,
                  top: 480 - 46 + y,
                  // Gentle wobble only - a large rotateY turns the tiles edge-on.
                  transform: `translateZ(${z}px) rotateY(${Math.sin(a) * 22}deg) rotateX(${Math.cos(a) * 10}deg)`,
                  opacity: enter * behind * (0.55 + 0.45 * ((Math.sin(a) + 1) / 2)),
                  filter: `blur(${Math.max(0, (1 - enter) * 8)}px)`,
                }}
              >
                {['tiktok', 'x', 'shopee', 'threads'].includes(t.id) ? (
                  <PlatformChip id={t.id} label={t.label} logo={t.logo} size={92} />
                ) : (
                  <div style={{ width: 92, height: 92, borderRadius: 26, background: 'rgba(255,255,255,0.08)', border: `1px solid ${theme.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, backdropFilter: 'blur(6px)' }}>
                    {t.label}
                  </div>
                )}
              </div>
            )
          })}

          {comments.map((c, i) => {
            const at = 24 + i * 12
            const s = interpolate(frame, [at, at + 14], [0, 1], { ...clamp, easing: expoOut })
            // Corners, clear of both the headline band and the caption bar.
            const pos = [
              { x: 150, y: 150 },
              { x: 1380, y: 150 },
              { x: 150, y: 760 },
              { x: 1380, y: 760 },
            ][i]
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  transform: `scale(${s})`,
                  opacity: s,
                  padding: '14px 22px',
                  borderRadius: '22px 22px 22px 6px',
                  background: 'rgba(20,31,26,0.92)',
                  border: `1px solid ${theme.borderStrong}`,
                  color: theme.text,
                  fontFamily: ui,
                  fontSize: 25,
                  fontWeight: 500,
                  maxWidth: 420,
                }}
              >
                {c.text}
              </div>
            )
          })}
        </AbsoluteFill>

        {showWords ? (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ height: 130, overflow: 'hidden', fontFamily: ui, fontWeight: 800, fontSize: 116, letterSpacing: '-0.04em', color: theme.text }}>
              <div style={{ transform: `translateY(${-wordIdx * 130}px)`, transition: 'none' }}>
                {words.map((w, i) => (
                  <div key={w} style={{ height: 130, lineHeight: '130px', textAlign: 'center', color: i === 2 ? theme.brand : theme.text }}>
                    {w}
                  </div>
                ))}
              </div>
            </div>
          </AbsoluteFill>
        ) : (
          <Headline text={sceneCaptions[1]} accent="talking" at={84} size={110} />
        )}
      </Backdrop>
      <IllustrativeRibbon text={illustrativeRibbon} />
    </AbsoluteFill>
  )
}

// ---------------------------------------------------------------------------
// Scene 2 - The problem: noise wall glitches, three stat cards rise on Z.
// ---------------------------------------------------------------------------
export const S02Problem: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame()
  const glitch = frame < 40 ? Math.sin(frame * 2.3) * 8 * (1 - frame / 40) : 0
  const collapse = interpolate(frame, [duration - 22, duration - 4], [0, 1], { ...clamp, easing: expoOut })

  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, duration, 4) }}>
      <Backdrop noisy>
        {/* Wall of comment noise, behind the cards. */}
        <AbsoluteFill style={{ opacity: interpolate(frame, [0, 30, 60], [0.9, 0.5, 0.18], clamp), filter: 'blur(1.5px)' }}>
          {Array.from({ length: 34 }).map((_, i) => {
            const c = scenario.comments.value[i % scenario.comments.value.length]
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: ((i * 263) % 1780) + 20,
                  top: ((i * 151) % 980) + 20,
                  padding: '8px 14px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.05)',
                  color: theme.textFaint,
                  fontFamily: ui,
                  fontSize: 18,
                  textShadow: glitch ? `${glitch}px 0 rgba(255,0,80,0.7), ${-glitch}px 0 rgba(0,200,255,0.7)` : undefined,
                }}
              >
                {c.text}
              </div>
            )
          })}
        </AbsoluteFill>

        <AbsoluteFill style={{ perspective: 2000, transform: `scale(${1 - collapse * 0.97})`, opacity: 1 - collapse }}>
          <div style={{ position: 'absolute', top: 210, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 44, transformStyle: 'preserve-3d', transform: 'rotateX(10deg)' }}>
            {problemStats.map((st, i) => {
              const at = 26 + i * 16
              const p = interpolate(frame, [at, at + 26], [0, 1], { ...clamp, easing: expoOut })
              const z = [60, 160, 60][i]
              const num = st.value.figure
              const numeric = num.endsWith('%') ? parseInt(num, 10) : null
              const shown = numeric !== null ? `${Math.round(numeric * interpolate(frame, [at, at + 40], [0, 1], { ...clamp, easing: expoOut }))}%` : num
              return (
                <div
                  key={i}
                  style={{
                    width: 470,
                    height: 330,
                    padding: 38,
                    borderRadius: 28,
                    background: 'rgba(15,23,19,0.82)',
                    border: `1px solid ${theme.borderStrong}`,
                    boxShadow: '0 40px 90px rgba(0,0,0,0.6)',
                    transform: `translateZ(${z * p}px) translateY(${(1 - p) * 120}px)`,
                    opacity: p,
                    fontFamily: ui,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: num.length > 6 ? 58 : 108, fontWeight: 800, letterSpacing: '-0.04em', color: theme.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    {shown}
                  </div>
                  <div>
                    <div style={{ fontSize: 28, color: theme.textMuted, fontWeight: 600, lineHeight: 1.25 }}>{st.value.caption}</div>
                    {st.value.attribution && <div style={{ fontSize: 18, color: theme.textFaint, marginTop: 12 }}>{st.value.attribution}</div>}
                  </div>
                </div>
              )
            })}
          </div>
          <div
            style={{
              position: 'absolute',
              top: 640,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: ui,
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: theme.text,
              opacity: interpolate(frame, [96, 118], [0, 1], clamp),
            }}
          >
            {sceneCaptions[2]}
          </div>
        </AbsoluteFill>

        {/* Everything pulls into a single point of light. */}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', boxShadow: `0 0 ${40 + collapse * 60}px ${10 + collapse * 30}px ${theme.mint}`, opacity: collapse }} />
        </AbsoluteFill>
      </Backdrop>
    </AbsoluteFill>
  )
}

// ---------------------------------------------------------------------------
// Scene 3 - Brand reveal: light splits into two lines, logo pops, tagline.
// ---------------------------------------------------------------------------
export const S03Brand: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const split = interpolate(frame, [0, 18], [0, 1], { ...clamp, easing: expoOut })
  const logo = pop(frame, fps, 12)
  const type = Math.round(interpolate(frame, [30, 58], [0, brand.wordmark.length], clamp))
  const tag = interpolate(frame, [62, 84], [0, 1], { ...clamp, easing: expoOut })
  const wipe = interpolate(frame, [duration - 30, duration], [0, 1], clamp)
  const bars = ['#0b3d26', '#10b981', '#0d9488', '#a3e635']

  return (
    <AbsoluteFill>
      <Backdrop glow={1.3}>
        {/* Two vertical lines parting from the centre. */}
        {[-1, 1].map((d) => (
          <div key={d} style={{ position: 'absolute', top: 0, bottom: 0, left: 960 + d * split * 520, width: 2, background: `linear-gradient(transparent, ${theme.mint}, transparent)`, opacity: 1 - interpolate(frame, [30, 50], [0, 1], clamp) }} />
        ))}

        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 18, marginTop: -40 }}>
          <Img
            src={staticFile('assets/logo/insightaid-mark.png')}
            style={{ width: 300, height: 300, transform: `scale(${logo})`, filter: `drop-shadow(0 0 ${50 * logo}px rgba(34,197,94,0.55))` }}
          />
          <div style={{ fontFamily: ui, fontWeight: 800, fontSize: 92, letterSpacing: '-0.035em', color: theme.text, height: 100 }}>
            {/* Split by POSITION, never by searching for "AI": the word
                "INSIGHTAID" itself contains "AI", so a string replace
                deletes the wrong one and renders "INSIGHTD AIAI". */}
            {brand.wordmark.slice(0, Math.min(type, brand.wordmark.length - 2))}
            {type > brand.wordmark.length - 2 && (
              <span style={{ background: 'linear-gradient(120deg, #34d399, #22c55e 50%, #a3e635)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                {brand.wordmark.slice(brand.wordmark.length - 2, type)}
              </span>
            )}
          </div>
          <div style={{ fontFamily: ui, fontSize: 44, fontWeight: 600, color: theme.textMuted, opacity: tag, transform: `translateY(${(1 - tag) * 16}px)` }}>
            Decisions, backed by <span style={{ fontFamily: serif, fontStyle: 'italic', color: theme.brand, fontSize: 50 }}>evidence</span>.
          </div>
        </AbsoluteFill>

        {/* Colour-bar wipe into the clean half of the video. */}
        <AbsoluteFill style={{ flexDirection: 'row' }}>
          {bars.map((c, i) => {
            const p = interpolate(wipe, [i * 0.12, 0.6 + i * 0.12], [0, 1], { ...clamp, easing: expoOut })
            return <div key={c} style={{ flex: 1, background: c, transform: `translateY(${(1 - p) * 100}%)` }} />
          })}
        </AbsoluteFill>
      </Backdrop>
    </AbsoluteFill>
  )
}
