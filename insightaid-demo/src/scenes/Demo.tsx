import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { Backdrop } from '../components/Backdrop'
import { Camera3D, Layer } from '../components/Camera3D'
import { CountUp, Cursor, Toast } from '../components/bits'
import { ForecastChart, HBars, RiskDial } from '../components/charts'
import { clamp, expoOut, sceneFade, ui as uiSpring } from '../components/motion'
import { AppNav, Badge, Card, Eyebrow, IllustrativeRibbon, PageTitle, PlatformChip } from '../components/ui'
import { appScreens, illustrativeRibbon, measured, platforms, scenario, sceneCaptions } from '../data/content'
import { ui } from '../fonts'
import { theme } from '../theme'

const platformOf = (id: string) => platforms.find((p) => p.id === id) ?? platforms[0]

const SceneTitle: React.FC<{ text: string; at: number; top?: number }> = ({ text, at, top = 980 }) => {
  const frame = useCurrentFrame()
  const p = interpolate(frame, [at, at + 20], [0, 1], { ...clamp, easing: expoOut })
  return (
    <div style={{ position: 'absolute', top: top - 120, width: '100%', textAlign: 'center', fontFamily: ui, fontSize: 50, fontWeight: 800, letterSpacing: '-0.03em', color: theme.text, opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
      {text}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scene 6 - Sentiment: scan line labels each comment, then accuracy by language.
// ---------------------------------------------------------------------------
export const S06Sentiment: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame()
  const comments = scenario.comments.value
  // Two phases that must NOT overlap: comments fade fully out before the
  // accuracy panel fades in, or the cards ghost through behind it.
  const commentsOut = interpolate(frame, [128, 142], [1, 0], clamp)
  const toPanel = interpolate(frame, [140, 166], [0, 1], { ...clamp, easing: expoOut })
  const langs = measured.sentimentPerLanguage.value
  const langColor = [theme.platform.tiktok, theme.brand, theme.lime]

  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, duration) }}>
      <Backdrop>
        <Camera3D rx={10 * (1 - toPanel)} ry={-14 * (1 - toPanel)}>
          {/* Phase 1 - comment cards scanned one by one. */}
          <Layer z={160} opacity={commentsOut}>
            <div style={{ position: 'absolute', top: 170, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
              {comments.map((c, i) => {
                const at = 10 + i * 30
                const appear = interpolate(frame, [at, at + 16], [0, 1], { ...clamp, easing: expoOut })
                const scan = interpolate(frame, [at + 10, at + 28], [0, 1], clamp)
                const labelled = scan >= 1
                const neg = c.sentiment === 'Negative'
                const pl = platformOf(c.platform)
                return (
                  <Card key={i} glow={labelled ? (neg ? 'critical' : 'brand') : null} style={{ position: 'relative', width: 1080, padding: '20px 26px', display: 'flex', alignItems: 'center', gap: 20, overflow: 'hidden', opacity: appear, transform: `translateX(${(1 - appear) * -60}px)` }}>
                    <PlatformChip {...pl} size={50} />
                    <div style={{ flex: 1, fontSize: 28, fontWeight: 500 }}>{c.text}</div>
                    <div style={{ opacity: labelled ? 1 : 0, transform: `scale(${labelled ? 1 : 0.8})` }}>
                      <Badge tone={neg ? 'critical' : 'brand'} size={20}>
                        {c.sentiment} · {c.confidence}%
                      </Badge>
                    </div>
                    {scan > 0 && scan < 1 && (
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${scan * 100}%`, width: 4, background: theme.brand, boxShadow: `0 0 24px 6px ${theme.brandGlow}` }} />
                    )}
                  </Card>
                )
              })}
            </div>
          </Layer>

          {/* Phase 2 - the strength: measured accuracy, per language. */}
          <Layer z={(1 - toPanel) * -400} opacity={toPanel}>
            <div style={{ position: 'absolute', top: 40, left: 0, right: 0 }}>
              <AppNav active="Insights" />
            </div>
            <div style={{ position: 'absolute', top: 150, left: 240 }}>
              <PageTitle before="Sentiment " accent="Analysis" size={58} />
            </div>
            <Card glow="brand" style={{ position: 'absolute', left: 240, top: 290, width: 520, height: 420, padding: 40 }}>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.08em', color: theme.textFaint }}>MULTILINGUAL ACCURACY</div>
              <div style={{ fontSize: 140, fontWeight: 800, letterSpacing: '-0.05em', marginTop: 20, lineHeight: 1 }}>
                <CountUp to={measured.sentimentAccuracyOverall.value} decimals={2} suffix="%" start={140} dur={34} />
              </div>
              <div style={{ fontSize: 24, color: theme.textMuted, marginTop: 22, lineHeight: 1.35 }}>Reads Malay, Mandarin and English in their original language.</div>
            </Card>
            <Card style={{ position: 'absolute', left: 800, top: 290, width: 880, height: 420, padding: 44 }}>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.08em', color: theme.textFaint, marginBottom: 40 }}>ACCURACY BY LANGUAGE</div>
              <HBars
                w={790}
                start={144}
                barH={36}
                gap={42}
                rows={langs.map((l, i) => ({ label: l.label, value: l.accuracy, color: langColor[i] }))}
              />
            </Card>
          </Layer>
        </Camera3D>
        <SceneTitle text={sceneCaptions[6]} at={180} />
      </Backdrop>
      <IllustrativeRibbon text={illustrativeRibbon} />
    </AbsoluteFill>
  )
}

// ---------------------------------------------------------------------------
// Scene 7 - Crisis: the real Crisis page - dial, named signals, early warning.
// ---------------------------------------------------------------------------
export const S07Crisis: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const c = appScreens.crisis
  const shake = frame > 52 && frame < 60 ? Math.sin(frame * 7) * 3 : 0
  const pulse = interpolate(frame % 40, [0, 20, 40], [0, 1, 0]) * interpolate(frame, [50, 60, 130, 150], [0, 1, 1, 0], clamp)
  const chipsIn = interpolate(frame, [200, 222], [0, 1], { ...clamp, easing: expoOut })
  const merge = interpolate(frame, [256, 286], [0, 1], { ...clamp, easing: expoOut })
  const toneOf = (t: string) => (t === 'critical' ? theme.critical : t === 'warning' ? theme.warning : theme.brand)

  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, duration) }}>
      <Backdrop tint="critical" glow={0.6 + pulse * 0.6}>
        <Camera3D rx={6} ry={-8} shake={shake}>
          <Layer>
            <div style={{ position: 'absolute', top: 40, left: 0, right: 0 }}>
              <AppNav active="Insights" />
            </div>
            <div style={{ position: 'absolute', top: 140, left: 240 }}>
              <PageTitle before="Early-Warning " accent="Crisis" after=" Detection" size={58} />
              <div style={{ fontFamily: ui, fontSize: 19, color: theme.textMuted, marginTop: 10, maxWidth: 820 }}>{c.subtitle}</div>
            </div>
          </Layer>
          <Layer z={140}>
            <Card glow="critical" style={{ position: 'absolute', left: 240, top: 300, width: 560, height: 540, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ alignSelf: 'flex-start', fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', color: theme.textFaint }}>CURRENT CRISIS LEVEL</div>
              <div style={{ marginTop: 26 }}>
                <RiskDial score={c.score} start={30} color={theme.warning} label={c.level} size={300} />
              </div>
              <div style={{ marginTop: 26 }}>
                <Badge tone="warning" size={20}>Risk score {c.score} / 100</Badge>
              </div>
            </Card>
          </Layer>
          <Layer z={80}>
            <Card style={{ position: 'absolute', left: 840, top: 300, width: 840, height: 540, padding: 34 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>Detected Signals</div>
              <div style={{ fontSize: 16, color: theme.textMuted, marginTop: 4, marginBottom: 20 }}>Every signal, with measurable evidence.</div>
              {c.signals.map((sg, i) => {
                const s = uiSpring(frame, fps, 64 + i * 10)
                return (
                  <div key={sg.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 16px', marginBottom: 10, borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: `1px solid ${theme.border}`, opacity: s, transform: `translateX(${(1 - s) * 40}px)` }}>
                    <div style={{ width: 12, height: 12, borderRadius: 6, background: toneOf(sg.tone), marginTop: 7, boxShadow: `0 0 10px ${toneOf(sg.tone)}` }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 19, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                        {sg.name}
                        {sg.badge && <Badge tone={sg.tone === 'critical' ? 'critical' : 'warning'} size={13}>{sg.badge}</Badge>}
                      </div>
                      <div style={{ fontSize: 15, color: theme.textMuted, marginTop: 2 }}>{sg.evidence}</div>
                    </div>
                  </div>
                )
              })}
            </Card>
          </Layer>
          {/* Topic chips cluster, then merge into one root cause. */}
          <Layer z={320} opacity={chipsIn}>
            {scenario.topicChips.value.map((t, i) => {
              const a = (i / 5) * Math.PI * 2
              const r = 230 * (1 - merge)
              return (
                <div key={t} style={{ position: 'absolute', left: 960 + Math.cos(a) * r - 60, top: 560 + Math.sin(a) * r * 0.5 - 20, opacity: 1 - merge }}>
                  <Badge tone="critical" size={24}>{t}</Badge>
                </div>
              )
            })}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 530, display: 'flex', justifyContent: 'center', opacity: merge, transform: `scale(${0.8 + merge * 0.2})` }}>
              <Card glow="critical" style={{ padding: '22px 34px', fontSize: 32, fontWeight: 800, background: 'rgba(30,12,12,0.95)' }}>
                Root cause: {scenario.rootCause.value}
              </Card>
            </div>
          </Layer>
        </Camera3D>
        <Toast at={50} title="Early warning raised" body={c.signals[0].evidence} top={140} right={80} />
        <AbsoluteFill style={{ boxShadow: `inset 0 0 ${160 * pulse}px rgba(220,38,38,${0.45 * pulse})`, pointerEvents: 'none' }} />
        <SceneTitle text={sceneCaptions[7]} at={290} top={1000} />
      </Backdrop>
      <IllustrativeRibbon text={illustrativeRibbon} />
    </AbsoluteFill>
  )
}

// ---------------------------------------------------------------------------
// Scene 8 - Forecast: chart lifts off, camera flattens, real KPI counts up.
// ---------------------------------------------------------------------------
export const S08Forecast: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame()
  const lift = interpolate(frame, [20, 60], [0, 1], { ...clamp, easing: expoOut })
  const shape = scenario.forecastShape.value
  const kpi = appScreens.dashboard.kpis[2]

  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, duration) }}>
      <Backdrop>
        <Camera3D rx={14 * (1 - lift)} ry={-18 * (1 - lift)}>
          <Layer>
            <div style={{ position: 'absolute', top: 40, left: 0, right: 0 }}>
              <AppNav active="Intelligence" />
            </div>
            <div style={{ position: 'absolute', top: 140, left: 240 }}>
              <PageTitle before="Smart Business " accent="Forecasting" size={58} />
              <div style={{ fontFamily: ui, fontSize: 20, color: theme.textMuted, marginTop: 10 }}>Where revenue is heading, so you can act early.</div>
            </div>
          </Layer>
          <Layer z={220 * lift}>
            <Card glow="brand" style={{ position: 'absolute', left: 240, top: 290, width: 1000, height: 560, padding: 34 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>Revenue forecast</div>
                <div style={{ display: 'flex', gap: 16, fontSize: 17, color: theme.textMuted }}>
                  <span><span style={{ color: theme.brand }}>━</span> Actual</span>
                  <span><span style={{ color: theme.mint }}>┅</span> Forecast</span>
                  <span><span style={{ color: 'rgba(110,231,183,0.5)' }}>▇</span> Range</span>
                </div>
              </div>
              <div style={{ marginTop: 24 }}>
                <ForecastChart w={930} h={440} history={shape.history} forecast={shape.forecast} start={40} />
              </div>
            </Card>
          </Layer>
          <Layer z={300 * lift}>
            <Card style={{ position: 'absolute', left: 1280, top: 290, width: 400, height: 260, padding: 34, opacity: interpolate(frame, [70, 90], [0, 1], clamp) }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', color: theme.textFaint }}>{kpi.label}</div>
              <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 18 }}>
                <CountUp to={3971} prefix="RM " start={80} dur={40} />
              </div>
              <div style={{ fontSize: 19, color: theme.textMuted, marginTop: 8 }}>projected, next 7 days</div>
            </Card>
            <Card style={{ position: 'absolute', left: 1280, top: 590, width: 400, height: 260, padding: 34, opacity: interpolate(frame, [96, 116], [0, 1], clamp) }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', color: theme.textFaint }}>MODELS COMPARED</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
                {/* All neutral on purpose: the app picks whichever scores lowest
                    error on the data, and on the real dashboard that was the
                    moving average - so no single model is crowned here. */}
                {['Prophet', 'ARIMA', 'XGBoost', 'LSTM', 'Moving avg'].map((m, i) => (
                  <span key={m} style={{ opacity: interpolate(frame, [104 + i * 5, 114 + i * 5], [0, 1], clamp) }}>
                    <Badge tone="neutral" size={18}>{m}</Badge>
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 18, color: theme.textMuted, marginTop: 20 }}>The best performer is picked for you.</div>
            </Card>
          </Layer>
        </Camera3D>
        <SceneTitle text={sceneCaptions[8]} at={140} top={1000} />
      </Backdrop>
    </AbsoluteFill>
  )
}

// ---------------------------------------------------------------------------
// Scene 9 - Ask InsightAid: prompt types, answer streams, actions stack on Z.
// ---------------------------------------------------------------------------
export const S09Ask: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const prompt = scenario.prompt.value
  const typed = prompt.slice(0, Math.round(interpolate(frame, [14, 74], [0, prompt.length], clamp)))
  const send = 86
  const toPage = interpolate(frame, [104, 134], [0, 1], { ...clamp, easing: expoOut })
  const answer = scenario.answer.value
  const streamed = answer.slice(0, Math.round(interpolate(frame, [118, 148], [0, answer.length], clamp)))
  const recs = scenario.recommendations.value

  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, duration) }}>
      <Backdrop glow={1.4 - toPage * 0.4}>
        {/* Prompt bar on the brand glow. */}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - toPage, transform: `translateY(${-toPage * 300}px) scale(${1 - toPage * 0.2})` }}>
          <div style={{ fontFamily: ui, fontSize: 44, fontWeight: 800, color: theme.text, marginBottom: 34, letterSpacing: '-0.02em' }}>Ask InsightAid</div>
          <div style={{ width: 1200, height: 100, borderRadius: 50, background: 'rgba(15,23,19,0.9)', border: `1px solid ${theme.brand}66`, boxShadow: `0 0 80px ${theme.brandGlow}`, display: 'flex', alignItems: 'center', padding: '0 14px 0 40px', fontFamily: ui, fontSize: 32, color: theme.text }}>
            <span style={{ flex: 1 }}>
              {typed}
              <span style={{ opacity: frame % 20 < 10 ? 1 : 0, color: theme.brand }}>|</span>
            </span>
            <div style={{ width: 72, height: 72, borderRadius: 36, background: theme.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, color: '#04210f', fontWeight: 800, transform: `scale(${frame >= send && frame < send + 6 ? 0.88 : 1})` }}>↑</div>
          </div>
        </AbsoluteFill>
        <Cursor path={[{ f: 60, x: 1300, y: 760 }, { f: 82, x: 1508, y: 548 }, { f: 100, x: 1508, y: 548 }]} clickAt={[send]} hideAt={108} />

        {/* AI Recommendations page. */}
        <AbsoluteFill style={{ opacity: toPage }}>
          <Camera3D rx={8 * (1 - toPage) + 4} ry={-10}>
            <Layer>
              <div style={{ position: 'absolute', top: 40, left: 0, right: 0 }}>
                <AppNav active="Intelligence" />
              </div>
              <div style={{ position: 'absolute', top: 140, left: 240 }}>
                <PageTitle before="AI " accent="Recommendations" size={58} />
              </div>
            </Layer>
            <Layer z={100}>
              <Card style={{ position: 'absolute', left: 240, top: 262, width: 1360, padding: '22px 30px', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(34,197,94,0.16)', color: theme.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>✦</div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 24, lineHeight: 1.45, color: theme.text }}>{streamed}</div>
              </Card>
            </Layer>
            {recs.map((r, i) => {
              const s = uiSpring(frame, fps, 136 + i * 10)
              return (
                <Layer key={r.title} z={160 + i * 60}>
                  <Card glow={i === 0 ? 'brand' : null} style={{ position: 'absolute', left: 240, top: 430 + i * 150, width: 1440, height: 128, padding: '0 32px', display: 'flex', alignItems: 'center', gap: 24, opacity: s, transform: `translateY(${(1 - s) * 80}px)` }}>
                    <div style={{ fontSize: 42, fontWeight: 800, color: theme.textFaint, width: 40 }}>{i + 1}</div>
                    <Badge tone={r.priority === 'High' ? 'critical' : 'warning'} size={18}>{r.priority}</Badge>
                    <div style={{ flex: 1, fontSize: 30, fontWeight: 700 }}>{r.title}</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 15, color: theme.textFaint, fontWeight: 700, letterSpacing: '0.06em' }}>IMPACT</div>
                      <div style={{ fontSize: 34, fontWeight: 800, color: theme.brand }}>
                        <CountUp to={r.impact} suffix="%" start={142 + i * 10} dur={26} />
                      </div>
                    </div>
                  </Card>
                </Layer>
              )
            })}
          </Camera3D>
        </AbsoluteFill>
        <div style={{ position: 'absolute', top: 70, right: 230, opacity: toPage }}>
          <Eyebrow>EXPLAINABLE · RULE-BASED</Eyebrow>
        </div>
      </Backdrop>
      <IllustrativeRibbon text={illustrativeRibbon} />
    </AbsoluteFill>
  )
}
