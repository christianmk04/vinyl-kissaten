'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Analogue clock with real-system-time hands. Mounted on the back wall above
// the shelves (high enough to clear the shelf top frame). Hour and minute
// hands update every frame from `Date()`.

export default function WallClock() {
  const hourRef = useRef<THREE.Group>(null)
  const minuteRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const now = new Date()
    const sec = now.getSeconds() + now.getMilliseconds() / 1000
    const min = now.getMinutes() + sec / 60
    const hr = (now.getHours() % 12) + min / 60
    // 0 rad = pointing up (+Y). Rotate clockwise = negative Z rotation.
    if (minuteRef.current) {
      minuteRef.current.rotation.z = -(min / 60) * Math.PI * 2
    }
    if (hourRef.current) {
      hourRef.current.rotation.z = -(hr / 12) * Math.PI * 2
    }
  })

  return (
    <group position={[0, 2.55, -4.93]}>
      {/* Outer rim — dark wood */}
      <mesh>
        <cylinderGeometry args={[0.28, 0.28, 0.04, 24]} />
        <meshLambertMaterial color="#1a0e06" flatShading />
      </mesh>
      {/* Face — cream */}
      <mesh position={[0, 0, 0.021]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 24]} />
        <meshBasicMaterial color="#e8d8b0" />
      </mesh>

      {/* Hour ticks — 12 marks around the face */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const r = 0.22
        const isMajor = i % 3 === 0
        const w = isMajor ? 0.018 : 0.010
        const h = isMajor ? 0.030 : 0.020
        return (
          <mesh
            key={i}
            position={[Math.sin(angle) * r, Math.cos(angle) * r, 0.025]}
            rotation={[0, 0, -angle]}
          >
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial color="#1a0e06" />
          </mesh>
        )
      })}

      {/* Hour hand — short and thick */}
      <group ref={hourRef} position={[0, 0, 0.027]}>
        <mesh position={[0, 0.075, 0]}>
          <planeGeometry args={[0.020, 0.16]} />
          <meshBasicMaterial color="#1a0e06" />
        </mesh>
      </group>

      {/* Minute hand — long and thin */}
      <group ref={minuteRef} position={[0, 0, 0.028]}>
        <mesh position={[0, 0.105, 0]}>
          <planeGeometry args={[0.012, 0.21]} />
          <meshBasicMaterial color="#1a0e06" />
        </mesh>
      </group>

      {/* Center pin */}
      <mesh position={[0, 0, 0.030]}>
        <circleGeometry args={[0.014, 12]} />
        <meshBasicMaterial color="#3a2010" />
      </mesh>
    </group>
  )
}
