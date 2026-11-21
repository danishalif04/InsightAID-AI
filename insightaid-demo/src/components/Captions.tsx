import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { vo } from '../data/content'
import { VO_FRAMES } from '../data/voTiming'
import { ui } from '../fonts'
import { clamp } from './motion'

/**
 * Burned-in VO captions, bottom centre, white on a 60% black pill, max two
 * lines. With no audio yet, each line is split into short phrases and the
 * phrases are spread across the scene in proportion to their word count -
 * the same pacing a ~140 wpm read would give. When real VO files arrive, only
 * the per-scene start/end in content.ts needs to change.
 */
const VO_LEAD = 8 // the plan: VO starts 6-10 frames after its scene starts
const MAX_WORDS = 8

function phrases(text: string): string[] {
  // Split on punctuation first, then cap phrase length.
  const chunks = text.split(/(?<=[.,—?!])\s+/).flatMap((c) => {
    const words = c.split(/\s+/)
    if (words.length <= MAX_WORDS) return [c]
    const out: string[] = []
    for (let i = 0; i < words.length; i += MAX_WORDS) out.push(words.slice(i, i + MAX_WORDS).join(' '))
    return out
  })
  return chunks.filter(Boolean)
}

const SCHEDULE = vo.filter((line) => line.scene !== 13).flatMap((line) => {
  const ps = phrases(line.text)
  const words = ps.map((p) => p.split(/\s+/).length)
  const total = words.reduce((a, b) => a + b, 0)
  const start = line.from + VO_LEAD
  // Spread across the REAL clip length when one exists, so each phrase is on
  // screen while it is actually being spoken.
  const span = VO_FRAMES[line.scene] ?? line.to - start - 10
  let cursor = start
  return ps.map((p, i) => {
    const len = Math.max(14, Math.round((words[i] / total) * span))
    const item = { text: p, from: cursor, to: cursor + len }
    cursor += len
    return item
  })
})

export const Captions: React.FC = () => {
  const frame = useCurrentFrame()
  const current = SCHEDULE.find((c) => frame >= c.from && frame < c.to)
  if (!current) return null
  const o = interpolate(frame, [current.from, current.from + 5, current.to - 5, current.to], [0, 1, 1, 0], clamp)
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 64, pointerEvents: 'none', zIndex: 80 }}>
      <div
        style={{
          opacity: o,
          maxWidth: 1400,
          padding: '12px 28px',
          borderRadius: 18,
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
          fontFamily: ui,
          fontWeight: 600,
          fontSize: 40,
          lineHeight: 1.25,
          textAlign: 'center',
        }}
      >
        {current.text}
      </div>
    </AbsoluteFill>
  )
}
