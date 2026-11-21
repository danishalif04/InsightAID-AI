import { loadFont as loadJakarta } from '@remotion/google-fonts/PlusJakartaSans'
import { useAudioData, visualizeAudio } from '@remotion/media-utils'
import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Backdrop } from '../components/Backdrop'
import { clamp, expoOut } from '../components/motion'
import { serif, ui } from '../fonts'
import { theme } from '../theme'
import { DeviceScene } from '../three/DeviceScene'
import { Mark, Screen, ShotCursor, type Cam } from '../workflow/kit'
import { WorkflowVideo, type Cue, type Line } from '../workflow/WorkflowVideo'
import { VO_BEATS } from './voBeats'

/**
 * AIMIX: IID 2026 competition video, ~5:10.
 *
 * Demo sections use REAL captures of the production build (public/assets/wf1,
 * wf2 and the owner's onboarding screenshots), moved by a camera and annotated.
 * Story elements that are not the app (the shopfront, the drinks-startup
 * comments, the 15% -> 40% spike) are motion graphics for the fictional
 * personas and carry an "illustrative" tag on screen. Every result number in
 * C09 is transcribed from the project's result files:
 *   ml/sentiment/results/O1_SCORECARD.md
 *   ml/forecasting/results/protocol_summary_a8b3bb637d28.json
 */
const { fontFamily: jakarta } = loadJakarta('normal', { weights: ['700', '800'], subsets: ['latin'] })

const W1 = 'assets/wf1/'
const W2 = 'assets/wf2/'
const C = 'assets/comp/'
const GOLD = '#FBBF24'
const BOX = { x: 320, y: 172, w: 1280, h: 720 }
const FULL = { cx: 720, cy: 405, w: 1440 }

// ------------------------------------------------------------------ timeline
export const COMP_LINES: Line[] = [
  { scene: 1, from: 0, to: 660, text: 'In Melaka, someone is about to open a kedai, with no sales records to plan from. Across town, a drinks startup is getting thousands of comments, in Malay, Mandarin and English. Their sales still look fine. For now. Two businesses. One problem: no clear evidence to decide with.' },
  { scene: 2, from: 660, to: 1230, text: 'This is InsightAid AI, by Team Suluh: Danish Alif, from Universiti Teknologi PETRONAS. An intelligent decision support system for data-driven business analytics in early-stage startups. Its promise is simple: decisions, backed by evidence.' },
  { scene: 3, from: 1230, to: 2280, text: 'Around ninety percent of startups eventually fail, and forty-two percent fail because there was no market need. Seventy percent of small businesses use no business intelligence tools at all, mostly because of cost. And sixty percent only react after the damage is visible. Today, they rely on spreadsheets, gut feeling, or enterprise tools that cost thousands of ringgit per user. The warning signs are public. Nobody can read them in time.' },
  { scene: 4, from: 2280, to: 2880, text: 'So the project sets three objectives. Understand customer sentiment in Malay, Mandarin and English. Detect crises early, and forecast sales using those signals. And turn it all into affordable, evidence-backed recommendations, even for businesses with no data yet.' },
  { scene: 5, from: 2880, to: 3360, text: 'InsightAid has two ways in. A Malaysian Local Shop with no records can start planning straight away. A Business Startup with sales and social data can bring it all in. Same app. Same promise.' },
  { scene: 6, from: 3360, to: 4660, text: "Let's start with the local shop. Describe the business, and the AI drafts a plan. Or open the example shop, Kedai Makmur. Break-even sales, costs and margins appear instantly, and every figure is calculated by the app, not guessed by the AI. You can see your best-margin products, your monthly costs, and how much capital you still need. Before changing a price, test it here, and watch the results update. And you can ask in Malay or English. The assistant checks your own numbers, explains the answer, and you decide." },
  { scene: 7, from: 4660, to: 6060, text: 'Now, a startup with data. Upload sales and reviews, or connect your channels. Every comment, in any of the three languages, is scored for sentiment, platform by platform. Then something changes. Negative comments jump from fifteen to forty percent. InsightAid raises an early warning, and shows the exact signals behind it: leaking bottles, in Malay, Mandarin and English. The forecast shows where revenue is heading if nothing changes. And the recommendations show what to do next, each one backed by the evidence that triggered it. Everything sits in one dashboard, on any device.' },
  { scene: 8, from: 6060, to: 7110, text: 'Under the hood, data is cleaned, its language detected, and stored securely in Supabase. The models were evaluated rigorously: XLM-RoBERTa for sentiment, rules for crisis detection, and several forecasting models. Then an evidence check makes sure every number comes from the data, every alert shows its signals, and every recommendation links to its proof. And the limits are clear: live channel connectors and the live model are the next step.' },
  { scene: 9, from: 7110, to: 7650, text: 'Here is where the prototype stands today. All nine dashboard pages are built on a secure database, and checked by automated tests. The current model results are shown on screen.' },
  { scene: 10, from: 7650, to: 8310, text: 'InsightAid starts free, works in three languages, and needs no data to begin. It supports decent work and economic growth, and innovation for small businesses. Next: a pilot with local SMEs, live connectors, and a mobile app.' },
  { scene: 11, from: 8310, to: 8760, text: 'Every founder deserves to see the evidence before they decide. InsightAid AI. Decisions, backed by evidence. Thank you.' },
]
export const COMP_TOTAL = 8760
/** Measured clip lengths (frames) of public/assets/vo-comp/c01..c11.wav. */
export const COMP_VO_FRAMES: Record<number, number> = { 1: 585, 2: 523, 3: 905, 4: 566, 5: 404, 6: 1081, 7: 1222, 8: 982, 9: 397, 10: 486, 11: 281 }
const LEAD = 10
const TITLES = ['', 'COLD OPEN', 'TEAM', 'PROBLEM', 'OBJECTIVES', 'SOLUTION', 'DEMO · LOCAL SHOP', 'DEMO · BUSINESS STARTUP', 'HOW IT WORKS', 'RESULTS', 'IMPACT', 'CLOSE']

// ------------------------------------------------------------------ helpers
const ease = (f: number, a: number, d = 18) => interpolate(f, [a, a + d], [0, 1], { ...clamp, easing: expoOut })

/** Voice-relative beat: the frame where word `n` of `total` is spoken in scene s. */
const beat = (scene: number, wordIndex: number) => {
  const line = COMP_LINES[scene - 1]
  const words = line.text.split(/\s+/).length
  return Math.round(LEAD + (wordIndex / words) * COMP_VO_FRAMES[scene])
}

const Headline: React.FC<{ text: string; accent: string; at?: number; until?: number }> = ({ text, accent, at = 4, until }) => {
  const f = useCurrentFrame()
  const p = ease(f, at, 16) * (until ? interpolate(f, [until, until + 8], [1, 0], clamp) : 1)
  const [a, b] = text.split(accent)
  return (
    <div style={{ position: 'absolute', left: 96, top: 56, opacity: p, transform: `translateY(${(1 - p) * 16}px)`, fontFamily: jakarta, fontWeight: 800, fontSize: 60, letterSpacing: '-0.02em', color: theme.text, zIndex: 30, maxWidth: 1250, lineHeight: 1.05 }}>
      {a}
      <span style={{ color: theme.brand }}>{accent}</span>
      {b}
    </div>
  )
}

const Persona: React.FC<{ icon: string; text: string; tag?: string }> = ({ icon, text, tag }) => {
  const f = useCurrentFrame()
  const p = ease(f, 8)
  return (
    <div style={{ position: 'absolute', right: 80, top: 62, display: 'flex', gap: 12, alignItems: 'center', opacity: p, zIndex: 30 }}>
      <div style={{ padding: '12px 22px', borderRadius: 999, background: 'rgba(15,24,19,0.78)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)', fontFamily: ui, fontWeight: 700, fontSize: 24, color: theme.text }}>
        {icon} {text}
      </div>
      {tag && <Tag text={tag} />}
    </div>
  )
}

const Tag: React.FC<{ text: string; style?: React.CSSProperties }> = ({ text, style }) => (
  <span style={{ padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(147,163,156,0.6)', color: '#A9B8B1', fontFamily: ui, fontWeight: 700, fontSize: 17, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'rgba(7,11,9,0.7)', ...style }}>
    {text}
  </span>
)

const Index: React.FC<{ n: number }> = ({ n }) => (
  <div style={{ position: 'absolute', left: 96, bottom: 40, fontFamily: 'Consolas, monospace', fontSize: 19, color: theme.textFaint, letterSpacing: '0.08em', zIndex: 30 }}>
    {String(n).padStart(2, '0')} / 11 · {TITLES[n]}
  </div>
)

const Arc: React.FC<{ at?: number }> = ({ at = 0 }) => {
  const f = useCurrentFrame()
  const p = ease(f, at, 40)
  return (
    <div style={{ position: 'absolute', left: '50%', bottom: -980 + p * 180, width: 2400, height: 1400, marginLeft: -1200, borderRadius: '50%', border: '3px solid rgba(52,211,153,0.75)', boxShadow: '0 0 80px rgba(34,197,94,0.55), inset 0 0 120px rgba(34,197,94,0.25)', opacity: p }} />
  )
}

/** Fade wrapper for a sub-shot. */
const Shot: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const f = useCurrentFrame()
  const o = interpolate(f, [0, 10, len - 10, len], [0, 1, 1, 0], clamp)
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
}

const Stage: React.FC<{ duration: number; n: number; tint?: 'brand' | 'critical'; children: React.ReactNode }> = ({ duration, n, tint, children }) => {
  const f = useCurrentFrame()
  const o = interpolate(f, [0, 10, duration - 10, duration], [0, 1, 1, 0], clamp)
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Backdrop glow={1} tint={tint}>{children}</Backdrop>
      <Index n={n} />
    </AbsoluteFill>
  )
}

const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ borderRadius: 24, background: 'linear-gradient(180deg, rgba(20,31,26,0.92), rgba(15,24,19,0.92))', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 24px 60px rgba(0,0,0,0.45)', fontFamily: ui, color: theme.text, ...style }}>
    {children}
  </div>
)

// ------------------------------------------------------------------ C01
const Bubble: React.FC<{ text: string; lang: string; at: number; x: number; y: number; neg?: boolean }> = ({ text, lang, at, x, y, neg }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: f - at, fps, config: { damping: 14, stiffness: 160 } })
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${s})`, transformOrigin: 'left bottom', opacity: s, padding: '14px 20px', borderRadius: '20px 20px 20px 4px', background: neg ? 'rgba(239,68,68,0.14)' : 'rgba(255,255,255,0.08)', border: `1px solid ${neg ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.15)'}`, fontFamily: ui, fontSize: 26, fontWeight: 600, color: theme.text, maxWidth: 420, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: theme.mint, marginRight: 10 }}>{lang}</span>
      {text}
    </div>
  )
}

const C01: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame()
  const storyB = 270
  const drop = 520
  const shopO = interpolate(f, [0, 12, storyB - 12, storyB], [0, 1, 1, 0], clamp)
  const bO = interpolate(f, [storyB, storyB + 12], [0, 1], clamp)
  const blur = interpolate(f, [drop, drop + 40], [0, 8], clamp)
  // Illustrative sales line: steady, then drops after `drop`.
  const pts = Array.from({ length: 24 }, (_, i) => {
    const base = 180 - i * 2 + Math.sin(i * 1.3) * 10
    const fall = i > 15 ? interpolate(f, [drop + 10, drop + 60], [0, (i - 15) * 22], clamp) : 0
    return `${40 + i * 22},${base + fall}`
  }).join(' ')
  const qBob = Math.sin(f / 10) * 8
  return (
    <Stage duration={duration} n={1} tint={f > drop ? 'critical' : 'brand'}>
      {/* Story A: kedai with an empty sales book */}
      <AbsoluteFill style={{ opacity: shopO }}>
        <Persona icon="🏪" text="Melaka · Opening a kedai · No sales records" tag="illustrative" />
        <svg width="700" height="560" viewBox="0 0 700 560" style={{ position: 'absolute', left: 250, top: 250 }}>
          <rect x="60" y="140" width="580" height="380" rx="18" fill="#0F1813" stroke="rgba(52,211,153,.5)" strokeWidth="3" />
          {Array.from({ length: 8 }).map((_, i) => (
            <path key={i} d={`M${60 + i * 72.5} 140 h72.5 v60 a36 30 0 0 1 -72.5 0z`} fill={i % 2 ? '#0F1813' : '#22C55E'} opacity={i % 2 ? 1 : 0.85} />
          ))}
          <rect x="230" y="70" width="240" height="64" rx="10" fill="#14201A" stroke="#FBBF24" strokeWidth="3" />
          <text x="350" y="114" textAnchor="middle" fill="#FBBF24" fontFamily={jakarta} fontWeight="800" fontSize="40">KEDAI</text>
          <rect x="110" y="250" width="480" height="270" fill="#0B110E" />
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={i} x1="110" x2="590" y1={262 + i * 18 * interpolate(f, [20, 70], [0.4, 1], clamp)} y2={262 + i * 18 * interpolate(f, [20, 70], [0.4, 1], clamp)} stroke="#3A4741" strokeWidth="6" />
          ))}
        </svg>
        <div style={{ position: 'absolute', left: 1050, top: 300, width: 600, opacity: ease(f, 40), transform: `rotate(-3deg) translateY(${(1 - ease(f, 40)) * 30}px)` }}>
          <Card style={{ padding: 30, background: '#F3EFE3', color: '#2A2A2A' }}>
            <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 32, color: '#2A2A2A' }}>Buku Jualan</div>
            {['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat'].map((d) => (
              <div key={d} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #D8D2C0', padding: '12px 0', fontSize: 26, color: '#555' }}>
                <span>{d}</span>
                <span style={{ color: '#B9B3A2' }}>RM —</span>
              </div>
            ))}
          </Card>
          <div style={{ position: 'absolute', right: -40, top: -70 + qBob, fontFamily: jakarta, fontWeight: 800, fontSize: 150, color: GOLD, textShadow: '0 0 40px rgba(251,191,36,0.5)' }}>?</div>
        </div>
      </AbsoluteFill>

      {/* Story B: comments flood in, sales still look fine, then fall */}
      <AbsoluteFill style={{ opacity: bO }}>
        <Sequence from={storyB}>
          <Persona icon="🥤" text="Segar Drinks · 12,480 comments this month" tag="illustrative" />
        </Sequence>
        <div style={{ position: 'absolute', left: 200, top: 200, width: 900, height: 620, filter: `blur(${blur}px)` }}>
          <Bubble text="Botol bocor la, habis beg saya" lang="BM" at={storyB + 10} x={0} y={0} neg />
          <Bubble text="瓶子漏水了，很失望" lang="中文" at={storyB + 28} x={120} y={110} neg />
          <Bubble text="Bottle leaked all over my bag" lang="EN" at={storyB + 46} x={30} y={220} neg />
          <Bubble text="Sedap, tapi penutup longgar" lang="BM" at={storyB + 64} x={200} y={330} />
          <Bubble text="Love the taste! 😍" lang="EN" at={storyB + 82} x={60} y={440} />
          <Bubble text="包装需要改进" lang="中文" at={storyB + 100} x={330} y={520} neg />
        </div>
        <div style={{ position: 'absolute', left: 1120, top: 300, width: 620 }}>
          <Card style={{ padding: 28 }}>
            <div style={{ fontSize: 24, color: theme.textMuted, fontWeight: 700 }}>Weekly sales</div>
            <svg width="560" height="300" viewBox="0 0 560 300">
              <polyline points={pts} fill="none" stroke={f > drop + 20 ? theme.negative : theme.brand} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 26, fontWeight: 800, color: f > drop + 20 ? theme.negative : theme.brand }}>{f > drop + 20 ? '▼ falling' : '● looks fine'}</div>
          </Card>
        </div>
      </AbsoluteFill>
      <Sequence from={drop}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 190 }}>
          <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 88, color: theme.text, opacity: ease(f - drop, 10), letterSpacing: '-0.03em', textShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            Two businesses. <span style={{ color: theme.brand }}>One</span> problem.
          </div>
        </AbsoluteFill>
      </Sequence>
    </Stage>
  )
}

// ------------------------------------------------------------------ C02
/**
 * Audio-visualiser presenter: the owner's own photo (background removed, not
 * altered) in an octagon frame, with a horizontal waveform on both sides that
 * is driven by the real voice-over clip's spectrum, frame by frame.
 */
const OCT = 'polygon(29% 0, 71% 0, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0 71%, 0 29%)'
const Presenter: React.FC<{ clip: string; voOffset: number }> = ({ clip, voOffset }) => {
  const f = useCurrentFrame()
  const { fps, width } = useVideoConfig()
  const audio = useAudioData(staticFile(clip))
  const N = 64
  const vf = f - voOffset
  const spec = audio && vf >= 0 ? visualizeAudio({ fps, frame: vf, audioData: audio, numberOfSamples: N, optimizeFor: 'speed' }) : new Array(N).fill(0)
  // Speech energy sits in the low bins; spread them across the bars with a gentle boost.
  const level = Math.min(1, spec.slice(0, 16).reduce((a, v) => a + v, 0) / 16 * 6)
  const BARS = 44
  const bar = (i: number) => {
    const bin = Math.min(N - 1, Math.floor((i / BARS) * 24))
    const v = Math.min(1, spec[bin] * 7 * (1 - i / (BARS * 1.4)))
    const idle = 0.05 + 0.03 * Math.sin(f / 5 + i * 1.7)
    return Math.max(idle, v)
  }
  const enter = ease(f, 0, 24)
  const S = 520 // octagon size
  const cx = width / 2
  const pulse = 1 + level * 0.025
  const sideW = (width - S) / 2 - 40
  const Bars: React.FC<{ side: 'l' | 'r' }> = ({ side }) => (
    <div style={{ position: 'absolute', top: 540 - 220, height: 440, width: sideW, [side === 'l' ? 'left' : 'right']: 20, display: 'flex', flexDirection: side === 'l' ? 'row-reverse' : 'row', alignItems: 'center', gap: 9, opacity: enter }}>
      {Array.from({ length: BARS }).map((_, i) => {
        const h = 16 + bar(i) * 400
        return <div key={i} style={{ width: 7, height: h, borderRadius: 4, background: i < 6 ? '#A3E635' : '#22C55E', opacity: 0.35 + 0.65 * (1 - i / BARS), boxShadow: '0 0 10px rgba(34,197,94,0.45)' }} />
      })}
    </div>
  )
  const Chevrons: React.FC<{ side: 'l' | 'r' }> = ({ side }) => (
    <svg width="380" height="520" viewBox="0 0 380 520" style={{ position: 'absolute', top: 280, [side === 'l' ? 'left' : 'right']: cx - S / 2 - 400, transform: side === 'r' ? 'scaleX(-1)' : undefined, opacity: enter * (0.55 + level * 0.45) }}>
      {[0, 1, 2].map((k) => {
        const x = 330 - k * 95 - level * 14
        return <polyline key={k} points={`${x},20 ${x - 120},260 ${x},500`} fill="none" stroke="#34D399" strokeWidth={9 - k * 2} strokeOpacity={0.9 - k * 0.25} strokeLinecap="round" />
      })}
    </svg>
  )
  return (
    <AbsoluteFill>
      <Bars side="l" />
      <Bars side="r" />
      <Chevrons side="l" />
      <Chevrons side="r" />
      {/* frame ring, pulsing with the voice */}
      <div style={{ position: 'absolute', left: cx - S / 2 - 18, top: 540 - S / 2 - 18, width: S + 36, height: S + 36, clipPath: OCT, background: 'linear-gradient(140deg, #34D399, #0B3D24 55%, #A3E635)', transform: `scale(${pulse * (0.9 + 0.1 * enter)})`, opacity: enter, filter: `drop-shadow(0 0 ${20 + level * 40}px rgba(34,197,94,0.7))` }} />
      <div style={{ position: 'absolute', left: cx - S / 2, top: 540 - S / 2, width: S, height: S, clipPath: OCT, transform: `scale(${0.9 + 0.1 * enter})`, opacity: enter, overflow: 'hidden', background: 'radial-gradient(circle at 50% 35%, #0F3A28, #04120B 75%)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(52,211,153,0.22) 2px, transparent 2px), linear-gradient(90deg, rgba(52,211,153,0.22) 2px, transparent 2px)', backgroundSize: '58px 58px' }} />
        <Img src={staticFile(C + 'danish.png')} style={{ position: 'absolute', left: '50%', bottom: -40, height: S * 1.02, transform: 'translateX(-50%)' }} />
      </div>
      <div style={{ position: 'absolute', top: 120, width: '100%', textAlign: 'center', fontFamily: jakarta, fontWeight: 800, fontSize: 96, letterSpacing: '0.18em', color: theme.text, opacity: enter }}>
        INSIGHTAID <span style={{ color: theme.brand }}>AI</span>
      </div>
      <div style={{ position: 'absolute', top: 840, width: '100%', textAlign: 'center', fontFamily: jakarta, fontWeight: 800, fontSize: 54, letterSpacing: '0.22em', color: theme.text, opacity: ease(f, 20) }}>
        TEAM SULUH <span style={{ color: theme.brand }}>·</span> DANISH ALIF
      </div>
    </AbsoluteFill>
  )
}

const C02: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const P = 215 // presenter until "...Universiti Teknologi PETRONAS"
  const presO = interpolate(f, [P - 14, P], [1, 0], clamp)
  const t = f - P
  const logo = spring({ frame: t - 6, fps, config: { damping: 13, stiffness: 120 } })
  const sub = 'An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups'
  const typed = Math.round(interpolate(t, [20, 140], [0, sub.length], clamp))
  return (
    <Stage duration={duration} n={2}>
      <AbsoluteFill style={{ opacity: presO }}>
        <Presenter clip="assets/vo-comp/s02.wav" voOffset={LEAD} />
      </AbsoluteFill>
      <Sequence from={P}>
        <Arc at={0} />
        <div style={{ position: 'absolute', left: 120, top: 210, width: 1300 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, opacity: logo, transform: `scale(${0.9 + 0.1 * logo})`, transformOrigin: 'left center' }}>
            <Img src={staticFile(C + 'glyph.png')} style={{ height: 150, filter: 'drop-shadow(0 0 30px rgba(34,197,94,0.5))' }} />
            <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 128, letterSpacing: '-0.045em', color: theme.text, lineHeight: 1 }}>
              INSIGHTAID{' '}
              <span style={{ background: 'linear-gradient(120deg,#0EA5E9,#22C55E 50%,#A3E635)', WebkitBackgroundClip: 'text', color: 'transparent' }}>AI</span>
            </div>
          </div>
          <div style={{ fontFamily: ui, fontWeight: 600, fontSize: 38, color: theme.text, marginTop: 30, minHeight: 100, lineHeight: 1.3 }}>
            {sub.slice(0, typed)}
            {typed < sub.length && <span style={{ color: theme.brand }}>▍</span>}
          </div>
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 64, color: GOLD, marginTop: 14, opacity: ease(t, 140) }}>“Decisions, backed by evidence.”</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 32, flexWrap: 'wrap' }}>
            {['🔥 Team Suluh', 'Danish Alif · Universiti Teknologi PETRONAS', 'Supervisor: Ts. Ahmad Izuddin Bin Zainal Abidin', 'Category B (IPT) · Track B1 · AI & Data Science'].map((x, i) => (
              <div key={x} style={{ opacity: ease(t, 30 + i * 12), transform: `translateY(${(1 - ease(t, 30 + i * 12)) * 20}px)`, padding: '14px 24px', borderRadius: 999, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.45)', fontFamily: ui, fontWeight: 700, fontSize: 26, color: theme.text }}>
                {x}
              </div>
            ))}
          </div>
        </div>
      </Sequence>
    </Stage>
  )
}

// ------------------------------------------------------------------ C03
const STATS = [
  { v: 90, pre: '~', cap: 'of startups eventually fail', src: 'Startup Genome, 2025' },
  { v: 42, pre: '', cap: 'fail because there was no market need', src: 'CB Insights, 2025' },
  { v: 70, pre: '', cap: 'of SMEs use no BI tools; cost is the main barrier', src: 'Statista, 2025 · Gartner, 2025' },
  { v: 60, pre: '', cap: 'react only after the damage is visible', src: 'McKinsey, 2022' },
]
const C03: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame()
  const alt = beat(3, 50) - 20
  const end = beat(3, 66) - 10
  const statsO = interpolate(f, [alt - 12, alt], [1, 0], clamp)
  const altO = interpolate(f, [alt, alt + 12, end - 8, end], [0, 1, 1, 0], clamp)
  const starts = [beat(3, 0), beat(3, 9), beat(3, 18), beat(3, 36)]
  return (
    <Stage duration={duration} n={3}>
      <Headline text="The startup intelligence gap" accent="gap" />
      <div style={{ position: 'absolute', left: 96, right: 96, top: 250, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28, opacity: statsO }}>
        {STATS.map((s, i) => {
          const p = ease(f, starts[i], 20)
          const v = Math.round(interpolate(f, [starts[i], starts[i] + 30], [0, s.v], { ...clamp, easing: expoOut }))
          return (
            <Card key={i} style={{ padding: '40px 26px', textAlign: 'center', opacity: p, transform: `translateY(${(1 - p) * 40}px)` }}>
              <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 130, lineHeight: 1, background: 'linear-gradient(120deg,#0EA5E9,#22C55E 50%,#A3E635)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                {s.pre}
                {v}%
              </div>
              <div style={{ fontSize: 30, fontWeight: 600, marginTop: 18, lineHeight: 1.25 }}>{s.cap}</div>
              <div style={{ fontSize: 20, color: theme.textFaint, fontStyle: 'italic', marginTop: 14 }}>{s.src}</div>
            </Card>
          )
        })}
      </div>
      <div style={{ position: 'absolute', left: 96, right: 96, top: 250, opacity: altO }}>
        <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 36, color: theme.textMuted, marginBottom: 24 }}>What they use today</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
          {[
            { t: 'Spreadsheets', d: 'No language understanding', icon: '▦' },
            { t: 'Enterprise BI', d: 'RM1,500 – 10,000+ per user / month', icon: '💳', tag: 'indicative' },
            { t: 'Reading comments by hand', d: 'Too slow, three languages', icon: '💬' },
          ].map((o, i) => {
            const p = ease(f, alt + 10 + i * 16)
            return (
              <Card key={o.t} style={{ padding: 36, opacity: p, transform: `translateY(${(1 - p) * 30}px)`, borderColor: 'rgba(239,68,68,0.4)' }}>
                <div style={{ fontSize: 64 }}>{o.icon}</div>
                <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 40, marginTop: 10 }}>{o.t}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
                  <span style={{ width: 52, height: 52, borderRadius: 26, background: 'rgba(239,68,68,0.18)', color: '#F87171', fontSize: 34, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✗</span>
                  <span style={{ fontSize: 28, color: '#FCA5A5', fontWeight: 700 }}>{o.d}</span>
                </div>
                {o.tag && <Tag text={o.tag} style={{ display: 'inline-block', marginTop: 14 }} />}
              </Card>
            )
          })}
        </div>
      </div>
      <Sequence from={end}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 92, textAlign: 'center', lineHeight: 1.1, color: theme.text, opacity: ease(f - end, 4), maxWidth: 1500, letterSpacing: '-0.03em' }}>
            The warning signs are public.
            <br />
            <span style={{ color: theme.brand }}>Nobody can read them in time.</span>
          </div>
        </AbsoluteFill>
      </Sequence>
    </Stage>
  )
}

// ------------------------------------------------------------------ C04
const OBJ = [
  { icon: '🌐', t: 'Multilingual sentiment', d: 'Develop and evaluate an XLM-RoBERTa model that classifies customer opinion in English, Bahasa Melayu, Mandarin and code-mixed text.' },
  { icon: '📈', t: 'Forecasting & crisis signals', d: 'Develop and compare sales forecasting models, including a sentiment-enhanced variant, using rolling-origin validation.' },
  { icon: '🧭', t: 'Integrated decision support', d: 'Crisis detection, explainable rule-based recommendations, business planning tools and a controlled agentic assistant, evaluated technically and with users.' },
]
const C04: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame()
  const at = [beat(4, 6), beat(4, 14), beat(4, 25)]
  return (
    <Stage duration={duration} n={4}>
      <Headline text="Three objectives" accent="objectives" />
      <div style={{ position: 'absolute', left: 96, right: 96, top: 240, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30 }}>
        {OBJ.map((o, i) => {
          const p = ease(f, at[i], 22)
          const tick = ease(f, at[i] + 24, 10)
          return (
            <Card key={o.t} style={{ padding: 40, opacity: p, transform: `translateY(${(1 - p) * 40}px)`, minHeight: 560, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 92, height: 92, borderRadius: 24, background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.5)', fontSize: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{o.icon}</div>
                <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 60, color: GOLD }}>O{i + 1}</div>
              </div>
              <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 42, marginTop: 28, lineHeight: 1.1 }}>{o.t}</div>
              <div style={{ fontSize: 28, color: theme.textMuted, marginTop: 18, lineHeight: 1.38 }}>{o.d}</div>
              <div style={{ position: 'absolute', right: 30, bottom: 30, width: 64, height: 64, borderRadius: 32, background: theme.brand, color: '#04210f', fontSize: 38, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${tick})`, boxShadow: `0 0 30px ${theme.brandGlow}` }}>✓</div>
            </Card>
          )
        })}
      </div>
      <div style={{ position: 'absolute', left: 96, top: 830, fontSize: 20, color: theme.textFaint, fontFamily: ui, fontStyle: 'italic' }}>Objectives condensed from the FYP dissertation.</div>
    </Stage>
  )
}

// ------------------------------------------------------------------ C05
const C05: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame()
  const split = beat(5, 24)
  const shotO = interpolate(f, [split - 10, split], [1, 0], clamp)
  const cols = [
    { t: '🏪 Malaysian Local Shop', s: 'No data needed', chips: ['AI-drafted business plan', 'Break-even & margins', 'Malay / English assistant'] },
    { t: '📈 Business Startup', s: 'Bring your data', chips: ['Multilingual sentiment', 'Crisis early warning', 'Evidence-backed actions'] },
  ]
  return (
    <Stage duration={duration} n={5}>
      <Headline text="One app. Two ways in." accent="Two ways" />
      <AbsoluteFill style={{ opacity: shotO }}>
        <Screen src={W1 + 'user-01-kind.png'} w={1865} h={886} box={BOX} cams={[{ f: 0, cx: 935, cy: 400, w: 1500 }, { f: 30, cx: 935, cy: 330, w: 1050 }]}>
          <Mark x={551} y={221} w={376} h={189} at={beat(5, 4)} until={beat(5, 15)} label="No data needed" />
          <Mark x={943} y={221} w={376} h={189} at={beat(5, 15)} until={split - 12} label="Bring your data" />
          <ShotCursor path={[{ f: 20, x: 1300, y: 600 }, { f: beat(5, 4), x: 740, y: 320 }, { f: beat(5, 15), x: 1130, y: 320 }]} hideAt={split - 14} />
        </Screen>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 140, right: 140, top: 230, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, opacity: ease(f, split) }}>
        {cols.map((c, ci) => (
          <Card key={c.t} style={{ padding: 44 }}>
            <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 50 }}>{c.t}</div>
            <div style={{ fontSize: 30, color: GOLD, fontWeight: 700, marginTop: 6 }}>{c.s}</div>
            {c.chips.map((ch, i) => {
              const p = ease(f, split + 12 + ci * 10 + i * 10)
              return (
                <div key={ch} style={{ marginTop: 22, padding: '18px 26px', borderRadius: 18, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.45)', fontSize: 32, fontWeight: 700, opacity: p, transform: `translateX(${(1 - p) * (ci ? 60 : -60)}px)` }}>
                  ✓ {ch}
                </div>
              )
            })}
          </Card>
        ))}
      </div>
    </Stage>
  )
}

// ------------------------------------------------------------------ demos
/** A framed real capture with a subtle 3D idle tilt that flattens when zoomed in. */
const Framed: React.FC<{ src: string; w: number; h: number; cams: Cam[]; tilt?: boolean; children?: React.ReactNode }> = ({ src, w, h, cams, tilt = true, children }) => {
  const f = useCurrentFrame()
  const rot = tilt ? interpolate(f, [0, 24], [-6, 0], { ...clamp, easing: expoOut }) : 0
  return (
    <AbsoluteFill style={{ perspective: 2000 }}>
      <AbsoluteFill style={{ transform: `rotateY(${rot}deg)` }}>
        <Screen src={src} w={w} h={h} box={BOX} cams={cams}>
          {children}
        </Screen>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

const RealTag: React.FC<{ text?: string }> = ({ text = 'real app · demo account' }) => (
  <div style={{ position: 'absolute', left: BOX.x + 20, top: BOX.y + BOX.h + 16, zIndex: 30 }}>
    <Tag text={text} style={{ borderColor: 'rgba(34,197,94,0.55)', color: theme.mint }} />
  </div>
)

/** Sentence start frames for a scene, relative to the scene (voice starts at LEAD). */
const vb = (scene: number) => VO_BEATS[scene].map((x) => x + LEAD)

const C06: React.FC<{ duration: number }> = ({ duration }) => {
  const v = vb(6) // 0 start · 1 describe · 2 example · 3 break-even · 4 margins · 5 what-if · 6 ask · 7 assistant
  const b = [0, v[3], v[4], v[5], v[6], duration]
  const D = v[2] + 6 // describe shot, until "Or open the example shop"
  const m = Math.max(48, Math.floor((b[3] - b[2]) / 3)) // montage slice
  const w = b[4] - b[3] // what-if beat length
  const sw = Math.round(w * 0.5) // the price change lands mid-sentence
  return (
    <Stage duration={duration} n={6}>
      <Persona icon="🏪" text="Mak Cik Rohana · Melaka · No sales records" tag="illustrative persona" />
      <Sequence durationInFrames={b[1]}>
        <Shot len={b[1]}>
          <Headline text="Describe it. AI drafts the plan." accent="AI drafts" />
          <Sequence durationInFrames={D + 8}>
            <Shot len={D + 8}>
              <Framed src={W1 + 'user-03-describe.png'} w={1859} h={842} cams={[{ f: 0, cx: 921, cy: 330, w: 1300 }, { f: 20, cx: 921, cy: 320, w: 980 }]}>
                <Mark x={606} y={208} w={306} h={60} at={Math.round(D * 0.18)} until={Math.round(D * 0.44)} label="Business sector" />
                <Mark x={929} y={208} w={307} h={60} at={Math.round(D * 0.46)} until={Math.round(D * 0.7)} label="Revenue target" />
                <Mark x={606} y={288} w={630} h={160} at={Math.round(D * 0.72)} until={D - 4} label="What you sell, and to whom" />
              </Framed>
            </Shot>
          </Sequence>
          <Sequence from={D} durationInFrames={b[1] - D}>
            <Shot len={b[1] - D}>
              <Framed src={W1 + '02-generate-empty.jpg'} w={1440} h={810} tilt={false} cams={[{ f: 0, cx: 520, cy: 520, w: 1000 }]}>
                <Mark x={247} y={553} w={172} h={18} at={24} label="Or open the example shop: Kedai Makmur" labelSide="bottom" />
                <ShotCursor path={[{ f: 2, x: 640, y: 660 }, { f: 22, x: 333, y: 562 }]} clicks={[28]} />
              </Framed>
            </Shot>
          </Sequence>
        </Shot>
      </Sequence>
      <Sequence from={b[1]} durationInFrames={b[2] - b[1]}>
        <Shot len={b[2] - b[1]}>
          <Headline text="Calculated, not guessed." accent="Calculated" />
          <Framed src={W1 + '03-overview.jpg'} w={1440} h={810} cams={[{ f: 0, ...FULL }, { f: 24, cx: 965, cy: 440, w: 950 }, { f: 160, cx: 965, cy: 440, w: 950 }, { f: 186, cx: 720, cy: 560, w: 1400 }]}>
            <Mark x={1073} y={379} w={335} h={116} at={26} until={110} label="Break-even sales / month" />
            <Mark x={379} y={379} w={682} h={116} at={114} until={b[2] - b[1] - 14} label="Every figure calculated by the app" labelSide="bottom" />
          </Framed>
          <RealTag text="real app · example shop" />
        </Shot>
      </Sequence>
      <Sequence from={b[2]} durationInFrames={b[3] - b[2]}>
        <Shot len={b[3] - b[2]}>
          <Headline text="Know your margins and your capital." accent="margins" />
          {[
            { src: '04-products.jpg', cam: { cx: 720, cy: 450, w: 1380 }, label: 'Best-margin products' },
            { src: '05-financial.jpg', cam: { cx: 720, cy: 530, w: 1380 }, label: 'Monthly costs' },
            { src: '06-capital.jpg', cam: { cx: 860, cy: 590, w: 1100 }, label: 'Capital still needed' },
          ].map((it, i) => (
            <Sequence key={it.src} from={i * m} durationInFrames={i === 2 ? b[3] - b[2] - 2 * m : m}>
              <Shot len={i === 2 ? b[3] - b[2] - 2 * m : m}>
                <Framed src={W1 + it.src} w={1440} h={810} tilt={false} cams={[{ f: 0, ...FULL }, { f: 20, ...it.cam }]}>
                  {i === 2 && <Mark x={1073} y={539} w={335} h={95} at={22} label={it.label} />}
                </Framed>
                {i < 2 && (
                  <div style={{ position: 'absolute', left: BOX.x + 30, top: BOX.y + BOX.h - 80, padding: '12px 22px', borderRadius: 999, background: 'rgba(5,8,7,0.85)', border: '1px solid rgba(34,197,94,0.5)', fontFamily: ui, fontWeight: 800, fontSize: 28, color: theme.text }}>{it.label}</div>
                )}
              </Shot>
            </Sequence>
          ))}
        </Shot>
      </Sequence>
      <Sequence from={b[3]} durationInFrames={w}>
        <Shot len={w}>
          <Headline text="Test a price before you change it." accent="before" />
          <Framed src={W1 + '07-whatif-a.jpg'} w={1440} h={810} cams={[{ f: 0, ...FULL }, { f: 18, cx: 720, cy: 420, w: 1300 }]}>
            <Mark x={50} y={356} w={665} h={48} at={16} until={sw - 4} label="Selling price RM8 → RM8.60" />
            <ShotCursor path={[{ f: 14, x: 420, y: 470 }, { f: 30, x: 167, y: 392 }, { f: sw, x: 215, y: 392 }]} clicks={[32]} hideAt={sw + 6} />
          </Framed>
          <Sequence from={sw}>
            <Framed src={W1 + '07-whatif-b.jpg'} w={1440} h={810} tilt={false} cams={[{ f: 0, cx: 720, cy: 420, w: 1300 }]}>
              <Mark x={730} y={389} w={654} h={95} at={8} label="Results update instantly" labelSide="bottom" />
            </Framed>
          </Sequence>
          <RealTag text="real app · example shop" />
        </Shot>
      </Sequence>
      <Sequence from={b[4]} durationInFrames={b[5] - b[4]}>
        <Shot len={b[5] - b[4]}>
          <Headline text="Ask in Malay. You decide." accent="Malay" />
          <Framed src={W1 + '08b-assistant-typed.jpg'} w={1440} h={810} cams={[{ f: 0, ...FULL }, { f: 20, cx: 560, cy: 400, w: 1150 }]}>
            <Mark x={52} y={360} w={995} h={82} at={22} until={70} label="“Cukup ke modal saya untuk buka kedai ni?”" />
            <ShotCursor path={[{ f: 50, x: 800, y: 560 }, { f: 72, x: 1002, y: 476 }]} clicks={[78]} hideAt={88} />
          </Framed>
          <Sequence from={v[7] - b[4]}>
            <Framed src={W1 + '08c-assistant-answer.jpg'} w={1440} h={810} tilt={false} cams={[{ f: 0, cx: 560, cy: 400, w: 1150 }, { f: 22, cx: 560, cy: 640, w: 1100 }, { f: 170, cx: 560, cy: 640, w: 1100 }, { f: 196, cx: 1150, cy: 410, w: 960 }]}>
              <Mark x={32} y={540} w={1036} h={244} at={26} until={166} label="Answer from the shop's own figures" />
              <Mark x={1088} y={202} w={320} h={443} at={200} label="Every step shown" />
            </Framed>
          </Sequence>
          <RealTag text="real app · live AI answer" />
        </Shot>
      </Sequence>
    </Stage>
  )
}

const ScanComment: React.FC<{ text: string; lang: string; label: string; score: string; neg: boolean; at: number; y: number }> = ({ text, lang, label, score, neg, at, y }) => {
  const f = useCurrentFrame()
  const p = ease(f, at)
  const scan = interpolate(f, [at + 10, at + 34], [0, 100], clamp)
  const lab = ease(f, at + 34, 10)
  const col = neg ? theme.negative : theme.positive
  return (
    <div style={{ position: 'absolute', left: 200, top: y, width: 1000, opacity: p, transform: `translateX(${(1 - p) * -40}px)` }}>
      <Card style={{ padding: '24px 30px', position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 600 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: theme.mint, marginRight: 14 }}>{lang}</span>
          {text}
        </div>
        <div style={{ opacity: lab, padding: '10px 18px', borderRadius: 999, background: `${col}22`, border: `1px solid ${col}`, color: col, fontWeight: 800, fontSize: 24, whiteSpace: 'nowrap' }}>
          {label} · {score}
        </div>
        {scan > 0 && scan < 100 && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${scan}%`, width: 6, background: theme.mint, boxShadow: `0 0 24px ${theme.mint}` }} />}
      </Card>
    </div>
  )
}

const C07: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame()
  // 0 now · 1 upload · 2 every comment · 3 then something changes · 4 negative 15→40 · 5 early warning + signals · 6 forecast · 7 recommendations · 8 dashboard
  const v = vb(7)
  const b = [0, v[2], v[3], v[6], v[7], v[8], duration]
  const meterLen = v[5] - v[3] + 10
  return (
    <Stage duration={duration} n={7} tint={f > b[2] && f < b[3] ? 'critical' : 'brand'}>
      <Persona icon="🥤" text="Aina · Segar Drinks · 12,480 comments" tag="illustrative persona" />
      <Sequence durationInFrames={b[1]}>
        <Shot len={b[1]}>
          <Headline text="Bring your data in." accent="data" />
          <Sequence durationInFrames={v[1] + 10}>
            <Shot len={v[1] + 10}>
              <Framed src={W2 + 'user-02-hasdata.png'} w={1864} h={901} cams={[{ f: 0, cx: 930, cy: 400, w: 1300 }, { f: 18, cx: 930, cy: 362, w: 1050 }]}>
                <Mark x={545} y={243} w={376} h={149} at={Math.max(20, v[1] - 30)} label="I have data" />
                <ShotCursor path={[{ f: 8, x: 1150, y: 520 }, { f: Math.max(18, v[1] - 36), x: 735, y: 318 }]} clicks={[Math.max(20, v[1] - 30)]} />
              </Framed>
            </Shot>
          </Sequence>
          <Sequence from={v[1]} durationInFrames={b[1] - v[1]}>
            <Shot len={b[1] - v[1]}>
              <Framed src={W2 + '02-datasets.jpg'} w={1440} h={810} tilt={false} cams={[{ f: 0, ...FULL }, { f: 18, cx: 720, cy: 470, w: 1300 }]}>
                <Mark x={32} y={309} w={1376} h={336} at={20} label="Upload sales & reviews: CSV, JSON or Excel" />
              </Framed>
              <RealTag />
            </Shot>
          </Sequence>
        </Shot>
      </Sequence>
      <Sequence from={b[1]} durationInFrames={b[2] - b[1]}>
        <Shot len={b[2] - b[1]}>
          <Headline text="Every comment, every language." accent="every language" />
          <Sequence durationInFrames={Math.round((b[2] - b[1]) * 0.6)}>
            <Shot len={Math.round((b[2] - b[1]) * 0.6)}>
              <ScanComment text="Botol bocor la, habis beg saya" lang="BM" label="Negative" score="0.96" neg at={8} y={260} />
              <ScanComment text="瓶子漏水了，很失望" lang="中文" label="Negative" score="0.93" neg at={32} y={420} />
              <ScanComment text="Love the taste, will buy again" lang="EN" label="Positive" score="0.91" neg={false} at={56} y={580} />
              <div style={{ position: 'absolute', left: 1260, top: 300, width: 480 }}>
                <Card style={{ padding: 30 }}>
                  <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 32 }}>Sentiment, per comment</div>
                  <div style={{ fontSize: 24, color: theme.textMuted, marginTop: 10, lineHeight: 1.4 }}>XLM-RoBERTa evaluated at <b style={{ color: theme.brand }}>84.12%</b> accuracy on 10,769 held-out comments</div>
                </Card>
                <Tag text="illustrative comments · scores for demo" style={{ display: 'inline-block', marginTop: 16 }} />
              </div>
            </Shot>
          </Sequence>
          <Sequence from={Math.round((b[2] - b[1]) * 0.58)} durationInFrames={b[2] - b[1] - Math.round((b[2] - b[1]) * 0.58)}>
            <Shot len={b[2] - b[1] - Math.round((b[2] - b[1]) * 0.58)}>
              <Framed src={W2 + '03-dashboard.jpg'} w={1440} h={810} cams={[{ f: 0, ...FULL }, { f: 20, cx: 960, cy: 560, w: 1000 }]}>
                <Mark x={960} y={613} w={448} h={190} at={24} label="Platform by platform" />
              </Framed>
              <RealTag />
            </Shot>
          </Sequence>
        </Shot>
      </Sequence>
      <Sequence from={b[2]} durationInFrames={b[3] - b[2]}>
        <Shot len={b[3] - b[2]}>
          <Headline text="Catch it before sales fall." accent="before" />
          <Sequence durationInFrames={meterLen}>
            <Shot len={meterLen}>
              <CrisisMeter />
            </Shot>
          </Sequence>
          <Sequence from={meterLen - 10} durationInFrames={b[3] - b[2] - meterLen + 10}>
            <Shot len={b[3] - b[2] - meterLen + 10}>
              <Framed src={W2 + '05b-signals.jpg'} w={1376} h={654} cams={[{ f: 0, cx: 688, cy: 300, w: 1376 }, { f: 24, cx: 500, cy: 280, w: 1000 }]}>
                <Mark x={25} y={80} w={1326} h={69} at={28} until={120} label="The exact signal: 50% negative today" />
                <Mark x={25} y={400} w={1326} h={69} at={124} label="Average rating falling" />
              </Framed>
              <RealTag />
            </Shot>
          </Sequence>
        </Shot>
      </Sequence>
      <Sequence from={b[3]} durationInFrames={b[4] - b[3]}>
        <Shot len={b[4] - b[3]}>
          <Headline text="See where revenue is heading." accent="revenue" />
          <Framed src={W2 + '06-forecast.jpg'} w={1440} h={810} cams={[{ f: 0, ...FULL }, { f: 20, cx: 760, cy: 525, w: 1300 }]}>
            <Mark x={1165} y={470} w={230} h={200} at={28} label="Forecast with uncertainty band" labelAlign="right" />
          </Framed>
          <RealTag />
        </Shot>
      </Sequence>
      <Sequence from={b[4]} durationInFrames={b[5] - b[4]}>
        <Shot len={b[5] - b[4]}>
          <Headline text="Act on evidence." accent="evidence" />
          <Framed src={W2 + '07c-rec-open.jpg'} w={680} h={390} cams={[{ f: 0, cx: 340, cy: 195, w: 860 }, { f: b[5] - b[4], cx: 340, cy: 195, w: 760 }]}>
            <Mark x={36} y={90} w={470} h={50} at={20} until={80} label="Evidence that triggered it" labelSide="bottom" />
            <Mark x={21} y={232} w={638} h={138} at={84} until={150} label="The reason, in plain language" />
            <Mark x={548} y={22} w={115} h={24} at={154} label="The exact rule" labelSide="bottom" />
          </Framed>
          <RealTag />
        </Shot>
      </Sequence>
      <Sequence from={b[5]} durationInFrames={b[6] - b[5]}>
        <Shot len={b[6] - b[5]}>
          <Headline text="All in one place. Any device." accent="Any device" />
          <AbsoluteFill style={{ top: 80 }}>
            <DeviceScene start={0} />
          </AbsoluteFill>
        </Shot>
      </Sequence>
    </Stage>
  )
}

/** Illustrative crisis moment for the Segar Drinks persona: 15% -> 40% negative. */
const CrisisMeter: React.FC = () => {
  const f = useCurrentFrame()
  const v = interpolate(f, [12, 70], [15, 40], { ...clamp, easing: expoOut })
  const hit = f >= 70
  const toast = ease(f, 76, 14)
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 260, top: 260, width: 800 }}>
        <Card style={{ padding: 40, borderColor: hit ? 'rgba(239,68,68,0.6)' : undefined, boxShadow: hit ? '0 0 60px rgba(239,68,68,0.35)' : undefined }}>
          <div style={{ fontSize: 28, color: theme.textMuted, fontWeight: 700 }}>Negative share of comments</div>
          <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 180, lineHeight: 1, color: hit ? theme.negative : theme.text, marginTop: 10 }}>{Math.round(v)}%</div>
          <div style={{ height: 22, borderRadius: 11, background: 'rgba(255,255,255,0.08)', marginTop: 20, overflow: 'hidden' }}>
            <div style={{ width: `${v * 2}%`, height: '100%', background: hit ? theme.negative : theme.warning }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' }}>
            {['bocor', '漏水', 'leak', 'packaging'].map((t, i) => (
              <span key={t} style={{ opacity: ease(f, 84 + i * 8), padding: '10px 20px', borderRadius: 999, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)', color: '#FCA5A5', fontWeight: 800, fontSize: 28 }}>
                #{t}
              </span>
            ))}
          </div>
        </Card>
        <Tag text="illustrative scenario" style={{ display: 'inline-block', marginTop: 16 }} />
      </div>
      <div style={{ position: 'absolute', right: 160, top: 300, width: 600, opacity: toast, transform: `translateX(${(1 - toast) * 80}px)` }}>
        <Card style={{ padding: 30, borderColor: 'rgba(239,68,68,0.7)', boxShadow: '0 0 50px rgba(239,68,68,0.35)' }}>
          <div style={{ color: theme.negative, fontWeight: 800, fontSize: 32 }}>⚠ Crisis alert · High</div>
          <div style={{ fontSize: 26, color: theme.textMuted, marginTop: 10 }}>Negative share 15% → 40% in 48 h. Top signal: leaking bottles, in BM, 中文 and EN.</div>
        </Card>
      </div>
    </AbsoluteFill>
  )
}

// ------------------------------------------------------------------ C08
const PIPE = [
  { t: 'Data sources', s: 'Reviews, social, sales', icon: '💬' },
  { t: 'Clean & detect', s: 'Language, translation', icon: '🧹' },
  { t: 'Supabase', s: 'PostgreSQL · row-level security', icon: '🗄️' },
  { t: 'AI engine', s: 'XLM-RoBERTa (evaluated) · crisis rules · forecasting', icon: '🧠' },
  { t: 'Evidence check', s: 'Numbers, signals, proof', icon: '🛡️' },
  { t: 'Dashboard', s: '& assistant', icon: '📊' },
]
const TECH = ['react.png', 'vite.jpg', 'tailwind.webp', 'supabase.webp', 'python.webp', 'huggingface.svg', 'prophet.png']
const C08: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame()
  const trust = beat(8, 36)
  const limits = beat(8, 61)
  const pipeAt = (i: number) => beat(8, [0, 4, 12, 18, 36, 50][i])
  return (
    <Stage duration={duration} n={8}>
      <Headline text="How it works, and why you can trust it." accent="trust" />
      <div style={{ position: 'absolute', left: 80, right: 80, top: 230, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 26 }}>
        {PIPE.map((p, i) => {
          const o = ease(f, pipeAt(i))
          const isEv = i === 4
          return (
            <div key={p.t} style={{ position: 'relative', opacity: o, transform: `translateY(${(1 - o) * 30}px)` }}>
              <Card style={{ padding: '26px 18px', textAlign: 'center', minHeight: 250, borderColor: isEv ? 'rgba(251,191,36,0.6)' : 'rgba(34,197,94,0.35)', boxShadow: isEv ? '0 0 40px rgba(251,191,36,0.25)' : undefined }}>
                <div style={{ fontSize: 56 }}>{p.icon}</div>
                <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 30, marginTop: 10 }}>{p.t}</div>
                <div style={{ fontSize: 21, color: theme.textMuted, marginTop: 8, lineHeight: 1.3 }}>{p.s}</div>
              </Card>
              {i < 5 && <div style={{ position: 'absolute', right: -24, top: 105, color: theme.brand, fontSize: 30, textShadow: `0 0 12px ${theme.brand}` }}>➜</div>}
            </div>
          )
        })}
      </div>
      <div style={{ position: 'absolute', left: 80, top: 500, display: 'flex', gap: 16, opacity: ease(f, beat(8, 24)) }}>
        {TECH.map((t) => (
          <Img key={t} src={staticFile('assets/tech/' + t)} style={{ width: 60, height: 60, objectFit: 'contain', background: 'white', borderRadius: 14, padding: 6 }} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: 80, top: 590, width: 1000, opacity: ease(f, trust) }}>
        {['Every figure is calculated by the app, not generated by the AI', 'Every alert shows the signals that triggered it', 'Every recommendation links to its evidence and rule', 'Row-level security: each business sees only its own data'].map((t, i) => (
          <div key={t} style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 14, fontFamily: ui, fontSize: 28, fontWeight: 600, color: theme.text, opacity: ease(f, trust + 14 + i * 16) }}>
            <span style={{ width: 40, height: 40, borderRadius: 20, background: theme.brand, color: '#04210f', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
            {t}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', right: 80, top: 600, width: 680, opacity: ease(f, limits) }}>
        <Card style={{ padding: 28, borderColor: 'rgba(251,191,36,0.55)' }}>
          <div style={{ color: GOLD, fontWeight: 800, fontSize: 26, letterSpacing: '0.06em' }}>LIMITS, STATED PLAINLY</div>
          <ul style={{ margin: '10px 0 0 24px', padding: 0, fontSize: 22, lineHeight: 1.45, color: theme.textMuted }}>
            <li>Live TikTok / Shopee connectors are the next step; the demo uses uploaded data.</li>
            <li>XLM-RoBERTa was evaluated offline (84.12%); the live dashboard uses a rating-based heuristic.</li>
            <li>Forecast models were evaluated with Prophet, ARIMA and XGBoost; the dashboard shows the best-performing simple model.</li>
          </ul>
        </Card>
      </div>
    </Stage>
  )
}

// ------------------------------------------------------------------ C09
const Bars: React.FC<{ rows: { l: string; v: number; c: string }[]; max: number; target: number; tl: string; at: number }> = ({ rows, max, target, tl, at }) => {
  const f = useCurrentFrame()
  const W = 420
  return (
    <div style={{ position: 'relative', marginTop: 14 }}>
      {rows.map((r, i) => {
        const p = ease(f, at + i * 8, 26)
        return (
          <div key={r.l} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <div style={{ width: 150, fontSize: 22, color: theme.textMuted, fontWeight: 700, textAlign: 'right' }}>{r.l}</div>
            <div style={{ width: (r.v / max) * W * p, height: 30, borderRadius: 8, background: r.c }} />
            <div style={{ fontSize: 24, fontWeight: 800, opacity: p }}>{r.v.toFixed(2)}%</div>
          </div>
        )
      })}
      <div style={{ position: 'absolute', left: 162 + (target / max) * W, top: 4, bottom: -10, borderLeft: `3px dashed ${GOLD}` }} />
      <div style={{ marginLeft: 162 + (target / max) * W - 60, marginTop: 14, fontSize: 18, color: GOLD, fontWeight: 700 }}>{tl}</div>
    </div>
  )
}
const C09: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame()
  return (
    <Stage duration={duration} n={9}>
      <Headline text="Where the prototype stands today." accent="today" />
      <div style={{ position: 'absolute', left: 80, right: 80, top: 210, display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr', gap: 28 }}>
        <Card style={{ padding: 30, opacity: ease(f, 20) }}>
          <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 32 }}>Sentiment accuracy</div>
          <div style={{ fontSize: 20, color: theme.textFaint }}>by model · 10,769 held-out comments</div>
          <Bars at={30} max={100} target={80} tl="target ≥ 80%" rows={[{ l: 'TF-IDF + LR', v: 74.34, c: 'rgba(147,163,156,0.55)' }, { l: 'mBERT', v: 82.48, c: theme.emerald }, { l: 'XLM-RoBERTa', v: 84.12, c: theme.brand }]} />
          <div style={{ fontSize: 20, color: theme.textFaint, marginTop: 18 }}>XLM-R by language</div>
          <Bars at={60} max={100} target={75} tl="target ≥ 75%" rows={[{ l: 'English', v: 78.28, c: theme.mint }, { l: 'B. Melayu', v: 86.88, c: theme.brand }, { l: '中文', v: 94.37, c: theme.lime }]} />
        </Card>
        <Card style={{ padding: 30, opacity: ease(f, 40) }}>
          <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 32 }}>Forecast error (MAPE)</div>
          <div style={{ fontSize: 20, color: theme.textFaint }}>best model per protocol · rolling-origin · Olist, 470 days</div>
          <Bars at={50} max={30} target={15} tl="target < 15%" rows={[{ l: 'Daily · 7-day', v: 15.17, c: 'rgba(239,68,68,0.75)' }, { l: 'Daily · 30-day', v: 21.41, c: 'rgba(239,68,68,0.75)' }, { l: 'Weekly · 4-wk', v: 13.28, c: theme.brand }]} />
          <div style={{ marginTop: 24, padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(251,191,36,0.5)', background: 'rgba(251,191,36,0.06)', fontSize: 22, lineHeight: 1.4 }}>
            Target met in <b>1 of 3</b> protocols. Adding sentiment gave <b>no significant improvement</b> (0 of 8 Diebold–Mariano tests).
          </div>
        </Card>
        <Card style={{ padding: 30, opacity: ease(f, 60) }}>
          <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 32 }}>Engineering</div>
          {[
            { b: '565', s: 'automated unit tests passing' },
            { b: '4.07 / 5', s: 'user acceptance mean (target ≥ 4.0)' },
            { b: 'RLS', s: 'row-level security on every table' },
          ].map((k, i) => (
            <div key={k.s} style={{ marginTop: 22, opacity: ease(f, 70 + i * 14) }}>
              <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 56, background: 'linear-gradient(120deg,#0EA5E9,#22C55E 50%,#A3E635)', WebkitBackgroundClip: 'text', color: 'transparent', lineHeight: 1.05 }}>{k.b}</div>
              <div style={{ fontSize: 22, color: theme.textMuted }}>{k.s}</div>
            </div>
          ))}
        </Card>
      </div>
      <div style={{ position: 'absolute', left: 80, top: 870, fontSize: 19, color: theme.textFaint, fontStyle: 'italic', fontFamily: ui }}>
        Sources: ml/sentiment/results/O1_SCORECARD.md · ml/forecasting/results/protocol_summary_a8b3bb637d28.json · FYP II UAT
      </div>
    </Stage>
  )
}

// ------------------------------------------------------------------ C10
const C10: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame()
  const sdg = beat(10, 13)
  const road = beat(10, 25)
  const cards = [
    { b: 'From RM0', s: 'to start', tag: 'planned pricing' },
    { b: '3 languages', s: 'BM · 中文 · EN' },
    { b: 'No data', s: 'needed to begin planning' },
  ]
  return (
    <Stage duration={duration} n={10}>
      <Headline text="Built for every small business." accent="every" />
      <div style={{ position: 'absolute', left: 96, right: 96, top: 200, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
        {cards.map((c, i) => {
          const p = ease(f, 12 + i * 14)
          return (
            <Card key={c.b} style={{ padding: '30px 34px', opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
              <div style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 72, background: 'linear-gradient(120deg,#0EA5E9,#22C55E 50%,#A3E635)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{c.b}</div>
              <div style={{ fontSize: 30, fontWeight: 600, color: theme.textMuted }}>{c.s}</div>
              {c.tag && <Tag text={c.tag} style={{ display: 'inline-block', marginTop: 12 }} />}
            </Card>
          )
        })}
      </div>
      <div style={{ position: 'absolute', left: 96, top: 470, display: 'flex', gap: 24, opacity: ease(f, sdg) }}>
        {[
          { n: 8, c: '#A21942', t: 'Decent Work & Economic Growth' },
          { n: 9, c: '#FD6925', t: 'Industry, Innovation & Infrastructure' },
        ].map((s) => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 96, height: 96, borderRadius: 14, background: s.c, color: 'white', fontFamily: jakarta, fontWeight: 800, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
              <span style={{ fontSize: 14 }}>SDG</span>
              <span style={{ fontSize: 48 }}>{s.n}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, maxWidth: 360, fontFamily: ui, color: theme.text }}>{s.t}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 96, right: 96, top: 620, height: 260, opacity: ease(f, road) }}>
        <svg width="1728" height="260" viewBox="0 0 1728 260" style={{ position: 'absolute', left: 0, top: 0 }}>
          <defs>
            <linearGradient id="rg" x1="0" x2="1">
              <stop offset="0" stopColor="#0EA5E9" />
              <stop offset=".5" stopColor="#22C55E" />
              <stop offset="1" stopColor="#A3E635" />
            </linearGradient>
          </defs>
          <path d="M40 80 C 400 240, 560 240, 860 140 S 1400 30, 1690 160" stroke="url(#rg)" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray="2400" strokeDashoffset={2400 * (1 - ease(f, road, 50))} />
          {[
            [40, 80],
            [860, 140],
            [1690, 160],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="16" fill="#FBBF24" opacity={ease(f, road + 10 + i * 18)} />
          ))}
        </svg>
        {[
          { x: 80, y: -30, y2: '2026', s: 'Working prototype · FYP II · AIMIX: IID 2026', tag: 'done' },
          { x: 600, y: 170, y2: '2027', s: 'Pilot with local SMEs · live connectors · XLM-R live', tag: 'planned' },
          { x: 1180, y: -30, y2: '2028', s: 'Mobile app · more languages · ASEAN SMEs', tag: 'planned' },
        ].map((p, i) => (
          <div key={p.y2} style={{ position: 'absolute', left: p.x, top: p.y, width: 520, opacity: ease(f, road + 14 + i * 18), fontFamily: ui }}>
            <span style={{ fontFamily: jakarta, fontWeight: 800, fontSize: 44, color: GOLD }}>{p.y2}</span> <Tag text={p.tag} />
            <div style={{ fontSize: 26, color: theme.text, marginTop: 4 }}>{p.s}</div>
          </div>
        ))}
      </div>
    </Stage>
  )
}

// ------------------------------------------------------------------ C11
const FAN = [W2 + '03-dashboard.jpg', W2 + '05-crisis.jpg', W1 + '03-overview.jpg', W2 + '06-forecast.jpg', W1 + '07-whatif-b.jpg']
const C11: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const fanOut = interpolate(f, [150, 175], [1, 0], clamp)
  const end = 160
  const lock = spring({ frame: f - end, fps, config: { damping: 13, stiffness: 120 } })
  const out = interpolate(f, [duration - 14, duration], [1, 0], clamp)
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Backdrop glow={1.4}>
        <AbsoluteFill style={{ opacity: fanOut, alignItems: 'center', justifyContent: 'center' }}>
          {FAN.map((src, i) => {
            const p = ease(f, i * 8, 24)
            const rot = (i - 2) * 9 * p
            return (
              <Img key={src} src={staticFile(src)} style={{ position: 'absolute', width: 760, borderRadius: 18, border: '2px solid rgba(34,197,94,0.45)', boxShadow: '0 30px 80px rgba(0,0,0,0.7)', transform: `translateX(${(i - 2) * 230 * p}px) translateY(${Math.abs(i - 2) * 40 * p}px) rotate(${rot}deg)`, opacity: p }} />
            )
          })}
        </AbsoluteFill>
        <Sequence from={end}>
          <Arc at={0} />
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', marginTop: -80, fontFamily: ui }}>
            <Img src={staticFile('assets/logo/insightaid-lockup.png')} style={{ width: 640, transform: `scale(${0.85 + 0.15 * lock})`, opacity: lock, filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.6)) drop-shadow(0 0 36px rgba(34,197,94,0.45))' }} />
            <div style={{ fontSize: 54, fontWeight: 700, color: theme.text, opacity: ease(f - end, 20) }}>
              Decisions, backed by <span style={{ fontFamily: serif, fontStyle: 'italic', color: theme.brand, fontSize: 60 }}>evidence</span>.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 30, opacity: ease(f - end, 40) }}>
              <div style={{ width: 96, height: 96, borderRadius: 48, overflow: 'hidden', border: '3px solid #34D399', boxShadow: '0 0 30px rgba(34,197,94,0.5)', background: '#0F1813' }}>
                <Img src={staticFile(C + 'danish.png')} style={{ width: 96, marginTop: 4 }} />
              </div>
              <div>
                <div style={{ fontSize: 30, fontWeight: 800, color: theme.text }}>
                  Built by <span style={{ color: theme.brand }}>Team Suluh</span> 🔥
                </div>
                <div style={{ fontSize: 22, color: theme.textMuted }}>Danish Alif · Universiti Teknologi PETRONAS · Supervisor: Ts. Ahmad Izuddin Bin Zainal Abidin</div>
              </div>
            </div>
          </AbsoluteFill>
          <div style={{ position: 'absolute', left: 120, right: 120, bottom: 150, textAlign: 'center', fontSize: 19, lineHeight: 1.45, color: theme.textFaint, opacity: ease(f - end, 70), fontFamily: ui }}>
            AI tools used: XLM-RoBERTa (Hugging Face) and Prophet in the system; an LLM for the assistant&apos;s wording; Claude (Anthropic) assisted with planning and motion-graphic code;
            voiceover generated with Kokoro TTS. System design, data pipeline and app logic by the team. Personas and the Segar Drinks scenario are fictional. Statistics: sources on screen.
          </div>
        </Sequence>
      </Backdrop>
    </AbsoluteFill>
  )
}

// ------------------------------------------------------------------ assembly
const CUES: Cue[] = [
  { scene: 1, at: 280, name: 'pop', volume: 0.35 },
  { scene: 1, at: 298, name: 'pop', volume: 0.35 },
  { scene: 1, at: 316, name: 'pop', volume: 0.35 },
  { scene: 1, at: 530, name: 'hit', volume: 0.45 },
  { scene: 2, at: 18, name: 'shimmer', volume: 0.45 },
  { scene: 3, at: 0, name: 'whoosh', volume: 0.3 },
  { scene: 4, at: 0, name: 'whoosh', volume: 0.3 },
  { scene: 5, at: 0, name: 'whoosh', volume: 0.3 },
  { scene: 6, at: 0, name: 'whoosh', volume: 0.3 },
  { scene: 6, at: VO_BEATS[6][2] + LEAD + 6 + 28, name: 'click', volume: 0.5 },
  { scene: 6, at: VO_BEATS[6][5] + LEAD + 32, name: 'click', volume: 0.5 },
  { scene: 6, at: VO_BEATS[6][6] + LEAD + 78, name: 'click', volume: 0.5 },
  { scene: 7, at: 0, name: 'whoosh', volume: 0.3 },
  { scene: 7, at: Math.max(20, VO_BEATS[7][1] + LEAD - 30), name: 'click', volume: 0.5 },
  { scene: 7, at: VO_BEATS[7][3] + LEAD + 70, name: 'alert', volume: 0.45 },
  { scene: 8, at: 0, name: 'whoosh', volume: 0.3 },
  { scene: 9, at: 0, name: 'whoosh', volume: 0.3 },
  { scene: 10, at: 0, name: 'whoosh', volume: 0.3 },
  { scene: 11, at: 160, name: 'shimmer', volume: 0.45 },
]

export const InsightAidCompetition: React.FC = () => (
  <WorkflowVideo
    lines={COMP_LINES}
    scenes={{ 1: C01, 2: C02, 3: C03, 4: C04, 5: C05, 6: C06, 7: C07, 8: C08, 9: C09, 10: C10, 11: C11 }}
    voDir="vo-comp"
    voFrames={COMP_VO_FRAMES}
    cues={CUES}
    total={COMP_TOTAL}
    windowScenes={[]}
    voLead={LEAD}
    musicBase={0.2}
  />
)
