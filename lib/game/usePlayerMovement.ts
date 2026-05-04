'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './store'
import { playFootstep } from '@/lib/audio/howlerSetup'

const WALK_SPEED = 3.8 // m/s
const SLOW_SPEED = 1.4 // m/s (Shift held)
const EYE_HEIGHT = 1.65
const BOB_FREQ = 8
const BOB_AMP = 0.035

export interface MovementInput {
  forward: number  // -1..1
  right: number    // -1..1
  slow: boolean
}

export function usePlayerMovement(getInput: () => MovementInput) {
  const { camera } = useThree()
  const view = useGameStore((s) => s.view)

  // Start in center of room so all directions have equal travel room
  const posRef = useRef(new THREE.Vector3(0, EYE_HEIGHT, 0))
  const moveTimeRef = useRef(0)
  const footstepAccRef = useRef(0)

  // Room bounds: 8m wide × 10m deep, 0.35m clearance from walls
  const HALF_W = 3.65
  const HALF_D = 4.65

  // AABB collision volumes for furniture (already includes 0.25m player radius)
  const OBSTACLES = [
    // Bar counter at group [-0.5, 0, 4.25], body [3.4, 1.0, 0.5]
    { minX: -2.45, maxX: 1.45, minZ: 3.75, maxZ: 5.0 },
    // Turntable table at [3, 0, 0], estimated ~1.2m wide × 0.6m deep
    { minX: 2.05, maxX: 3.95, minZ: -0.6, maxZ: 0.6 },
    // Cafe table at [-2.5, 0, -0.8] with chairs
    { minX: -3.2, maxX: -1.8, minZ: -1.35, maxZ: -0.25 },
    // Cafe table at [-1.8, 0, 1.8] with chairs
    { minX: -2.45, maxX: -1.15, minZ: 1.3, maxZ: 2.3 },
    // Cafe table at [0.5, 0, 2.2] with chairs
    { minX: -0.2, maxX: 1.2, minZ: 1.7, maxZ: 2.75 },
    // Vinyl shelf unit at z=-4.8, frame 6.6m wide × 0.45m deep — fronts protrude to ~z=-4.35
    { minX: -3.55, maxX: 3.55, minZ: -5.1, maxZ: -4.0 },
    // Plant A at [-3.4, 0, 3.8] (small)
    { minX: -3.85, maxX: -2.95, minZ: 3.35, maxZ: 4.25 },
    // Plant B at [-3.4, 0, -0.5] (large)
    { minX: -3.95, maxX: -2.85, minZ: -1.1, maxZ: 0.1 },
    // Plant C at [3.4, 0, 3.8] (small)
    { minX: 2.95, maxX: 3.85, minZ: 3.35, maxZ: 4.25 },
    // Plant D at [-3.4, 0, -3.8] (large)
    { minX: -3.95, maxX: -2.85, minZ: -4.4, maxZ: -3.2 },
  ] as const

  useFrame((_, delta) => {
    if (view !== 'first-person') return

    const input = getInput()
    const isMoving = Math.abs(input.forward) > 0.01 || Math.abs(input.right) > 0.01

    if (isMoving) {
      moveTimeRef.current += delta
      const speed = input.slow ? SLOW_SPEED : WALK_SPEED

      // Move direction from camera yaw only (ignore pitch for horizontal movement)
      const yaw = camera.rotation.y
      const cos = Math.cos(yaw)
      const sin = Math.sin(yaw)

      // Forward vector in xz-plane: (-sin(yaw), 0, -cos(yaw)) when order is YXZ
      const fwdX = -sin * input.forward
      const fwdZ = -cos * input.forward
      // Right vector: (cos(yaw), 0, -sin(yaw))
      const rtX = cos * input.right
      const rtZ = -sin * input.right

      // Attempt move on each axis independently for wall-sliding
      let nx = Math.max(-HALF_W, Math.min(HALF_W, posRef.current.x + (fwdX + rtX) * speed * delta))
      let nz = Math.max(-HALF_D, Math.min(HALF_D, posRef.current.z + (fwdZ + rtZ) * speed * delta))

      // AABB resolution: slide along free axis when blocked
      for (const obs of OBSTACLES) {
        const inX = nx > obs.minX && nx < obs.maxX
        const inZ = nz > obs.minZ && nz < obs.maxZ
        if (inX && inZ) {
          // Try sliding: restore whichever axis entered the box
          const wasInX = posRef.current.x > obs.minX && posRef.current.x < obs.maxX
          const wasInZ = posRef.current.z > obs.minZ && posRef.current.z < obs.maxZ
          if (!wasInX) nx = posRef.current.x
          else if (!wasInZ) nz = posRef.current.z
          else { nx = posRef.current.x; nz = posRef.current.z }
        }
      }

      posRef.current.x = nx
      posRef.current.z = nz

      // Head bob on y only
      const bob = Math.sin(moveTimeRef.current * BOB_FREQ) * BOB_AMP
      camera.position.set(posRef.current.x, EYE_HEIGHT + bob, posRef.current.z)

      // Footstep every ~0.5m
      footstepAccRef.current += speed * delta
      if (footstepAccRef.current > 0.5) {
        footstepAccRef.current = 0
        playFootstep()
      }
    } else {
      moveTimeRef.current = 0
      // Position only — never touch camera rotation here (controlled by look handler)
      camera.position.set(posRef.current.x, EYE_HEIGHT, posRef.current.z)
    }
  })

  return posRef
}
