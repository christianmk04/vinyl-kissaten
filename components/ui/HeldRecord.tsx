'use client'

import { useEffect, useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { makeAlbumPlaceholderTexture, ps1Texture } from '@/lib/shaders/ps1'

// Two presets — desktop has more screen real estate so the held record can
// be larger and centered nearer the screen middle. On mobile portrait the
// album dominated the lower half (see user feedback w/ "GROWING UP IS"
// sleeve filling most of the frame), so we shrink the sleeve and tuck it
// down-right into the corner so it doesn't block what the player is
// trying to look at.
type HeldDims = { size: number; forward: number; right: number; down: number }
const DESKTOP_SLEEVE: HeldDims = {
  size: 0.50,
  forward: 0.52,
  right: 0.06,
  down: -0.16,
}
const MOBILE_SLEEVE: HeldDims = {
  size: 0.32,
  forward: 0.55,
  right: 0.16,
  down: -0.20,
}

const TILT_X = -0.50  // negative = top tilts toward camera (forward tilt)

// Pre-allocated reusables
const _tiltQuat = new THREE.Quaternion()
const _tiltEuler = new THREE.Euler(TILT_X, 0, 0, 'YXZ')
_tiltQuat.setFromEuler(_tiltEuler)
const _flipAxis = new THREE.Vector3(0, 1, 0)
const _flipQuat = new THREE.Quaternion()
const _localOffset = new THREE.Vector3()

export default function HeldRecord() {
  const { camera } = useThree()
  const heldAlbum = useGameStore((s) => s.heldAlbum)
  const heldSide = useGameStore((s) => s.heldSide)

  // Picked once at mount — this component is client-only (parent uses
  // dynamic({ ssr: false })) so the window check is safe here.
  const dims = useMemo<HeldDims>(
    () => (typeof window !== 'undefined' && 'ontouchstart' in window ? MOBILE_SLEEVE : DESKTOP_SLEEVE),
    [],
  )

  const groupRef = useRef<THREE.Group>(null)
  const prevSideRef = useRef<'A' | 'B'>('A')

  // Flip state: track offset (accumulated complete flips) + current animation
  const flipOffsetRef = useRef(0)  // 0 or π — angle after last complete flip
  const flipAnimRef = useRef({ active: false, progress: 0 })

  const artTex = useMemo(() => {
    if (!heldAlbum) return null
    if (heldAlbum.artDataUrl) return ps1Texture(new THREE.TextureLoader().load(heldAlbum.artDataUrl))
    return makeAlbumPlaceholderTexture(0)
  }, [heldAlbum?.artDataUrl])

  // Detect flip trigger
  useEffect(() => {
    if (heldSide !== prevSideRef.current) {
      prevSideRef.current = heldSide
      flipAnimRef.current = { active: true, progress: 0 }
    }
  }, [heldSide])

  // Reset flip state when a new album is picked up
  useEffect(() => {
    flipOffsetRef.current = 0
    flipAnimRef.current = { active: false, progress: 0 }
    prevSideRef.current = 'A'
  }, [heldAlbum?.id])

  useFrame((_, delta) => {
    if (!heldAlbum || !groupRef.current) return

    // Animate flip progress with smoothstep ease-in-out over 700ms
    if (flipAnimRef.current.active) {
      flipAnimRef.current.progress = Math.min(1, flipAnimRef.current.progress + delta / 0.70)
      if (flipAnimRef.current.progress >= 1) {
        flipAnimRef.current.active = false
        // Accumulate the completed π rotation into the offset
        flipOffsetRef.current = (flipOffsetRef.current + Math.PI) % (2 * Math.PI)
      }
    }

    // Compute current flip angle: offset + smoothstep-eased in-progress portion
    let flipAngle = flipOffsetRef.current
    if (flipAnimRef.current.active) {
      const p = flipAnimRef.current.progress
      const eased = p * p * (3 - 2 * p)  // smoothstep
      flipAngle += eased * Math.PI
    }

    // Position in camera-local space, then transform to world via the camera's
    // full quaternion. This keeps the record glued to a fixed screen-space
    // location, so it follows the view when looking up or down (no longer
    // obscures what's directly in front of you when pitching the camera).
    const t = Date.now() / 1000
    const floatY = Math.sin(t * 1.4) * 0.004
    _localOffset.set(dims.right, dims.down + floatY, -dims.forward)
    _localOffset.applyQuaternion(camera.quaternion)
    groupRef.current.position.copy(camera.position).add(_localOffset)

    // Orientation: camera × tiltQuat × flipQuat (local Y axis rotation)
    // This keeps the tilt constant throughout the flip — portrait-nail rotation
    _flipQuat.setFromAxisAngle(_flipAxis, flipAngle)
    groupRef.current.quaternion
      .copy(camera.quaternion)
      .multiply(_tiltQuat)
      .multiply(_flipQuat)
  })

  if (!heldAlbum) return null

  // Hands scale with the sleeve so they still grip the corners on mobile.
  const handSize = dims.size * 0.20
  const handDepth = 0.06

  return (
    <group ref={groupRef}>
      {/* Front face — art (MeshBasic so warm room lights don't tint album colors) */}
      <mesh
        position={[0, 0, 0.002]}
        ref={(mesh) => { if (mesh) mesh.raycast = () => null }}
      >
        <boxGeometry args={[dims.size, dims.size, 0.002]} />
        {artTex
          ? <meshBasicMaterial map={artTex} />
          : <meshBasicMaterial color="#3a2818" />}
      </mesh>

      {/* Back face — same album art */}
      <mesh
        position={[0, 0, -0.002]}
        rotation={[0, Math.PI, 0]}
        ref={(mesh) => { if (mesh) mesh.raycast = () => null }}
      >
        <boxGeometry args={[dims.size, dims.size, 0.002]} />
        {artTex
          ? <meshBasicMaterial map={artTex} />
          : <meshBasicMaterial color="#3a2818" />}
      </mesh>

      {/* Left hand */}
      <mesh
        position={[-dims.size * 0.35, -dims.size * 0.46, 0.015]}
        ref={(mesh) => { if (mesh) mesh.raycast = () => null }}
      >
        <boxGeometry args={[handSize * 2, handSize * 1.4, handDepth]} />
        <meshLambertMaterial color="#b08060" flatShading />
      </mesh>

      {/* Right hand */}
      <mesh
        position={[dims.size * 0.35, -dims.size * 0.46, 0.015]}
        ref={(mesh) => { if (mesh) mesh.raycast = () => null }}
      >
        <boxGeometry args={[handSize * 2, handSize * 1.4, handDepth]} />
        <meshLambertMaterial color="#b08060" flatShading />
      </mesh>
    </group>
  )
}
