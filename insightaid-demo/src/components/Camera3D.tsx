import { AbsoluteFill } from 'remotion'

/**
 * One perspective space per scene. Children use <Layer z> to sit at a depth.
 * The camera moves by transforming the whole stage, which is cheaper than
 * transforming every layer and keeps parallax consistent.
 *
 * Resting angle from the plan: rotateX 12deg, rotateY -18deg. Scenes flatten
 * to 0 whenever numbers have to be read.
 */
export const Camera3D: React.FC<{
  rx?: number
  ry?: number
  z?: number
  x?: number
  y?: number
  perspective?: number
  shake?: number
  children: React.ReactNode
}> = ({ rx = 0, ry = 0, z = 0, x = 0, y = 0, perspective = 2200, shake = 0, children }) => (
  <AbsoluteFill style={{ perspective: `${perspective}px`, perspectiveOrigin: '50% 45%' }}>
    <AbsoluteFill
      style={{
        transformStyle: 'preserve-3d',
        transform: `translate3d(${x + shake}px, ${y - shake * 0.6}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg)`,
      }}
    >
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
)

/** Places children at a Z depth. Far layers blur and fade per the layer table. */
export const Layer: React.FC<{
  z?: number
  blur?: number
  opacity?: number
  style?: React.CSSProperties
  children: React.ReactNode
}> = ({ z = 0, blur = 0, opacity = 1, style, children }) => (
  <AbsoluteFill
    style={{
      transformStyle: 'preserve-3d',
      transform: `translateZ(${z}px)`,
      filter: blur ? `blur(${blur}px)` : undefined,
      opacity,
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
)
