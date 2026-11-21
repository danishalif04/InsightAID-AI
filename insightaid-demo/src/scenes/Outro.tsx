import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Backdrop } from '../components/Backdrop'
import { Camera3D, Layer } from '../components/Camera3D'
import { CountUp, Headline } from '../components/bits'
import { MiniTrend } from '../components/charts'
import { clamp, expoOut, pop, sceneFade, ui as uiSpring } from '../components/motion'
import { AppNav, Badge, Card, Eyebrow, PageTitle } from '../components/ui'
import { appScreens, brand, impactLines, sceneCaptions, techStack } from '../data/content'
import { serif, ui } from '../fonts'
import { theme } from '../theme'
import { DeviceScene } from '../three/DeviceScene'

// ---------------------------------------------------------------------------
// Scene 10 - All in one place: the real dashboard assembles, explodes into
// layers, then hands over to the true-3D laptop + phone.
// ---------------------------------------------------------------------------
export const S10AllInOne: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const d = appScreens.dashboard
  const devicesAt = 120
  const explode = interpolate(frame, [70, 92, 104, 118], [0, 1, 1, 0], { ...clamp, easing: expoOut })
  const toDevices = interpolate(frame, [devicesAt - 6, devicesAt + 10], [0, 1], clamp)
  const kpiTone = (tone: string) => (tone === 'warning' ? theme.warning : theme.text)

  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, duration) }}>
      <Backdrop glow={1.2}>
        <AbsoluteFill style={{ opacity: 1 - toDevices }}>
          <Camera3D rx={explode * 16} ry={explode * -22} z={interpolate(frame, [0, 40], [300, 0], { ...clamp, easing: expoOut })}>
            <Layer>
              <div style={{ position: 'absolute', top: 30, left: 0, right: 0 }}>
                <AppNav active="Overview" />
              </div>
              <div style={{ position: 'absolute', top: 112, left: 240 }}>
                <Eyebrow>{d.eyebrow}</Eyebrow>
                <div style={{ marginTop: 14 }}>
                  <PageTitle before="Business Health, at a " accent="Glance" size={56} />
                </div>
              </div>
            </Layer>
            <Layer z={explode * 120}>
              <Card style={{ position: 'absolute', left: 240, top: 270, width: 1440, padding: '20px 26px', opacity: uiSpring(frame, fps, 8) }}>
                <div style={{ fontSize: 19, fontWeight: 700 }}>
                  Executive Summary <Badge tone="brand" size={13}>Malaysian Local Shop</Badge>
                </div>
                <div style={{ fontSize: 18, color: theme.textMuted, marginTop: 8 }}>{d.summary}</div>
              </Card>
            </Layer>
            {d.kpis.map((k, i) => {
              const s = uiSpring(frame, fps, 16 + i * 6)
              return (
                <Layer key={k.label} z={explode * (200 + i * 70)}>
                  <Card glow={i === 2 ? 'brand' : null} style={{ position: 'absolute', left: 240 + i * 488, top: 395, width: 464, height: 170, padding: 26, opacity: s, transform: `translateY(${(1 - s) * 50}px)` }}>
                    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.07em', color: theme.textFaint }}>{k.label}</div>
                    <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 10, color: kpiTone(k.tone) }}>{k.value}</div>
                    <div style={{ marginTop: 6 }}>
                      {'delta' in k && k.delta && <Badge tone="critical" size={14}>{k.delta}</Badge>}
                      {'sub' in k && k.sub && <span style={{ fontSize: 16, color: theme.textMuted }}>{k.sub}</span>}
                      {'chip' in k && k.chip && <Badge tone="brand" size={14}>{k.chip}</Badge>}
                    </div>
                  </Card>
                </Layer>
              )
            })}
            <Layer z={explode * 90}>
              <Card style={{ position: 'absolute', left: 240, top: 590, width: 940, height: 330, padding: 26, opacity: uiSpring(frame, fps, 30) }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Sentiment Trend</div>
                <MiniTrend w={880} h={250} start={34} values={[0.72, 0.75, 0.7, 0.78, 0.74, 0.8, 0.77, 0.4, 0.62, 0.7, 0.68, 0.72, 0.69, 0.67]} />
              </Card>
              <Card style={{ position: 'absolute', left: 1210, top: 590, width: 470, height: 330, padding: 26, opacity: uiSpring(frame, fps, 36) }}>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 26 }}>Platform Distribution</div>
                {[
                  { id: 'tiktok', label: 'TikTok', v: 1 },
                  { id: 'x', label: 'X', v: 0.12 },
                  { id: 'shopee', label: 'Shopee', v: 0.06 },
                  { id: 'threads', label: 'Threads', v: 0.06 },
                ].map((r, i) => {
                  const p = interpolate(frame, [40 + i * 5, 70 + i * 5], [0, 1], { ...clamp, easing: expoOut })
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                      <div style={{ width: 80, fontSize: 16, color: theme.textMuted }}>{r.label}</div>
                      <div style={{ height: 30, width: `${Math.max(4, r.v * 300 * p)}px`, background: theme.platform[r.id], borderRadius: 4 }} />
                    </div>
                  )
                })}
              </Card>
            </Layer>
          </Camera3D>
        </AbsoluteFill>

        {frame >= devicesAt - 6 && (
          <AbsoluteFill style={{ opacity: toDevices }}>
            <DeviceScene start={devicesAt} />
          </AbsoluteFill>
        )}

        <div style={{ position: 'absolute', top: 70, width: '100%', textAlign: 'center', fontFamily: ui, fontWeight: 800, fontSize: 72, letterSpacing: '-0.035em', color: theme.text, opacity: toDevices }}>
          {frame < devicesAt + 70 ? sceneCaptions[10] : 'Any device.'}
        </div>
      </Backdrop>
    </AbsoluteFill>
  )
}

// ---------------------------------------------------------------------------
// Scene 11 - Pricing: price contrast, then the app's own three plans.
// ---------------------------------------------------------------------------
export const S11Pricing: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = appScreens.pricing
  const toCards = interpolate(frame, [96, 124], [0, 1], { ...clamp, easing: expoOut })
  const barE = interpolate(frame, [12, 50], [0, 1], { ...clamp, easing: expoOut })
  const barI = interpolate(frame, [36, 60], [0, 1], { ...clamp, easing: expoOut })

  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, duration) }}>
      <Backdrop>
        {/* Price contrast. */}
        <AbsoluteFill style={{ opacity: 1 - toCards, justifyContent: 'center', padding: '0 220px', fontFamily: ui }}>
          <div style={{ fontSize: 66, fontWeight: 800, letterSpacing: '-0.03em', color: theme.text, marginBottom: 70 }}>{sceneCaptions[11]}</div>
          <div style={{ fontSize: 24, color: theme.textMuted, fontWeight: 600 }}>Enterprise BI tools</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, margin: '12px 0 44px' }}>
            <div style={{ height: 64, width: 1100 * barE, borderRadius: 14, background: 'linear-gradient(90deg, #3a3f3d, #5b4040)' }} />
            <div style={{ fontSize: 36, fontWeight: 800, color: theme.text, opacity: barE, whiteSpace: 'nowrap' }}>RM1,500–10,000+ <span style={{ fontSize: 22, color: theme.textMuted }}>/ user / month</span></div>
          </div>
          <div style={{ fontSize: 24, color: theme.brand, fontWeight: 700 }}>{brand.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 12 }}>
            <div style={{ height: 64, width: 18 + 60 * barI, borderRadius: 14, background: theme.brand, boxShadow: `0 0 40px ${theme.brandGlow}` }} />
            <div style={{ fontSize: 36, fontWeight: 800, color: theme.text, opacity: barI }}>from RM 0</div>
          </div>
        </AbsoluteFill>

        {/* The three plans, centre plan forward on Z. */}
        <AbsoluteFill style={{ opacity: toCards }}>
          <div style={{ position: 'absolute', top: 92, width: '100%', textAlign: 'center' }}>
            <PageTitle before="Simple, " accent="startup-friendly" after=" pricing" size={62} />
            <div style={{ marginTop: 20 }}>
              <Badge tone="warning" size={18}>{p.badge}</Badge>
            </div>
          </div>
          <Camera3D rx={6} perspective={2400}>
            {p.plans.map((plan, i) => {
              const s = uiSpring(frame, fps, 116 + i * 8)
              const forward = plan.popular ? 120 : 0
              return (
                <Layer key={plan.name} z={forward * s}>
                  <Card
                    glow={plan.popular ? 'brand' : null}
                    style={{
                      position: 'absolute',
                      left: 330 + i * 430,
                      top: 300,
                      width: 400,
                      height: 560,
                      padding: 36,
                      opacity: s,
                      transform: `translateY(${(1 - s) * 160}px)`,
                      border: plan.popular ? `1px solid ${theme.brand}` : `1px solid ${theme.border}`,
                    }}
                  >
                    {plan.popular && <Badge tone="brand" size={16}>Most popular</Badge>}
                    <div style={{ fontSize: 26, fontWeight: 700, marginTop: plan.popular ? 16 : 0 }}>{plan.name}</div>
                    <div style={{ fontSize: plan.price.startsWith('RM') ? 66 : 50, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 10 }}>
                      {plan.price.startsWith('RM') ? (
                        <CountUp to={parseInt(plan.price.replace(/\D/g, ''), 10)} prefix="RM " start={126 + i * 8} dur={30} />
                      ) : (
                        plan.price
                      )}
                      <span style={{ fontSize: 22, color: theme.textMuted, fontWeight: 600 }}>{plan.period}</span>
                    </div>
                    <div style={{ fontSize: 18, color: theme.textMuted, marginTop: 10, lineHeight: 1.4, minHeight: 50 }}>{plan.blurb}</div>
                    <div style={{ marginTop: 22 }}>
                      {plan.features.map((ft, k) => (
                        <div key={ft} style={{ display: 'flex', gap: 12, fontSize: 19, marginBottom: 12, opacity: interpolate(frame, [140 + i * 8 + k * 6, 150 + i * 8 + k * 6], [0, 1], clamp) }}>
                          <span style={{ color: theme.brand, fontWeight: 800 }}>✓</span>
                          {ft}
                        </div>
                      ))}
                    </div>
                  </Card>
                </Layer>
              )
            })}
          </Camera3D>
        </AbsoluteFill>
      </Backdrop>
    </AbsoluteFill>
  )
}

// ---------------------------------------------------------------------------
// Scene 12 - Impact + tech stack.
// ---------------------------------------------------------------------------
const TECH_LOGOS: Record<string, string> = {
  React: 'tech/react.png',
  Vite: 'tech/vite.jpg',
  Tailwind: 'tech/tailwind.webp',
  Supabase: 'tech/supabase.webp',
  'XLM-RoBERTa': 'tech/huggingface.svg',
  Prophet: 'tech/prophet.png',
  Python: 'tech/python.webp',
}

export const S12Impact: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame()
  const settle = interpolate(frame, [40, 110], [0, 1], { ...clamp, easing: expoOut })

  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, duration) }}>
      <Backdrop>
        <div style={{ position: 'absolute', left: 200, top: 260, fontFamily: ui }}>
          <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: '-0.03em', color: theme.text, marginBottom: 46, opacity: interpolate(frame, [0, 18], [0, 1], clamp) }}>
            Why <span style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 400, color: theme.brand }}>InsightAid</span>
          </div>
          {impactLines.map((line, i) => {
            const p = interpolate(frame, [14 + i * 12, 32 + i * 12], [0, 1], { ...clamp, easing: expoOut })
            return (
              <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30, opacity: p, transform: `translateX(${(1 - p) * -40}px)` }}>
                <div style={{ width: 46, height: 46, borderRadius: 23, background: 'rgba(34,197,94,0.16)', color: theme.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, boxShadow: `0 0 20px ${theme.brandGlow}` }}>✓</div>
                <div style={{ fontSize: 32, fontWeight: 600, color: theme.text }}>{line}</div>
              </div>
            )
          })}
        </div>

        <AbsoluteFill style={{ perspective: 1400 }}>
          {techStack.map((name, i) => {
            const a = (i / techStack.length) * Math.PI * 2 + frame * 0.02 * (1 - settle)
            const orbitX = 1390 + Math.cos(a) * 280
            const orbitY = 520 + Math.sin(a) * 190
            const gx = 1130 + (i % 3) * 190
            const gy = 290 + Math.floor(i / 3) * 190
            const x = orbitX + (gx - orbitX) * settle
            const y = orbitY + (gy - orbitY) * settle
            const z = Math.sin(a) * 200 * (1 - settle)
            const appear = interpolate(frame, [i * 4, i * 4 + 20], [0, 1], clamp)
            return (
              <div key={name} style={{ position: 'absolute', left: x - 80, top: y - 80, width: 160, height: 160, transform: `translateZ(${z}px)`, opacity: appear }}>
                <Card style={{ width: 160, height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <Img src={staticFile(`assets/${TECH_LOGOS[name]}`)} style={{ width: 88, height: 88, objectFit: 'contain', borderRadius: 14 }} />
                  <div style={{ fontSize: 17, fontWeight: 700, color: theme.textMuted }}>{name}</div>
                </Card>
              </div>
            )
          })}
        </AbsoluteFill>
        {/* No on-screen caption here: the VO caption carries this scene's line. */}
      </Backdrop>
    </AbsoluteFill>
  )
}

// ---------------------------------------------------------------------------
// Scene 13 - End card: "Decide." -> icon -> lockup + tagline -> CTA -> footer.
// ---------------------------------------------------------------------------
export const S13End: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const word = interpolate(frame, [0, 10, 46, 58], [0, 1, 1, 0], clamp)
  const icon = pop(frame, fps, 56)
  const lock = interpolate(frame, [86, 108], [0, 1], { ...clamp, easing: expoOut })
  const cta = interpolate(frame, [150, 170], [0, 1], { ...clamp, easing: expoOut })
  const foot = interpolate(frame, [204, 224], [0, 1], clamp)
  const out = interpolate(frame, [duration - 10, duration], [1, 0], clamp)

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Backdrop glow={1.5}>
        {/* Sparkles. */}
        {Array.from({ length: 26 }).map((_, i) => {
          const x = (i * 337) % 1920
          const y = ((i * 211) % 1080) - ((frame * (0.4 + (i % 5) * 0.15)) % 200)
          const tw = (Math.sin(frame * 0.15 + i) + 1) / 2
          return <div key={i} style={{ position: 'absolute', left: x, top: y, width: 4, height: 4, borderRadius: 2, background: theme.mint, opacity: tw * 0.6 * lock, boxShadow: `0 0 8px ${theme.mint}` }} />
        })}

        <AbsoluteFill style={{ opacity: word }}>
          <Headline text="Decide." accent="Decide." at={0} size={190} />
        </AbsoluteFill>

        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', marginTop: -70 }}>
          <Img
            src={staticFile('assets/logo/insightaid-mark.png')}
            style={{ width: 260, height: 260, opacity: frame >= 56 ? 1 : 0, transform: `scale(${icon}) translateY(${-lock * 20}px)`, filter: `drop-shadow(0 0 50px rgba(34,197,94,0.5))` }}
          />
          <div style={{ fontFamily: ui, fontWeight: 800, fontSize: 96, letterSpacing: '-0.035em', color: theme.text, opacity: lock, transform: `translateY(${(1 - lock) * 20}px)`, marginTop: 8 }}>
            INSIGHTAID{' '}
            <span style={{ background: 'linear-gradient(120deg, #34d399, #22c55e 50%, #a3e635)', WebkitBackgroundClip: 'text', color: 'transparent' }}>AI</span>
          </div>
          <div style={{ fontFamily: ui, fontSize: 44, fontWeight: 600, color: theme.textMuted, opacity: lock, marginTop: 4 }}>
            Decisions, backed by <span style={{ fontFamily: serif, fontStyle: 'italic', color: theme.brand, fontSize: 50 }}>evidence</span>.
          </div>
          <div style={{ marginTop: 44, opacity: cta, transform: `scale(${0.9 + cta * 0.1})` }}>
            <div style={{ padding: '20px 54px', borderRadius: 999, background: theme.brand, color: '#04210f', fontFamily: ui, fontSize: 30, fontWeight: 800, boxShadow: `0 0 50px ${theme.brandGlow}` }}>Start free</div>
          </div>
        </AbsoluteFill>

        <div style={{ position: 'absolute', bottom: 44, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, fontFamily: ui, fontSize: 17, color: theme.textFaint, opacity: foot }}>
          <Img src={staticFile('assets/logo/utp.png')} style={{ height: 40, objectFit: 'contain' }} />
          <span style={{ maxWidth: 1100, textAlign: 'center', lineHeight: 1.4 }}>
            {brand.fypTitle}
            <br />
            {brand.author} · {brand.studentId} · {brand.university}
          </span>
        </div>
      </Backdrop>
    </AbsoluteFill>
  )
}

