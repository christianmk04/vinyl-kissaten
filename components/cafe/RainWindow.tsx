'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeRainSpriteSheet, makeColorTexture, applyPS1Material } from '@/lib/shaders/ps1'

const FRAME_COUNT = 8
const FRAME_H = 16 / 128 // each frame is 16px of 128px total height

export default function RainWindow() {
  const rainTex = useMemo(() => makeRainSpriteSheet(), [])
  const streetTex = useMemo(() => makeColorTexture('#1a2a38', 4, 4), [])

  const rainMatRef = useRef<THREE.MeshLambertMaterial>(null)
  const frameRef = useRef(0)
  const timeRef = useRef(0)

  const rainMat = useMemo(() => {
    rainTex.repeat.set(1, FRAME_H)
    rainTex.offset.set(0, 0)
    const mat = new THREE.MeshLambertMaterial({
      map: rainTex,
      transparent: true,
      alphaTest: 0.01,
    })
    applyPS1Material(mat, { snapStrength: 120 })
    return mat
  }, [rainTex])

  const streetMat = useMemo(() => {
    const mat = new THREE.MeshLambertMaterial({ map: streetTex })
    applyPS1Material(mat, { snapStrength: 160 })
    return mat
  }, [streetTex])

  useFrame((_, delta) => {
    timeRef.current += delta
    if (timeRef.current > 1 / 12) {
      timeRef.current = 0
      frameRef.current = (frameRef.current + 1) % FRAME_COUNT
      rainTex.offset.set(0, 1 - (frameRef.current + 1) * FRAME_H)
      rainTex.needsUpdate = true
    }
  })

  return (
    <group position={[4, 1.6, 0.5]}>
      {/* Street exterior behind window */}
      <mesh position={[0.1, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.5, 2]} />
        <meshLambertMaterial color="#0d1a22" />
      </mesh>
      {/* Neon glow patches on street */}
      <mesh position={[0.08, 0.3, 0.4]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.4, 0.1]} />
        <meshBasicMaterial
          color="#ff2244"
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0.08, 0.1, -0.3]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.3, 0.08]} />
        <meshBasicMaterial
          color="#22aaff"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Window pane with rain */}
      <mesh rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.5, 2]} />
        <primitive object={rainMat} attach="material" />
      </mesh>
      {/* Window frame */}
      <mesh position={[-0.02, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[2.6, 2.1, 0.04]} />
        <meshLambertMaterial color="#1e0e04" flatShading />
      </mesh>
    </group>
  )
}
