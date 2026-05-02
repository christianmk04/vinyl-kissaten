'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { makeAlbumPlaceholderTexture, ps1Texture, applyPS1Material } from '@/lib/shaders/ps1'
import { Text } from '@react-three/drei'

const HELD_OFFSET = new THREE.Vector3(0.35, -0.35, -0.6)
const HELD_TILT = new THREE.Euler(0.15, -0.25, 0.1)

export default function HeldRecord() {
  const { camera } = useThree()
  const heldAlbum = useGameStore((s) => s.heldAlbum)
  const heldSide = useGameStore((s) => s.heldSide)
  const groupRef = useRef<THREE.Group>(null)
  const flipAnimRef = useRef({ flipping: false, progress: 0, targetSide: 'A' as 'A' | 'B' })
  const prevSideRef = useRef<'A' | 'B'>('A')

  const artTex = useMemo(() => {
    if (!heldAlbum) return null
    if (heldAlbum.artDataUrl) {
      return ps1Texture(new THREE.TextureLoader().load(heldAlbum.artDataUrl))
    }
    return makeAlbumPlaceholderTexture(0)
  }, [heldAlbum?.artDataUrl])

  const frontMat = useMemo(() => {
    if (!artTex) return null
    const m = new THREE.MeshLambertMaterial({ map: artTex, flatShading: true })
    applyPS1Material(m, { snapStrength: 60 })
    return m
  }, [artTex])

  const backMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ color: '#c4b890', flatShading: true })
    applyPS1Material(m, { snapStrength: 60, affineUV: false })
    return m
  }, [])

  // Detect side flip
  useFrame((_, delta) => {
    if (!heldAlbum || !groupRef.current) return

    if (heldSide !== prevSideRef.current && !flipAnimRef.current.flipping) {
      flipAnimRef.current = { flipping: true, progress: 0, targetSide: heldSide }
      prevSideRef.current = heldSide
    }

    // Flip animation
    if (flipAnimRef.current.flipping) {
      flipAnimRef.current.progress = Math.min(
        1,
        flipAnimRef.current.progress + delta / 0.6,
      )
      const angle = flipAnimRef.current.progress * Math.PI
      groupRef.current.rotation.y = HELD_TILT.y + angle
      if (flipAnimRef.current.progress >= 1) {
        flipAnimRef.current.flipping = false
      }
    } else {
      groupRef.current.rotation.set(HELD_TILT.x, HELD_TILT.y, HELD_TILT.z)
    }

    // Position relative to camera
    const worldOffset = HELD_OFFSET.clone().applyQuaternion(camera.quaternion)
    groupRef.current.position.copy(camera.position).add(worldOffset)

    // Gentle sway
    const t = Date.now() / 1000
    groupRef.current.position.y += Math.sin(t * 1.5) * 0.004
  })

  if (!heldAlbum) return null

  return (
    <group ref={groupRef}>
      {/* Sleeve front */}
      <mesh position={[0, 0, 0.006]}>
        <boxGeometry args={[0.28, 0.28, 0.001]} />
        <primitive object={frontMat ?? backMat} attach="material" />
      </mesh>
      {/* Sleeve back */}
      <mesh position={[0, 0, -0.006]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[0.28, 0.28, 0.001]} />
        <primitive object={backMat} attach="material" />
      </mesh>
      {/* Side A/B badge */}
      <Text
        position={[0.11, -0.11, 0.015]}
        fontSize={0.03}
        color="#ffb56b"
        anchorX="center"
        anchorY="middle"
      >
        {`Side ${heldSide}`}
      </Text>
    </group>
  )
}
