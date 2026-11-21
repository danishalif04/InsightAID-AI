import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { Backdrop } from '../components/Backdrop'
import { Camera3D, Layer } from '../components/Camera3D'
import { Cursor } from '../components/bits'
import { clamp, expoOut, sceneFade, ui as uiSpring } from '../components/motion'
import { AppNav, Badge, Card, IllustrativeRibbon, PageTitle, PlatformChip } from '../components/ui'
import { illustrativeRibbon, pipeline, platforms, scenario, sceneCaptions } from '../data/content'
import { ui } from '../fonts'
import { theme } from '../theme'

// ---------------------------------------------------------------------------
// Scene 4 - How it works: five cards on a 3D curve, camera tracks along them.
// ---------------------------------------------------------------------------
export const S04Pipeline: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame()
  const track = interpolate(frame, [0, duration - 40], [520, -520], { ...clamp, easing: expoOut })
  const fly = interpolate(frame, [duration - 34, duration], [0, 1], { ...clamp, easing: expoOut })
  const spacing = 430
  const icons = ['⇣', '⚙', '🗄', '✦', '▦']

  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, duration, 6) }}>
      <Backdrop>
        <div style={{ position: 'absolute', top: 96, width: '100%', textAlign: 'center', fontFamily: ui, fontSize: 54, fontWeight: 800, letterSpacing: '-0.03em', color: theme.text, opacity: interpolate(frame, [4, 22], [0, 1], clamp) }}>
          {sceneCaptions[4]}
        </div>
        <Camera3D rx={12} ry={-14} x={track} z={fly * 900}>
          <Layer>
            {/* Connector line drawn across all five cards. */}
            <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} width={1920} height={1080}>
              {pipeline.slice(0, -1).map((_, i) => {
                const x1 = 960 + (i - 2) * spacing + 170
                const x2 = 960 + (i - 1) * spacing - 170
                const y = 560 + Math.sin(i * 0.9) * 40
                const y2 = 560 + Math.sin((i + 1) * 0.9) * 40
                const p = interpolate(frame, [16 + i * 14, 40 + i * 14], [0, 1], clamp)
                return (
                  <g key={i}>
                    <line x1={x1} y1={y} x2={x1 + (x2 - x1) * p} y2={y + (y2 - y) * p} stroke={theme.brand} strokeWidth={4} style={{ filter: `drop-shadow(0 0 8px ${theme.brand})` }} />
                    {[0, 1, 2].map((k) => {
                      const t = ((frame * 0.02 + k / 3 + i * 0.1) % 1)
                      return p >= 1 ? <circle key={k} cx={x1 + (x2 - x1) * t} cy={y + (y2 - y) * t} r={6} fill={theme.mint} opacity={0.9} /> : null
                    })}
                  </g>
                )
              })}
            </svg>
          </Layer>
          {pipeline.map((step, i) => {
            const p = interpolate(frame, [8 + i * 10, 30 + i * 10], [0, 1], { ...clamp, easing: expoOut })
            const cx = 960 + (i - 2) * spacing
            // Card lifts as the camera passes it.
            const nearness = 1 - Math.min(1, Math.abs(cx + track - 960) / 500)
            return (
              <Layer key={step.step} z={40 + nearness * 200}>
                <Card
                  glow={nearness > 0.6 ? 'brand' : null}
                  style={{ position: 'absolute', left: cx - 170, top: 430 + Math.sin(i * 0.9) * 40, width: 340, height: 260, padding: 28, opacity: p, transform: `translateY(${(1 - p) * 60}px)` }}
                >
                  <div style={{ width: 58, height: 58, borderRadius: 16, background: 'rgba(34,197,94,0.14)', color: theme.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>{icons[i]}</div>
                  <div style={{ fontSize: 15, color: theme.textFaint, marginTop: 18, fontWeight: 700, letterSpacing: '0.08em' }}>STEP {i + 1}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>{step.step}</div>
                  <div style={{ fontSize: 18, color: theme.textMuted, marginTop: 10, lineHeight: 1.35 }}>{step.detail}</div>
                  {i === 0 && (
                    <div style={{ display: 'flex', gap: 8, position: 'absolute', top: 28, right: 28 }}>
                      {platforms.map((pl) => <PlatformChip key={pl.id} {...pl} size={30} />)}
                    </div>
                  )}
                </Card>
              </Layer>
            )
          })}
        </Camera3D>
      </Backdrop>
    </AbsoluteFill>
  )
}

// ---------------------------------------------------------------------------
// Scene 5 - Connect data: Dataset Management rebuild, drag-drop, sources connect.
// ---------------------------------------------------------------------------
export const S05Connect: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const morph = interpolate(frame, [14, 40], [0, 1], { ...clamp, easing: expoOut })
  const flatten = interpolate(frame, [10, 50], [1, 0], { ...clamp, easing: expoOut })
  const drop = 92
  const progress = interpolate(frame, [drop, drop + 34], [0, 1], { ...clamp, easing: expoOut })
  const langs = ['BM', '中文', 'EN']

  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, duration) }}>
      <Backdrop>
        <Camera3D rx={12 * flatten} ry={-18 * flatten}>
          <Layer z={-500} blur={6} opacity={0.25}>
            <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 1500, height: 800, borderRadius: 30, background: theme.surface, border: `1px solid ${theme.border}` }} />
            </AbsoluteFill>
          </Layer>
          <Layer>
            <div style={{ position: 'absolute', top: 40, left: 0, right: 0 }}>
              <AppNav active="Data" />
            </div>
            <div style={{ position: 'absolute', top: 140, left: 260 }}>
              <PageTitle before="Dataset " accent="Management" size={58} />
              <div style={{ fontFamily: ui, fontSize: 20, color: theme.textMuted, marginTop: 10 }}>Connect your sources. Every comment flows into one place.</div>
            </div>
          </Layer>

          {/* "+ Add source" pill morphing into the upload card, lifted to the hero layer. */}
          <Layer z={260 * morph}>
            <Card
              glow="brand"
              style={{
                position: 'absolute',
                left: 260 + (1 - morph) * 300,
                top: 300,
                width: 260 + morph * 560,
                height: 64 + morph * 300,
                borderRadius: 32 - morph * 8,
                padding: morph > 0.5 ? 30 : 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {morph < 0.5 ? (
                <div style={{ fontSize: 22, fontWeight: 700, color: theme.brand }}>+ Add source</div>
              ) : (
                <>
                  <div style={{ width: '100%', height: 170, borderRadius: 18, border: `2px dashed ${progress > 0 ? theme.brand : theme.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, fontSize: 22 }}>
                    {progress > 0 ? `📄  ${scenario.uploadFile.value}` : 'Drop a CSV here'}
                  </div>
                  <div style={{ width: '100%', height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginTop: 26, overflow: 'hidden' }}>
                    <div style={{ width: `${progress * 100}%`, height: '100%', background: `linear-gradient(90deg, ${theme.emerald}, ${theme.lime})` }} />
                  </div>
                  <div style={{ fontSize: 18, color: theme.textMuted, marginTop: 12, alignSelf: 'flex-start' }}>
                    {progress >= 1 ? '✓ Uploaded and cleaned' : progress > 0 ? 'Uploading…' : ' '}
                  </div>
                </>
              )}
            </Card>
          </Layer>

          {/* Source rows connecting one by one. */}
          <Layer z={120}>
            <div style={{ position: 'absolute', left: 1140, top: 300, width: 560 }}>
              {platforms.map((pl, i) => {
                const at = 98 + i * 10
                const s = uiSpring(frame, fps, at)
                return (
                  <Card key={pl.id} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 22px', marginBottom: 16, opacity: s, transform: `translateX(${(1 - s) * 80}px)` }}>
                    <PlatformChip {...pl} size={48} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>{pl.label}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        {langs.map((l, k) => (
                          <span key={l} style={{ opacity: interpolate(frame, [at + 10 + k * 4, at + 18 + k * 4], [0, 1], clamp) }}>
                            <Badge tone="neutral" size={13}>{l}</Badge>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ width: 38, height: 38, borderRadius: 19, background: 'rgba(34,197,94,0.18)', color: theme.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, boxShadow: s > 0.9 ? `0 0 18px ${theme.brandGlow}` : undefined }}>✓</div>
                  </Card>
                )
              })}
            </div>
          </Layer>
        </Camera3D>

        <Cursor path={[{ f: 50, x: 1500, y: 900 }, { f: 72, x: 640, y: 420 }, { f: drop, x: 640, y: 420 }]} clickAt={[drop]} />
        {frame >= 50 && frame < drop && (
          <div style={{ position: 'absolute', left: interpolate(frame, [50, 72], [1530, 670], { ...clamp, easing: expoOut }), top: interpolate(frame, [50, 72], [930, 450], { ...clamp, easing: expoOut }), padding: '8px 14px', borderRadius: 10, background: theme.cardRaised, border: `1px solid ${theme.brand}`, fontFamily: ui, fontSize: 17, color: theme.text }}>
            📄 {scenario.uploadFile.value}
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 150, width: '100%', textAlign: 'center', fontFamily: ui, fontSize: 50, fontWeight: 800, letterSpacing: '-0.03em', color: theme.text, opacity: interpolate(frame, [150, 170], [0, 1], clamp) }}>
          {sceneCaptions[5]}
        </div>
      </Backdrop>
      <IllustrativeRibbon text={illustrativeRibbon} />
    </AbsoluteFill>
  )
}

