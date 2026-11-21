import { AbsoluteFill, Audio, getStaticFiles, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion'
import { clamp } from '../components/motion'
import { ui } from '../fonts'
import { theme } from '../theme'
import { CAPTION_CENTER_X } from './kit'

/**
 * Shared shell for the two workflow videos: scenes in sequence, a voice clip
 * per scene (if supplied), music ducked under the voice, sound effects, and
 * burned-in captions. Scene boundaries come from one table per video, so
 * picture, captions and voice cannot drift apart.
 */
export type Line = { scene: number; from: number; to: number; text: string }
export type Cue = { scene: number; at: number; name: string; volume?: number }

const PUBLIC = new Set(getStaticFiles().map((f) => f.name))
const VO_LEAD = 8
const MUSIC_BASE = 0.55
const DUCK = Math.pow(10, -8 / 20)
const RAMP = 6

function voFile(dir: string, scene: number): string | null {
  const base = `assets/${dir}/s${String(scene).padStart(2, '0')}`
  for (const ext of ['wav', 'mp3']) if (PUBLIC.has(`${base}.${ext}`)) return `${base}.${ext}`
  return null
}

export const WorkflowVideo: React.FC<{
  lines: Line[]
  scenes: Record<number, React.FC<{ duration: number }>>
  voDir: string
  voFrames: Record<number, number>
  cues: Cue[]
  total: number
  overlay?: React.ReactNode
  /** Scenes whose captions sit under the app window rather than centred. */
  windowScenes: number[]
}> = ({ lines, scenes, voDir, voFrames, cues, total, overlay, windowScenes }) => {
  const windows = lines
    .filter((l) => voFile(voDir, l.scene) && voFrames[l.scene])
    .map((l) => [l.from + VO_LEAD, l.from + VO_LEAD + voFrames[l.scene]] as const)

  const musicVolume = (f: number) => {
    let duck = 1
    for (const [a, b] of windows) {
      duck = Math.min(duck, interpolate(f, [a - RAMP, a, b, b + RAMP], [1, DUCK, DUCK, 1], clamp))
    }
    const fadeIn = interpolate(f, [0, 15], [0, 1], clamp)
    const fadeOut = interpolate(f, [total - 45, total], [1, 0], clamp)
    return MUSIC_BASE * duck * fadeIn * fadeOut
  }

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {lines.map((line) => {
        const Scene = scenes[line.scene]
        const duration = line.to - line.from
        const clip = voFile(voDir, line.scene)
        return (
          <Sequence key={line.scene} from={line.from} durationInFrames={duration} name={`S${line.scene}`}>
            <Scene duration={duration} />
            {clip && (
              <Sequence from={VO_LEAD} name={`VO s${line.scene}`}>
                <Audio src={staticFile(clip)} />
              </Sequence>
            )}
            {cues
              .filter((c) => c.scene === line.scene && PUBLIC.has(`assets/audio/sfx/${c.name}.mp3`))
              .map((c, i) => (
                <Sequence key={`${c.name}-${i}`} from={c.at} name={`sfx ${c.name}`}>
                  <Audio src={staticFile(`assets/audio/sfx/${c.name}.mp3`)} volume={c.volume ?? 0.45} />
                </Sequence>
              ))}
          </Sequence>
        )
      })}
      {overlay}
      {PUBLIC.has('assets/audio/music.mp3') && <Audio src={staticFile('assets/audio/music.mp3')} volume={musicVolume} />}
      <WorkflowCaptions lines={lines} voFrames={voFrames} voDir={voDir} windowScenes={windowScenes} />
    </AbsoluteFill>
  )
}

const MAX_WORDS = 9

function phrases(text: string): string[] {
  return text
    .split(/(?<=[.,—?!])\s+/)
    .flatMap((c) => {
      const words = c.split(/\s+/)
      if (words.length <= MAX_WORDS) return [c]
      const out: string[] = []
      for (let i = 0; i < words.length; i += MAX_WORDS) out.push(words.slice(i, i + MAX_WORDS).join(' '))
      return out
    })
    .filter(Boolean)
}

/** Captions paced across the real clip length when one exists, else across the scene. */
const WorkflowCaptions: React.FC<{ lines: Line[]; voFrames: Record<number, number>; voDir: string; windowScenes: number[] }> = ({
  lines,
  voFrames,
  voDir,
  windowScenes,
}) => {
  const frame = useCurrentFrame()
  const schedule = lines.flatMap((line) => {
    const ps = phrases(line.text)
    const words = ps.map((p) => p.split(/\s+/).length)
    const totalWords = words.reduce((a, b) => a + b, 0)
    const start = line.from + VO_LEAD
    const span = voFile(voDir, line.scene) && voFrames[line.scene] ? voFrames[line.scene] : line.to - start - 10
    let cursor = start
    return ps.map((p, i) => {
      const len = Math.max(14, Math.round((words[i] / totalWords) * span))
      const item = { text: p, from: cursor, to: cursor + len, scene: line.scene }
      cursor += len
      return item
    })
  })
  const current = schedule.find((c) => frame >= c.from && frame < c.to)
  if (!current) return null
  const o = interpolate(frame, [current.from, current.from + 5, current.to - 5, current.to], [0, 1, 1, 0], clamp)
  const centreX = windowScenes.includes(current.scene) ? CAPTION_CENTER_X : 960
  return (
    <div
      style={{
        position: 'absolute',
        left: centreX,
        bottom: 58,
        transform: 'translateX(-50%)',
        opacity: o,
        maxWidth: 1360,
        width: 'max-content',
        padding: '12px 28px',
        borderRadius: 18,
        background: 'rgba(0,0,0,0.62)',
        color: 'white',
        fontFamily: ui,
        fontWeight: 600,
        fontSize: 38,
        lineHeight: 1.25,
        textAlign: 'center',
        zIndex: 80,
      }}
    >
      {current.text}
    </div>
  )
}
