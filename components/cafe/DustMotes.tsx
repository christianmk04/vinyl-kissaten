'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const LAMP_POSITIONS: [number, number, number][] = [
  [-1.5, 2.7, -3],
  [1.5, 2.7, -1],
  [-1.5, 2.7, 1.5],
  [2.5, 2.7, 3],
]
const MOTES_PER_LAMP = 32
const MOTE_COUNT = MOTES_PER_LAMP * LAMP_POSITIONS.length
const CONE_RADIUS = 0.7
const CONE_HEIGHT = 2.0

interface Mote {
  pos: THREE.Vector3
  vel: THREE.Vector3
  lampIdx: number
  life: number
  scale: number
  opacity: number
}

export default function DustMotes() {
  const meshesRef = useRef<THREE.Mesh[]>([])
  const motesRef = useRef<Mote[]>([])
  const { camera } = useThree()

  const dotTex = useMemo(() => {
    const data = new Uint8Array([255, 255, 255, 255])
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat)
    tex.needsUpdate = true
    return tex
  }, [])

  // Distribute motes evenly across all lamps so back spotlights get the same
  // density as the front ones. (Previously: 100 motes / 4 lamps = 25 each;
  // now 32 each = 128 total — visible from any angle thanks to billboarding.)
  useMemo(() => {
    const motes: Mote[] = []
    for (let lampIdx = 0; lampIdx < LAMP_POSITIONS.length; lampIdx++) {
      const lp = LAMP_POSITIONS[lampIdx]
      for (let j = 0; j < MOTES_PER_LAMP; j++) {
        const angle = Math.random() * Math.PI * 2
        const r = Math.random() * CONE_RADIUS * 0.5
        const tier = Math.random()
        const scale = tier < 0.7 ? 0.5 : tier < 0.95 ? 1.0 : 1.7
        const opacity = tier < 0.7 ? 0.25 : tier < 0.95 ? 0.55 : 0.85
        motes.push({
          pos: new THREE.Vector3(
            lp[0] + Math.cos(angle) * r,
            lp[1] - Math.random() * CONE_HEIGHT,
            lp[2] + Math.sin(angle) * r,
          ),
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            0.005 + Math.random() * 0.018,
            (Math.random() - 0.5) * 0.02,
          ),
          lampIdx,
          life: Math.random(),
          scale,
          opacity,
        })
      }
    }
    motesRef.current = motes
  }, [])

  const camPos = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const motes = motesRef.current
    const meshes = meshesRef.current
    camera.getWorldPosition(camPos)

    for (let i = 0; i < motes.length; i++) {
      const m = motes[i]
      const lp = LAMP_POSITIONS[m.lampIdx]

      m.pos.addScaledVector(m.vel, delta * 60)

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

      const mesh = meshes[i]
      if (mesh) {
        mesh.position.copy(m.pos)
        // Billboard — face the camera so motes are visible from any angle.
        // Without this, plane normals point +Z and disappear when the player
        // looks toward the back wall, hiding dust in the back spotlights.
        mesh.lookAt(camPos)
      }
    }
  })

  return (
    <>
      {motesRef.current.map((m, i) => {
        const size = 0.012 * m.scale
        return (
          <mesh
            key={i}
            ref={(el) => {
              if (el) meshesRef.current[i] = el
            }}
          >
            <planeGeometry args={[size, size]} />
            <meshBasicMaterial
              map={dotTex}
              transparent
              opacity={m.opacity}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )
      })}
    </>
  )
}
