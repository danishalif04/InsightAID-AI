import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { theme } from '../theme'

/**
 * Every scene sits on this: near-black ground, emerald bottom glow, a faint
 * drifting dot grid, grain and a vignette. `noisy` is the pre-brand-reveal
 * look - heavier grain and desaturation - which switches off at Scene 3.
 */
export const Backdrop: React.FC<{
  noisy?: boolean
  glow?: number
  tint?: 'brand' | 'critical'
  children?: React.ReactNode
}> = ({ noisy = false, glow = 1, tint = 'brand', children }) => {
  const frame = useCurrentFrame()
  const glowColor = tint === 'critical' ? 'rgba(220,38,38,0.22)' : 'rgba(34,197,94,0.20)'
  const drift = (frame * 0.25) % 32

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 50% at 50% 110%, ${glowColor}, transparent 70%),
                       radial-gradient(45% 40% at 15% -10%, rgba(34,197,94,0.10), transparent 70%)`,
          opacity: glow,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          backgroundPosition: `${drift}px ${drift}px`,
          maskImage: 'radial-gradient(60% 60% at 50% 50%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(60% 60% at 50% 50%, black, transparent)',
        }}
      />
      <AbsoluteFill style={{ filter: noisy ? 'saturate(0.45)' : undefined }}>{children}</AbsoluteFill>
      <Grain amount={noisy ? 0.11 : 0.035} seed={frame} />
      <AbsoluteFill
        style={{ background: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.55))', pointerEvents: 'none' }}
      />
    </AbsoluteFill>
  )
}

/** Animated film grain. Seeded by frame, so renders are deterministic. */
export const Grain: React.FC<{ amount: number; seed: number }> = ({ amount, seed }) => (
  <AbsoluteFill style={{ opacity: amount, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
    <svg width="100%" height="100%">
      <filter id={`g${seed % 8}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed % 8} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#g${seed % 8})`} />
    </svg>
  </AbsoluteFill>
)
