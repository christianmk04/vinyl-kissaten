'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getWindowColor, getAmbientIntensity, CYCLE_INCREMENT_60FPS } from '@/lib/game/dayNight'

const LAMP_COLOR = '#ffb56b'
const TABLE_LAMP_COLOR = '#ffa050'
const LAMP_POSITIONS: [number, number, number][] = [
  [-1.5, 2.7, -3],
  [1.5, 2.7, -1],
  [-1.5, 2.7, 1.5],
  [2.5, 2.7, 3],
]
// One small lamp per cafe table — positions match BarCounter.tsx CafeTable instances
const TABLE_LAMP_POSITIONS: [number, number, number][] = [
  [-2.5, 0.85, -0.8],
  [-1.8, 0.85, 1.8],
  [0.5, 0.85, 2.2],
]

export default function Lighting() {
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const windowMatsRef = useRef<THREE.MeshLambertMaterial[]>([])
  const timeRef = useRef(0.65)

  useFrame(() => {
    timeRef.current = (timeRef.current + CYCLE_INCREMENT_60FPS) % 1

    const wColor = getWindowColor(timeRef.current)
    const ambIntensity = getAmbientIntensity(timeRef.current)

    if (ambientRef.current) {
      ambientRef.current.intensity = ambIntensity
    }
    for (const mat of windowMatsRef.current) {
      mat.color.set(wColor)
    }
  })

  return (
    <>
      {/* Dim base lighting — the room reads as pools of warm light, not flat */}
      <hemisphereLight args={['#ffb080', '#1a0800', 0.6]} />
      <ambientLight ref={ambientRef} color="#ffb080" intensity={2.5} />

      {/* Pendant point lights */}
      {LAMP_POSITIONS.map((pos, i) => (
        <group key={i} position={pos}>
          {/* Pendant housing */}
          <mesh>
            <cylinderGeometry args={[0.06, 0.1, 0.2, 6]} />
            <meshLambertMaterial color="#2a1a08" flatShading />
          </mesh>
          {/* Bulb glow sphere */}
          <mesh position={[0, -0.15, 0]}>
            <sphereGeometry args={[0.05, 4, 4]} />
            <meshBasicMaterial color="#fff8e0" />
          </mesh>
          {/* Cord */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.6, 4]} />
            <meshLambertMaterial color="#1a0a00" />
          </mesh>
          {/* Volumetric god-ray cone */}
          <mesh position={[0, -1.0, 0]}>
            <coneGeometry args={[0.8, 2.0, 8, 1, true]} />
            <meshBasicMaterial
              color={LAMP_COLOR}
              transparent
              opacity={0.04}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <pointLight
            color={LAMP_COLOR}
            intensity={60}
            distance={6}
            decay={2}
          />
        </group>
      ))}

      {/* Tighter shadow-casting spot over the turntable — focused beam, not flood */}
      <spotLight
        position={[2.5, 2.6, 0]}
        target-position={[3.0, 0.9, 0]}
        color={LAMP_COLOR}
        intensity={28}
        angle={0.28}
        penumbra={0.45}
        distance={3.5}
        castShadow
        shadow-mapSize={[256, 256]}
      />

      {/* Per-table accent lamps — each cafe table has its own pool of warm light */}
      {TABLE_LAMP_POSITIONS.map((pos, i) => (
        <group key={`tlamp-${i}`} position={pos}>
          {/* Small lamp body sitting on the table */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.045, 0.06, 0.08, 6]} />
            <meshLambertMaterial color="#3a1810" flatShading />
          </mesh>
          {/* Glowing shade */}
          <mesh position={[0, 0.13, 0]}>
            <cylinderGeometry args={[0.07, 0.05, 0.1, 6]} />
            <meshBasicMaterial color="#ffd090" />
          </mesh>
          {/* Tiny glowing flame pixel at the wick — visible through the shade top */}
          <mesh position={[0, 0.19, 0]}>
            <planeGeometry args={[0.018, 0.028]} />
            <meshBasicMaterial color="#ffe080" transparent opacity={0.95} />
          </mesh>
          {/* The actual light */}
          <pointLight
            color={TABLE_LAMP_COLOR}
            intensity={2.5}
            distance={1.6}
            decay={2}
            position={[0, 0.1, 0]}
          />
        </group>
      ))}
    </>
  )
}
