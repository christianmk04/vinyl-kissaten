'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Analogue clock with real-system-time hands. Mounted on the front wall
// (z=+5) above the bar counter — the previous spot was behind the shelf
// back panel, so the clock was hidden from the player except briefly
// during shelf-page transitions.
//
// Orientation note: the clock is built in its natural pose with its face
// normal along +Z, then the whole group is rotated 180° around Y so the
// face points -Z (into the room) for the front-wall mount. The rim is a
// thin cylinder rotated 90° around X so its axis is perpendicular to the
// wall — the previous code left the cylinder upright (axis along Y), which
// made the clock look like a horizontal disc seen edge-on from beneath
// rather than a flat wall clock.

export default function WallClock() {
  const hourRef = useRef<THREE.Group>(null)
  const minuteRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const now = new Date()
    const sec = now.getSeconds() + now.getMilliseconds() / 1000
    const min = now.getMinutes() + sec / 60
    const hr = (now.getHours() % 12) + min / 60
    // Hand rotation in local-Z. Combined with the parent group's Y=PI
    // rotation, this maps to a clockwise sweep from the viewer's POV
    // (player looks in +Z direction at the clock on the front wall).
    if (minuteRef.current) {
      minuteRef.current.rotation.z = -(min / 60) * Math.PI * 2
    }
    if (hourRef.current) {
      hourRef.current.rotation.z = -(hr / 12) * Math.PI * 2
    }
  })

  return (
    // Mounted above the bar's wall art on the front wall (front face z=4.94).
    // The wall already carries an equipment rack centered at y=1.85 (top
    // y≈2.25) and two framed albums at y=2.40 (top y≈2.61). The clock sits
    // in the band between the album tops and the ceiling beam at y=2.93,
    // centered on the bar at x=-0.5. We shrink it (scale=0.55, ≈30 cm
    // diameter) so it fits cleanly in that 32 cm vertical gap — it reads as
    // a deliberate "feature clock" at the top of the bar wall instead of
    // overlapping the rack below.
    <group position={[-0.5, 2.78, 4.92]} rotation={[0, Math.PI, 0]} scale={0.55}>
      {/* Outer rim — flat disc lying against the wall. Cylinder rotated so
          its axis is perpendicular to the wall (along Z), giving thin
          circular front/back faces in the XY plane. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.04, 24]} />
        <meshLambertMaterial color="#1a0e06" flatShading />
      </mesh>

      {/* Face — cream, sits 1mm in front of the rim front face */}
      <mesh position={[0, 0, 0.021]}>
        <circleGeometry args={[0.25, 24]} />
        <meshBasicMaterial color="#e8d8b0" />
      </mesh>

      {/* Hour ticks — 12 marks around the face, longer marks every 3 hours */}
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
