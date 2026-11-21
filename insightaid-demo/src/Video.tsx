import { AbsoluteFill, Audio, getStaticFiles, interpolate, Sequence, staticFile } from 'remotion'
import { Captions } from './components/Captions'
import { vo } from './data/content'
import { sfxCues } from './data/sfx'
import { VO_FRAMES } from './data/voTiming'
import { S06Sentiment, S07Crisis, S08Forecast, S09Ask } from './scenes/Demo'
import { S01ColdOpen, S02Problem, S03Brand } from './scenes/Intro'
import { S10AllInOne, S11Pricing, S12Impact, S13End } from './scenes/Outro'
import { S04Pipeline, S05Connect } from './scenes/Pipeline'
import { theme } from './theme'

const SCENES: Record<number, React.FC<{ duration: number }>> = {
  1: S01ColdOpen,
  2: S02Problem,
  3: S03Brand,
  4: S04Pipeline,
  5: S05Connect,
  6: S06Sentiment,
  7: S07Crisis,
  8: S08Forecast,
  9: S09Ask,
  10: S10AllInOne,
  11: S11Pricing,
  12: S12Impact,
  13: S13End,
}

/** The plan: each VO clip starts 6-10 frames after its scene starts. */
const VO_LEAD = 8

/**
 * Finds a scene's voiceover clip in public/assets/vo/ if one has been
 * supplied - WAV preferred, MP3 accepted, per VO_SCRIPT.md. Missing clips are
 * simply skipped, so the video renders silent with captions until they exist.
 */
const PUBLIC = new Set(getStaticFiles().map((f) => f.name))
function voFile(scene: number): string | null {
  const base = `assets/vo/s${String(scene).padStart(2, '0')}`
  for (const ext of ['wav', 'mp3']) {
    if (PUBLIC.has(`${base}.${ext}`)) return `${base}.${ext}`
  }
  return null
}

// ---------------------------------------------------------------------------
// Music, ducked under the voice
// ---------------------------------------------------------------------------
const MUSIC_BASE = 0.6
const DUCK = Math.pow(10, -8 / 20) // the plan: -8 dB while VO plays
const RAMP = 6 // the plan: 6-frame ramps

/** Absolute [start, end] frames of every voice clip that actually exists. */
const VO_WINDOWS = vo
  .filter((l) => voFile(l.scene) && VO_FRAMES[l.scene])
  .map((l) => [l.from + VO_LEAD, l.from + VO_LEAD + VO_FRAMES[l.scene]] as const)

function musicVolume(f: number): number {
  // 1 outside any VO, DUCK inside, with 6-frame ramps either side.
  let duck = 1
  for (const [a, b] of VO_WINDOWS) {
    const d = interpolate(f, [a - RAMP, a, b, b + RAMP], [1, DUCK, DUCK, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
    duck = Math.min(duck, d)
  }
  const fadeIn = interpolate(f, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const fadeOut = interpolate(f, [3555, 3600], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return MUSIC_BASE * duck * fadeIn * fadeOut
}

const SCENE_LENGTH = Object.fromEntries(vo.map((l) => [l.scene, l.to - l.from])) as Record<number, number>
const CUES = sfxCues(SCENE_LENGTH)
const HAS_MUSIC = PUBLIC.has('assets/audio/music.mp3')
const hasSfx = (name: string) => PUBLIC.has(`assets/audio/sfx/${name}.mp3`)

/**
 * Scene boundaries come from the VO table in content.ts, so picture, captions,
 * voice and effects can never drift apart.
 */
export const InsightAidDemo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: theme.bg }}>
    {vo.map((line) => {
      const Scene = SCENES[line.scene]
      const duration = line.to - line.from
      const clip = voFile(line.scene)
      return (
        <Sequence key={line.scene} from={line.from} durationInFrames={duration} name={`S${String(line.scene).padStart(2, '0')}`}>
          <Scene duration={duration} />
          {clip && (
            <Sequence from={VO_LEAD} name={`VO s${line.scene}`}>
              <Audio src={staticFile(clip)} />
            </Sequence>
          )}
          {CUES.filter((c) => c.scene === line.scene && c.at >= 0 && hasSfx(c.name)).map((c, i) => (
            <Sequence key={`${c.name}-${i}`} from={c.at} name={`sfx ${c.name}`}>
              <Audio src={staticFile(`assets/audio/sfx/${c.name}.mp3`)} volume={c.volume ?? 0.5} />
            </Sequence>
          ))}
        </Sequence>
      )
    })}
    {HAS_MUSIC && <Audio src={staticFile('assets/audio/music.mp3')} volume={musicVolume} />}
    <Captions />
  </AbsoluteFill>
)
