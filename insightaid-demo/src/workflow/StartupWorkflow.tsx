import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion'
import { Backdrop } from '../components/Backdrop'
import { clamp, expoOut } from '../components/motion'
import { EndCard, Hook, Mark, Rail, Screen, ScreenTag, sceneIn, ShotCursor, type Cam, type Step } from './kit'
import { WorkflowVideo, type Cue, type Line } from './WorkflowVideo'

/**
 * Video 2 - Business Startup, the with-data path, ~49 s.
 * Screens: usertest1 (Embun Botanica) in Business Startup mode, captured from
 * the production build. Every number visible is what the app computed from
 * that account's data on the day of capture.
 */
const A = 'assets/wf2/'
const FULL = { cx: 720, cy: 405, w: 1440 }

export const BS_LINES: Line[] = [
  { scene: 1, from: 0, to: 120, text: 'Already have sales and social data?' },
  { scene: 2, from: 120, to: 270, text: 'Choose Business Startup, and tell it you have data.' },
  { scene: 3, from: 270, to: 450, text: 'Upload your sales and reviews, or connect your channels. Every comment is analysed.' },
  { scene: 4, from: 450, to: 690, text: 'One dashboard sums it up: how customers feel, your crisis risk, and where revenue is heading.' },
  { scene: 5, from: 690, to: 990, text: 'When negative comments spike or ratings slip, InsightAid raises an early warning, and shows the exact signals behind it.' },
  { scene: 6, from: 990, to: 1140, text: 'See where your revenue is heading next.' },
  { scene: 7, from: 1140, to: 1350, text: 'Then act on clear recommendations, each one backed by the evidence that triggered it.' },
  { scene: 8, from: 1350, to: 1485, text: 'InsightAid AI. Decisions, backed by evidence.' },
]
export const BS_TOTAL = 1485

const STEPS: Step[] = [
  { title: 'Choose your path', detail: 'Business Startup, then “I have data”.', from: 120 },
  { title: 'Bring your data', detail: 'Upload files or connect sources. Comments are analysed automatically.', from: 270 },
  { title: 'Read the dashboard', detail: 'Sentiment, crisis risk and revenue in one view.', from: 450 },
  { title: 'Catch problems early', detail: 'Signals computed from your own history, each with evidence.', from: 690 },
  { title: "See what's next", detail: 'A revenue forecast with its uncertainty band.', from: 990 },
  { title: 'Act on evidence', detail: 'Rule-based recommendations that show why.', from: 1140 },
]

const LOGOS = ['logo/tiktok.jpg', 'logo/shopee.webp', 'logo/x.jpg', 'logo/threads.jpg']

const Logos: React.FC = () => {
  const frame = useCurrentFrame()
  return (
    <div style={{ display: 'flex', gap: 22, marginTop: 40 }}>
      {LOGOS.map((l, i) => {
        const p = interpolate(frame, [60 + i * 6, 76 + i * 6], [0, 1], { ...clamp, easing: expoOut })
        return (
          <Img
            key={l}
            src={staticFile('assets/' + l)}
            style={{ width: 72, height: 72, borderRadius: 18, objectFit: 'cover', opacity: p, transform: `translateY(${(1 - p) * 20}px)`, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
          />
        )
      })}
    </div>
  )
}

const S1: React.FC<{ duration: number }> = ({ duration }) => (
  <Hook duration={duration} kicker="Business Startup" line="Already have the data?" accent="data?" sub="Turn it into decisions." extra={<Logos />} />
)

const Stage: React.FC<{ duration: number; children: React.ReactNode }> = ({ duration, children }) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Backdrop glow={0.9}>
        <AbsoluteFill style={sceneIn(frame, duration)}>{children}</AbsoluteFill>
      </Backdrop>
    </AbsoluteFill>
  )
}

/** A sub-shot inside a scene: its own fade, screen and optional tag. */
const Shot: React.FC<{ len: number; src: string; w: number; h: number; cams: Cam[]; tag?: string; children?: React.ReactNode }> = ({
  len,
  src,
  w,
  h,
  cams,
  tag,
  children,
}) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={sceneIn(frame, len)}>
      <Screen src={src} w={w} h={h} cams={cams}>
        {children}
      </Screen>
      {tag && <ScreenTag text={tag} />}
    </AbsoluteFill>
  )
}

/** Onboarding screens are the owner's own screenshots (user-*.png), used as supplied. */
const KIND = { src: A + 'user-01-kind.png', w: 1865, h: 886 }
const HASDATA = { src: A + 'user-02-hasdata.png', w: 1864, h: 901 }

const Sub: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const frame = useCurrentFrame()
  return <AbsoluteFill style={sceneIn(frame, len)}>{children}</AbsoluteFill>
}

const S2: React.FC<{ duration: number }> = () => (
  <AbsoluteFill>
    <Backdrop glow={0.9}>
      <Sequence durationInFrames={72}>
        <Sub len={72}>
          <Screen {...KIND} cams={[{ f: 0, cx: 935, cy: 400, w: 1300 }, { f: 24, cx: 935, cy: 362, w: 1050 }]}>
            <Mark x={943} y={221} w={376} h={189} at={40} label="Business Startup" />
            <ShotCursor path={[{ f: 10, x: 620, y: 560 }, { f: 32, x: 1130, y: 300 }]} clicks={[40]} hideAt={66} />
          </Screen>
        </Sub>
      </Sequence>
      <Sequence from={72} durationInFrames={78}>
        <Sub len={78}>
          <Screen {...HASDATA} cams={[{ f: 0, cx: 930, cy: 400, w: 1300 }, { f: 22, cx: 930, cy: 362, w: 1050 }]}>
            <Mark x={545} y={243} w={376} h={149} at={42} label="Sales, reviews, social data" />
            <ShotCursor path={[{ f: 10, x: 1150, y: 520 }, { f: 34, x: 735, y: 318 }]} clicks={[42]} hideAt={72} />
          </Screen>
        </Sub>
      </Sequence>
    </Backdrop>
  </AbsoluteFill>
)

const S3: React.FC<{ duration: number }> = () => (
  <AbsoluteFill>
    <Backdrop glow={0.9}>
      <Sequence durationInFrames={100}>
        <Shot len={100} src={A + '02-datasets.jpg'} w={1440} h={810} cams={[{ f: 0, ...FULL }, { f: 20, cx: 720, cy: 470, w: 1420 }]}>
          <Mark x={32} y={309} w={1376} h={336} at={26} label="Upload CSV, JSON or Excel" />
        </Shot>
      </Sequence>
      <Sequence from={100} durationInFrames={80}>
        <Shot len={80} src={A + '02b-sources.jpg'} w={1376} h={246} cams={[{ f: 0, cx: 688, cy: 123, w: 1376 }, { f: 80, cx: 560, cy: 140, w: 1150 }]} tag="Sources connected">
          <Mark x={25} y={80} w={880} h={140} at={14} label="Connected, with record counts" />
        </Shot>
      </Sequence>
    </Backdrop>
  </AbsoluteFill>
)

const S4: React.FC<{ duration: number }> = ({ duration }) => (
  <Stage duration={duration}>
    <Screen src={A + '03-dashboard.jpg'} w={1440} h={810} cams={[{ f: 0, ...FULL }, { f: 20, cx: 720, cy: 470, w: 1420 }]}>
      <Mark x={32} y={309} w={1376} h={124} at={26} until={78} label="Plain-language summary" />
      <Mark x={32} y={457} w={448} h={132} at={80} until={124} label="How customers feel" labelSide="bottom" />
      <Mark x={496} y={457} w={448} h={132} at={126} until={170} label="Crisis risk" labelSide="bottom" />
      <Mark x={960} y={457} w={448} h={132} at={172} label="Revenue outlook" labelSide="bottom" />
    </Screen>
  </Stage>
)

const S5: React.FC<{ duration: number }> = () => (
  <AbsoluteFill>
    <Backdrop glow={0.9} tint="critical">
      <Sequence durationInFrames={120}>
        <Shot len={120} src={A + '05-crisis.jpg'} w={1440} h={810} cams={[{ f: 0, ...FULL }, { f: 20, cx: 720, cy: 420, w: 1420 }]}>
          <Mark x={32} y={308} w={1376} h={227} at={28} label="Risk score from your own history" />
        </Shot>
      </Sequence>
      <Sequence from={120} durationInFrames={180}>
        <Shot
          len={180}
          src={A + '05b-signals.jpg'}
          w={1376}
          h={654}
          cams={[{ f: 0, cx: 688, cy: 300, w: 1376 }, { f: 30, cx: 500, cy: 280, w: 1000 }]}
          tag="Detected signals"
        >
          <Mark x={25} y={80} w={1326} h={69} at={28} until={92} label="Negative share: critical" />
          <Mark x={25} y={400} w={1326} h={69} at={96} label="Ratings slipping: warning" />
        </Shot>
      </Sequence>
    </Backdrop>
  </AbsoluteFill>
)

const S6: React.FC<{ duration: number }> = ({ duration }) => (
  <Stage duration={duration}>
    <Screen src={A + '06-forecast.jpg'} w={1440} h={810} cams={[{ f: 0, ...FULL }, { f: 22, cx: 760, cy: 525, w: 1300 }]}>
      <Mark x={1165} y={470} w={230} h={200} at={34} label="Where revenue is heading" labelAlign="right" />
    </Screen>
  </Stage>
)

const S7: React.FC<{ duration: number }> = ({ duration }) => (
  <Stage duration={duration}>
    <Screen src={A + '07c-rec-open.jpg'} w={680} h={390} cams={[{ f: 0, cx: 340, cy: 195, w: 860 }, { f: 200, cx: 340, cy: 195, w: 760 }]}>
      <Mark x={36} y={90} w={470} h={50} at={26} until={96} label="The evidence that triggered it" labelSide="bottom" />
      <Mark x={21} y={232} w={638} h={138} at={100} until={160} label="The reason, in plain language" />
      <Mark x={548} y={22} w={115} h={24} at={164} label="The exact rule" labelSide="bottom" />
    </Screen>
  </Stage>
)

const S8: React.FC<{ duration: number }> = ({ duration }) => <EndCard duration={duration} line="Business Startup: from your data to your next decision." />

const CUES: Cue[] = [
  { scene: 1, at: 10, name: 'hit', volume: 0.3 },
  ...[60, 66, 72, 78].map((at) => ({ scene: 1, at, name: 'pop', volume: 0.35 })),
  { scene: 2, at: 0, name: 'whoosh', volume: 0.3 },
  { scene: 2, at: 40, name: 'click', volume: 0.55 },
  { scene: 2, at: 114, name: 'click', volume: 0.55 },
  { scene: 3, at: 26, name: 'tick', volume: 0.4 },
  { scene: 3, at: 100, name: 'whoosh', volume: 0.28 },
  { scene: 3, at: 114, name: 'tick', volume: 0.4 },
  ...[26, 80, 126, 172].map((at) => ({ scene: 4, at, name: 'tick', volume: 0.4 })),
  { scene: 5, at: 28, name: 'alert', volume: 0.45 },
  { scene: 5, at: 120, name: 'whoosh', volume: 0.28 },
  ...[148, 216].map((at) => ({ scene: 5, at, name: 'tick', volume: 0.4 })),
  { scene: 6, at: 0, name: 'whoosh', volume: 0.3 },
  { scene: 6, at: 34, name: 'tick', volume: 0.4 },
  ...[26, 100, 164].map((at) => ({ scene: 7, at, name: 'tick', volume: 0.4 })),
  { scene: 8, at: 6, name: 'shimmer', volume: 0.45 },
]

export const BS_VO_FRAMES: Record<number, number> = { 1: 67, 2: 70, 3: 158, 4: 174, 5: 235, 6: 65, 7: 147, 8: 107 }

export const StartupWorkflow: React.FC = () => (
  <WorkflowVideo
    lines={BS_LINES}
    scenes={{ 1: S1, 2: S2, 3: S3, 4: S4, 5: S5, 6: S6, 7: S7, 8: S8 }}
    voDir="vo-startup"
    voFrames={BS_VO_FRAMES}
    cues={CUES}
    total={BS_TOTAL}
    windowScenes={[2, 3, 4, 5, 6, 7]}
    overlay={<Rail kicker="Workflow" path="Business Startup" steps={STEPS} footnote="Demo account: Embun Botanica" start={120} end={1350} />}
  />
)
