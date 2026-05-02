'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const LAMP_POSITIONS: [number, number, number][] = [
  [-1.5, 2.7, -3],
  [1.5, 2.7, -1],
  [-1.5, 2.7, 1.5],
  [2.5, 2.7, 3],
]
const MOTE_COUNT = 100
const CONE_RADIUS = 0.7
const CONE_HEIGHT = 2.0

interface Mote {
  pos: THREE.Vector3
  vel: THREE.Vector3
  lampIdx: number
  life: number
}

export default function DustMotes() {
  const meshesRef = useRef<THREE.Mesh[]>([])
  const motesRef = useRef<Mote[]>([])

  // Tiny 4×4 white pixel texture
  const dotTex = useMemo(() => {
    const data = new Uint8Array([255, 255, 255, 255])
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat)
    tex.needsUpdate = true
    return tex
  }, [])

  // Initialize mote positions
  useMemo(() => {
    motesRef.current = Array.from({ length: MOTE_COUNT }, (_, i) => {
      const lampIdx = i % LAMP_POSITIONS.length
      const lp = LAMP_POSITIONS[lampIdx]
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * CONE_RADIUS * 0.5
      return {
        pos: new THREE.Vector3(
          lp[0] + Math.cos(angle) * r,
          lp[1] - Math.random() * CONE_HEIGHT,
          lp[2] + Math.sin(angle) * r,
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          0.008 + Math.random() * 0.015,
          (Math.random() - 0.5) * 0.02,
        ),
        lampIdx,
        life: Math.random(),
      }
    })
  }, [])

  useFrame((_, delta) => {
    const motes = motesRef.current
    const meshes = meshesRef.current

    for (let i = 0; i < motes.length; i++) {
      const m = motes[i]
      const lp = LAMP_POSITIONS[m.lampIdx]

      m.pos.addScaledVector(m.vel, delta * 60)

      // Reset when mote drifts above lamp or out of cone
      const dx = m.pos.x - lp[0]
      const dz = m.pos.z - lp[2]
      const dist2d = Math.sqrt(dx * dx + dz * dz)
      if (m.pos.y > lp[1] || dist2d > CONE_RADIUS || m.pos.y < lp[1] - CONE_HEIGHT) {
        const angle = Math.random() * Math.PI * 2
        const r = Math.random() * CONE_RADIUS * 0.4
        m.pos.set(
          lp[0] + Math.cos(angle) * r,
          lp[1] - CONE_HEIGHT + Math.random() * 0.3,
          lp[2] + Math.sin(angle) * r,
        )
        m.vel.set(
          (Math.random() - 0.5) * 0.02,
          0.008 + Math.random() * 0.015,
          (Math.random() - 0.5) * 0.02,
        )
      }

      if (meshes[i]) {
        meshes[i].position.copy(m.pos)
      }
    }
  })

  return (
    <>
      {Array.from({ length: MOTE_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) meshesRef.current[i] = el
          }}
        >
          <planeGeometry args={[0.015, 0.015]} />
          <meshBasicMaterial
            map={dotTex}
            transparent
            opacity={0.5}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </>
  )
}
