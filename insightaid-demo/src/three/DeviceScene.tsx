import { useThree } from '@react-three/fiber'
import { ThreeCanvas } from '@remotion/three'
import { useEffect, useState } from 'react'
import { continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import * as THREE from 'three'
import { clamp, expoOut } from '../components/motion'

/**
 * True-3D laptop + phone for Scene 10, built from primitives (no .glb was
 * supplied - the plan's own fallback). Screens are textured with the app's
 * real dark-mode captures. The camera is driven from useCurrentFrame(), never
 * useFrame, so every render of a frame is identical.
 */
function useTexture(path: string) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  const [handle] = useState(() => delayRender(`texture ${path}`))
  useEffect(() => {
    new THREE.TextureLoader().load(
      staticFile(path),
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 8
        setTex(t)
        continueRender(handle)
      },
      undefined,
      () => continueRender(handle)
    )
  }, [path, handle])
  return tex
}

const Laptop: React.FC<{ screen: THREE.Texture | null; open: number }> = ({ screen, open }) => (
  <group position={[-0.55, -0.55, 0]}>
    {/* base */}
    <mesh position={[0, 0, 0.9]}>
      <boxGeometry args={[3.6, 0.09, 2.4]} />
      <meshStandardMaterial color="#6b7a72" metalness={0.1} roughness={0.5} />
    </mesh>
    {/* lid, hinged at the back edge */}
    <group position={[0, 0.05, -0.3]} rotation={[-Math.PI / 2 + open * (Math.PI / 2 - 0.22), 0, 0]}>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[3.6, 2.25, 0.07]} />
        <meshStandardMaterial color="#6b7a72" metalness={0.1} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.12, 0.037]}>
        <planeGeometry args={[3.42, 1.68]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
    </group>
  </group>
)

const Phone: React.FC<{ screen: THREE.Texture | null; rise: number }> = ({ screen, rise }) => (
  <group position={[2.05, -0.55 + rise * 1.25, 0.75]} rotation={[0, -0.32, 0]}>
    <mesh>
      <boxGeometry args={[0.9, 1.9, 0.08]} />
      <meshStandardMaterial color="#56635c" metalness={0.1} roughness={0.45} />
    </mesh>
    <mesh position={[0, 0, 0.042]}>
      <planeGeometry args={[0.82, 1.82]} />
      <meshBasicMaterial map={screen} toneMapped={false} />
    </mesh>
  </group>
)

export const DeviceScene: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const laptopTex = useTexture('assets/screens/s1-executive-dashboard.png')
  const phoneTex = useTexture('assets/screens/s7-mobile.png')

  const t = frame - start
  const open = interpolate(t, [0, 30], [0.35, 1], { ...clamp, easing: expoOut })
  const rise = interpolate(t, [24, 54], [0, 1], { ...clamp, easing: expoOut })
  const orbit = interpolate(t, [0, 140], [-0.28, 0.24], clamp) // ~30 degrees total
  const dist = interpolate(t, [0, 60], [11.5, 9.6], { ...clamp, easing: expoOut })

  return (
    <ThreeCanvas width={width} height={height} linear camera={{ fov: 32, position: [0, 1.4, 7] }}>
      <CameraRig orbit={orbit} dist={dist} />
      <ambientLight intensity={0.9} />
      <hemisphereLight args={["#d9f99d", "#0a100d", 1.1]} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} />
      {/* emerald rim light */}
      <pointLight position={[-4, 1.5, -2]} intensity={40} color="#22c55e" distance={12} />
      <pointLight position={[4, 0.5, -1]} intensity={22} color="#6ee7b7" distance={10} />
      <Laptop screen={laptopTex} open={open} />
      <Phone screen={phoneTex} rise={rise} />
      {/* floor with pulsing rings */}
      {[0, 1, 2].map((k) => {
        const r = 1.6 + (((t * 0.02 + k / 3) % 1) * 3.2)
        const o = 1 - ((t * 0.02 + k / 3) % 1)
        return (
          <mesh key={k} rotation={[-Math.PI / 2, 0, 0]} position={[0.3, -0.62, 0.6]}>
            <ringGeometry args={[r, r + 0.03, 96]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={o * 0.45} />
          </mesh>
        )
      })}
    </ThreeCanvas>
  )
}

/**
 * Moves the canvas's own camera on a horizontal arc around the devices. Set
 * during render from frame-derived values, so it is deterministic.
 */
const CameraRig: React.FC<{ orbit: number; dist: number }> = ({ orbit, dist }) => {
  const camera = useThree((s) => s.camera)
  camera.position.set(Math.sin(orbit) * dist, 2.4, Math.cos(orbit) * dist)
  camera.lookAt(0.5, 0.35, 0.3)
  camera.updateProjectionMatrix()
  return null
}
