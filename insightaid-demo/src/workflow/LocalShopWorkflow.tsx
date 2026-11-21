import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion'
import { Backdrop } from '../components/Backdrop'
import { EndCard, Hook, Mark, Rail, Screen, ScreenTag, sceneIn, ShotCursor, type Step } from './kit'
import { WorkflowVideo, type Cue, type Line } from './WorkflowVideo'

/**
 * Video 1 - Malaysian Local Shop, the no-data path, ~49 s.
 * Screens: usertest2 with the Kedai Makmur example shop loaded, captured from
 * the production build. The assistant answer is a real live-AI reply to the
 * Malay question typed on screen; every figure in it came from the app.
 */
const A = 'assets/wf1/'
const FULL = { cx: 720, cy: 405, w: 1440 }

export const LS_LINES: Line[] = [
  { scene: 1, from: 0, to: 120, text: 'Opening a kedai, but no sales records yet?' },
  { scene: 2, from: 120, to: 270, text: 'Choose Malaysian Local Shop, then start without data.' },
  { scene: 3, from: 270, to: 480, text: 'Describe your business and AI drafts a plan, or open our example shop, Kedai Makmur.' },
  { scene: 4, from: 480, to: 690, text: 'Your break-even sales, costs and margins appear instantly, every figure calculated by the app.' },
  { scene: 5, from: 690, to: 870, text: 'See your best-margin products, monthly costs, and the capital you still need.' },
  { scene: 6, from: 870, to: 1080, text: 'Test a price change before you make it, and watch the results update.' },
  { scene: 7, from: 1080, to: 1350, text: 'Ask in Malay or English. The assistant checks your own numbers, explains the answer, and you decide.' },
  { scene: 8, from: 1350, to: 1485, text: 'InsightAid AI. Decisions, backed by evidence.' },
]
export const LS_TOTAL = 1485

const STEPS: Step[] = [
  { title: 'Choose your path', detail: "Malaysian Local Shop, then “I don't have data yet”.", from: 120 },
  { title: 'Describe your business', detail: 'Sector, revenue target and a few sentences. AI drafts the inputs.', from: 270 },
  { title: 'See your numbers', detail: 'Break-even, costs and margins, calculated by the app.', from: 480 },
  { title: 'Plan costs & capital', detail: 'Margin per product, monthly costs, capital still missing.', from: 690 },
  { title: 'Test what-ifs', detail: 'Move a price or a cost and see the effect at once.', from: 870 },
  { title: 'Ask the assistant', detail: 'Malay or English, answered from your own figures.', from: 1080 },
]

const S1: React.FC<{ duration: number }> = ({ duration }) => (
  <Hook duration={duration} kicker="Malaysian Local Shop" line="No sales records yet?" accent="yet?" sub="Start planning anyway." />
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

/** Onboarding screens are the owner's own screenshots (user-*.png), used as supplied. */
const KIND = { src: A + 'user-01-kind.png', w: 1865, h: 886 }
const HASDATA = { src: A + 'user-02-hasdata.png', w: 1864, h: 901 }
const DESCRIBE = { src: A + 'user-03-describe.png', w: 1859, h: 842 }

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
            <Mark x={551} y={221} w={376} h={189} at={40} label="Malaysian Local Shop" />
            <ShotCursor path={[{ f: 10, x: 1250, y: 560 }, { f: 32, x: 740, y: 300 }]} clicks={[40]} hideAt={66} />
          </Screen>
        </Sub>
      </Sequence>
      <Sequence from={72} durationInFrames={78}>
        <Sub len={78}>
          <Screen {...HASDATA} cams={[{ f: 0, cx: 930, cy: 400, w: 1300 }, { f: 22, cx: 930, cy: 362, w: 1050 }]}>
            <Mark x={937} y={243} w={376} h={149} at={42} label="No data needed" />
            <ShotCursor path={[{ f: 10, x: 700, y: 520 }, { f: 34, x: 1125, y: 318 }]} clicks={[42]} hideAt={72} />
          </Screen>
        </Sub>
      </Sequence>
    </Backdrop>
  </AbsoluteFill>
)

const S3: React.FC<{ duration: number }> = () => (
  <AbsoluteFill>
    <Backdrop glow={0.9}>
      <Sequence durationInFrames={140}>
        <Sub len={140}>
          <Screen {...DESCRIBE} cams={[{ f: 0, cx: 921, cy: 313, w: 1250 }, { f: 22, cx: 921, cy: 320, w: 980 }]}>
            <Mark x={606} y={208} w={306} h={60} at={22} until={58} label="Business sector" />
            <Mark x={929} y={208} w={307} h={60} at={60} until={96} label="Revenue target" />
            <Mark x={606} y={288} w={630} h={160} at={98} until={132} label="What you sell, and to whom" />
          </Screen>
        </Sub>
      </Sequence>
      <Sequence from={140} durationInFrames={70}>
        <Sub len={70}>
          <Screen
            src={A + '02-generate-empty.jpg'}
            w={1440}
            h={810}
            swap={{ src: A + '03-overview.jpg', at: 44 }}
            cams={[{ f: 0, cx: 520, cy: 520, w: 1000 }, { f: 42, cx: 520, cy: 520, w: 1000 }, { f: 62, cx: 720, cy: 405, w: 1440 }]}
          >
            <Mark x={247} y={553} w={172} h={18} at={20} until={40} label="Or open the example shop" labelSide="bottom" />
            <ShotCursor path={[{ f: 2, x: 640, y: 660 }, { f: 18, x: 333, y: 562 }]} clicks={[24]} hideAt={42} />
          </Screen>
        </Sub>
      </Sequence>
    </Backdrop>
  </AbsoluteFill>
)

const S4: React.FC<{ duration: number }> = ({ duration }) => (
  <Stage duration={duration}>
    <Screen
      src={A + '03-overview.jpg'}
      w={1440}
      h={810}
      cams={[{ f: 0, ...FULL }, { f: 24, cx: 965, cy: 440, w: 950 }, { f: 142, cx: 965, cy: 440, w: 950 }, { f: 162, cx: 720, cy: 560, w: 1400 }]}
    >
      <Mark x={1073} y={379} w={335} h={116} at={28} until={88} label="Break-even sales per month" />
      <Mark x={726} y={379} w={335} h={116} at={90} until={140} label="Average margin" />
      <Mark x={32} y={515} w={1376} h={176} at={162} label="What's ready, and what's next" />
    </Screen>
  </Stage>
)

const Montage: React.FC<{ src: string; cams: { f: number; cx: number; cy: number; w: number }[]; tag: string; children?: React.ReactNode }> = ({
  src,
  cams,
  tag,
  children,
}) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={sceneIn(frame, 60)}>
      <Screen src={src} w={1440} h={810} cams={cams}>
        {children}
      </Screen>
      <ScreenTag text={tag} />
    </AbsoluteFill>
  )
}

const S5: React.FC<{ duration: number }> = () => (
  <AbsoluteFill>
    <Backdrop glow={0.9}>
      <Sequence durationInFrames={60}>
        <Montage src={A + '04-products.jpg'} tag="Margin by product" cams={[{ f: 0, cx: 720, cy: 450, w: 1440 }, { f: 60, cx: 720, cy: 450, w: 1320 }]} />
      </Sequence>
      <Sequence from={60} durationInFrames={60}>
        <Montage src={A + '05-financial.jpg'} tag="Where the money goes" cams={[{ f: 0, cx: 720, cy: 530, w: 1440 }, { f: 60, cx: 720, cy: 530, w: 1320 }]} />
      </Sequence>
      <Sequence from={120} durationInFrames={60}>
        <Montage src={A + '06-capital.jpg'} tag="Startup capital" cams={[{ f: 0, cx: 720, cy: 560, w: 1440 }, { f: 22, cx: 860, cy: 590, w: 1100 }]}>
          <Mark x={1073} y={539} w={335} h={95} at={22} label="Capital still missing" labelSide="top" />
        </Montage>
      </Sequence>
    </Backdrop>
  </AbsoluteFill>
)

const S6: React.FC<{ duration: number }> = ({ duration }) => (
  <Stage duration={duration}>
    <Screen
      src={A + '07-whatif-a.jpg'}
      w={1440}
      h={810}
      swap={{ src: A + '07-whatif-b.jpg', at: 92 }}
      cams={[{ f: 0, ...FULL }, { f: 22, cx: 720, cy: 420, w: 1300 }]}
    >
      <Mark x={50} y={356} w={665} h={48} at={36} until={88} label="Change the selling price" />
      <ShotCursor path={[{ f: 40, x: 420, y: 470 }, { f: 60, x: 167, y: 392 }, { f: 92, x: 215, y: 392 }]} clicks={[62]} hideAt={104} />
      <Mark x={730} y={389} w={654} h={95} at={108} label="Results recalculate instantly" labelSide="bottom" />
    </Screen>
  </Stage>
)

const S7: React.FC<{ duration: number }> = ({ duration }) => (
  <Stage duration={duration}>
    <Screen
      src={A + '08b-assistant-typed.jpg'}
      w={1440}
      h={810}
      swap={{ src: A + '08c-assistant-answer.jpg', at: 76 }}
      cams={[
        { f: 0, ...FULL },
        { f: 20, cx: 560, cy: 400, w: 1150 },
        { f: 76, cx: 560, cy: 400, w: 1150 },
        { f: 96, cx: 560, cy: 640, w: 1100 },
        { f: 172, cx: 560, cy: 640, w: 1100 },
        { f: 192, cx: 1150, cy: 410, w: 960 },
      ]}
    >
      <Mark x={52} y={360} w={995} h={82} at={22} until={58} label="Asked in Malay" />
      <ShotCursor path={[{ f: 44, x: 800, y: 560 }, { f: 62, x: 1002, y: 476 }]} clicks={[66]} hideAt={80} />
      <Mark x={32} y={540} w={1036} h={244} at={100} until={170} label="Answer, from the app's own figures" />
      <Mark x={1088} y={202} w={320} h={443} at={194} label="Every step shown" />
    </Screen>
  </Stage>
)

const S8: React.FC<{ duration: number }> = ({ duration }) => <EndCard duration={duration} line="Malaysian Local Shop: plan before you have data." />

const CUES: Cue[] = [
  { scene: 1, at: 10, name: 'hit', volume: 0.3 },
  { scene: 1, at: 44, name: 'shimmer', volume: 0.3 },
  { scene: 2, at: 0, name: 'whoosh', volume: 0.3 },
  { scene: 2, at: 40, name: 'click', volume: 0.55 },
  { scene: 2, at: 114, name: 'click', volume: 0.55 },
  ...[22, 60, 98].map((at) => ({ scene: 3, at, name: 'tick', volume: 0.4 })),
  { scene: 3, at: 164, name: 'click', volume: 0.55 },
  { scene: 3, at: 184, name: 'whoosh', volume: 0.3 },
  ...[28, 90, 162].map((at) => ({ scene: 4, at, name: 'tick', volume: 0.4 })),
  ...[0, 60, 120].map((at) => ({ scene: 5, at, name: 'whoosh', volume: 0.28 })),
  { scene: 6, at: 62, name: 'click', volume: 0.55 },
  { scene: 6, at: 108, name: 'pop', volume: 0.4 },
  { scene: 7, at: 66, name: 'click', volume: 0.55 },
  ...[100, 194].map((at) => ({ scene: 7, at, name: 'tick', volume: 0.4 })),
  { scene: 8, at: 6, name: 'shimmer', volume: 0.45 },
]

// Filled in once the voice clips exist (frames per clip, measured).
export const LS_VO_FRAMES: Record<number, number> = { 1: 87, 2: 96, 3: 183, 4: 188, 5: 140, 6: 122, 7: 189, 8: 107 }

export const LocalShopWorkflow: React.FC = () => (
  <WorkflowVideo
    lines={LS_LINES}
    scenes={{ 1: S1, 2: S2, 3: S3, 4: S4, 5: S5, 6: S6, 7: S7, 8: S8 }}
    voDir="vo-localshop"
    voFrames={LS_VO_FRAMES}
    cues={CUES}
    total={LS_TOTAL}
    windowScenes={[2, 3, 4, 5, 6, 7]}
    overlay={<Rail kicker="Workflow" path="Malaysian Local Shop" steps={STEPS} footnote="Example shop: Kedai Makmur" start={120} end={1350} />}
  />
)
