'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { getWindowColor, getAmbientIntensity, CYCLE_INCREMENT_60FPS } from '@/lib/game/dayNight'

const LAMP_COLOR = '#ffb56b'
const LAMP_POSITIONS: [number, number, number][] = [
  [-1.5, 2.7, -3],
  [1.5, 2.7, -1],
  [-1.5, 2.7, 1.5],
  [2.5, 2.7, 3],
]

export default function Lighting() {
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const windowMatsRef = useRef<THREE.MeshLambertMaterial[]>([])
  const { timeOfDay, cycleSpeed, setTimeOfDay } = useGameStore()

  useFrame((_, delta) => {
    const store = useGameStore.getState()
    const newTime = (store.timeOfDay + CYCLE_INCREMENT_60FPS * store.cycleSpeed) % 1
    setTimeOfDay(newTime)

    const wColor = getWindowColor(newTime)
    const ambIntensity = getAmbientIntensity(newTime)

    if (ambientRef.current) {
      ambientRef.current.intensity = ambIntensity
    }
    for (const mat of windowMatsRef.current) {
      mat.color.set(wColor)
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} color="#ffb080" intensity={0.06} />

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
          {/* Shadow blob on floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -pos[1] + 0.01, 0]}>
            <planeGeometry args={[1.5, 1.5]} />
            <meshBasicMaterial
              color="#000000"
              transparent
              opacity={0.35}
              blending={THREE.MultiplyBlending}
              depthWrite={false}
            />
          </mesh>
          <pointLight
            color={LAMP_COLOR}
            intensity={1.2}
            distance={4}
            decay={2}
          />
        </group>
      ))}

      {/* Single shadow-casting spot over the turntable */}
      <spotLight
        position={[2.5, 2.8, 0]}
        target-position={[2.5, 0.8, 0]}
        color={LAMP_COLOR}
        intensity={1.5}
        angle={0.5}
        penumbra={0.3}
        distance={4}
        castShadow
        shadow-mapSize={[256, 256]}
      />
    </>
  )
}
