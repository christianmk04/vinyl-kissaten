'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from './store'
import { playFootstep } from '@/lib/audio/howlerSetup'

const WALK_SPEED = 1.6 // m/s
const SLOW_SPEED = 0.6 // m/s (Shift held)
const EYE_HEIGHT = 1.65
const BOB_FREQ = 8
const BOB_AMP = 0.04
const SWAY_FREQ = 0.8
const SWAY_AMP = 0.003

export interface MovementInput {
  forward: number  // -1..1
  right: number    // -1..1
  slow: boolean
}

export function usePlayerMovement(getInput: () => MovementInput) {
  const { camera } = useThree()
  const view = useGameStore((s) => s.view)

  const posRef = useRef(new THREE.Vector3(0, EYE_HEIGHT, 3))
  const moveTimeRef = useRef(0)
  const idleTimeRef = useRef(0)
  const footstepAccRef = useRef(0)
  const isMovingRef = useRef(false)

  // Room bounds (8m × 10m, keep 0.3m away from walls)
  const HALF_W = 3.7
  const HALF_D = 4.7

  useFrame((_, delta) => {
    if (view !== 'first-person') return

    const input = getInput()
    const isMoving = Math.abs(input.forward) > 0.01 || Math.abs(input.right) > 0.01
    isMovingRef.current = isMoving

    if (isMoving) {
      idleTimeRef.current = 0
      moveTimeRef.current += delta
      const speed = input.slow ? SLOW_SPEED : WALK_SPEED

      // Move direction relative to camera yaw
      const yaw = new THREE.Euler(0, camera.rotation.y, 0, 'YXZ')
      const fwd = new THREE.Vector3(0, 0, -1).applyEuler(yaw)
      const right = new THREE.Vector3(1, 0, 0).applyEuler(yaw)

      const move = new THREE.Vector3()
      move.addScaledVector(fwd, input.forward * speed * delta)
      move.addScaledVector(right, input.right * speed * delta)

      posRef.current.x = Math.max(-HALF_W, Math.min(HALF_W, posRef.current.x + move.x))
      posRef.current.z = Math.max(-HALF_D, Math.min(HALF_D, posRef.current.z + move.z))

      // Head bob
      const bob = Math.sin(moveTimeRef.current * BOB_FREQ) * BOB_AMP
      camera.position.set(
        posRef.current.x,
        EYE_HEIGHT + bob,
        posRef.current.z,
      )

      // Footstep sound every ~0.5m of movement
      footstepAccRef.current += speed * delta
      if (footstepAccRef.current > 0.5) {
        footstepAccRef.current = 0
        playFootstep()
      }
    } else {
      idleTimeRef.current += delta
      moveTimeRef.current = 0

      // Idle sway
      const sway = Math.sin(idleTimeRef.current * SWAY_FREQ) * SWAY_AMP
      camera.position.set(posRef.current.x, EYE_HEIGHT, posRef.current.z)
      camera.rotation.z = sway
    }
  })

  return posRef
}
