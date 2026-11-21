/**
 * Sound-effect cues, in frames RELATIVE TO THEIR SCENE's start, so a cue stays
 * on its animation when scene boundaries move. Each `at` matches the frame the
 * scene's own animation uses for that moment (see the scene files).
 */
export type SfxName = 'whoosh' | 'click' | 'tick' | 'pop' | 'riser' | 'hit' | 'alert' | 'flip' | 'shimmer'

export interface SfxCue {
  scene: number
  at: number
  name: SfxName
  volume?: number
}

// riser.mp3 is 2.04 s (61 frames). Started 61 frames before the end of S2, it
// peaks exactly as S3's logo appears.
const RISER = 61

export const sfxCues = (sceneLength: Record<number, number>): SfxCue[] => [
  // S1 - comment bubbles pop in (24 + i*12)
  ...[24, 36, 48, 60].map((at) => ({ scene: 1, at, name: 'pop' as const, volume: 0.45 })),
  // S2 - stat cards rise (26 + i*16); riser into the reveal
  ...[26, 42, 58].map((at) => ({ scene: 2, at, name: 'tick' as const, volume: 0.5 })),
  { scene: 2, at: sceneLength[2] - RISER, name: 'riser', volume: 0.55 },
  // S3 - logo pop, tagline shimmer, colour-bar wipe
  { scene: 3, at: 12, name: 'hit', volume: 0.35 },
  { scene: 3, at: 62, name: 'shimmer', volume: 0.45 },
  { scene: 3, at: sceneLength[3] - 30, name: 'whoosh', volume: 0.5 },
  // S4 - camera track, fly-through
  { scene: 4, at: 4, name: 'whoosh', volume: 0.35 },
  { scene: 4, at: sceneLength[4] - 34, name: 'whoosh', volume: 0.5 },
  // S5 - pill morphs, file dropped, sources connect (98 + i*10)
  { scene: 5, at: 14, name: 'pop', volume: 0.4 },
  { scene: 5, at: 92, name: 'click', volume: 0.6 },
  ...[0, 1, 2, 3].map((i) => ({ scene: 5, at: 112 + i * 10, name: 'tick' as const, volume: 0.45 })),
  // S6 - each comment labelled (10 + i*30 + 28), then into the panel
  ...[0, 1, 2, 3].map((i) => ({ scene: 6, at: 38 + i * 30, name: 'tick' as const, volume: 0.5 })),
  { scene: 6, at: 140, name: 'whoosh', volume: 0.4 },
  // S7 - the crisis moment
  { scene: 7, at: 50, name: 'hit', volume: 0.6 },
  { scene: 7, at: 52, name: 'alert', volume: 0.55 },
  { scene: 7, at: 256, name: 'shimmer', volume: 0.3 },
  // S8 - chart lifts off
  { scene: 8, at: 20, name: 'whoosh', volume: 0.4 },
  // S9 - send click, cards stack (136 + i*10)
  { scene: 9, at: 86, name: 'click', volume: 0.6 },
  { scene: 9, at: 104, name: 'whoosh', volume: 0.35 },
  ...[0, 1, 2].map((i) => ({ scene: 9, at: 136 + i * 10, name: 'pop' as const, volume: 0.45 })),
  // S10 - dashboard explodes, hand-off to the 3D devices
  { scene: 10, at: 70, name: 'whoosh', volume: 0.4 },
  { scene: 10, at: 114, name: 'whoosh', volume: 0.5 },
  // S11 - into the plans, cards rise (116 + i*8), "Most popular"
  { scene: 11, at: 96 - RISER, name: 'riser', volume: 0.4 },
  ...[0, 1, 2].map((i) => ({ scene: 11, at: 116 + i * 8, name: 'pop' as const, volume: 0.45 })),
  { scene: 11, at: 128, name: 'shimmer', volume: 0.4 },
  // S12 - impact lines tick in (14 + i*12 + 10)
  ...[0, 1, 2, 3].map((i) => ({ scene: 12, at: 24 + i * 12, name: 'tick' as const, volume: 0.45 })),
  // S13 - logo pop, lockup, CTA
  { scene: 13, at: 56, name: 'shimmer', volume: 0.5 },
  { scene: 13, at: 150, name: 'pop', volume: 0.45 },
]
