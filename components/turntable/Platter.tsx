'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { makeVinylLabelTexture, ps1Texture, applyPS1Material } from '@/lib/shaders/ps1'

export default function Platter() {
  const platterRef = useRef<THREE.Mesh>(null)
  const vinylRef = useRef<THREE.Mesh>(null)
  const spinRef = useRef(0)

  const isPlaying = useGameStore((s) => s.isPlaying)
  const platterRpm = useGameStore((s) => s.platterRpm)
  const loadedAlbum = useGameStore((s) => s.loadedAlbum)
  const loadedSide = useGameStore((s) => s.loadedSide)

  const labelTex = useMemo(() => {
    if (loadedAlbum?.artDataUrl) {
      const loader = new THREE.TextureLoader()
      return ps1Texture(loader.load(loadedAlbum.artDataUrl))
    }
    return makeVinylLabelTexture()
  }, [loadedAlbum?.artDataUrl, loadedSide])

  const platterMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ color: '#2a2a2a', flatShading: true })
    applyPS1Material(m, { snapStrength: 80, affineUV: false })
    return m
  }, [])

  const vinylMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ color: '#111111', flatShading: true })
    applyPS1Material(m, { snapStrength: 80, affineUV: false })
    return m
  }, [])

  useFrame((_, delta) => {
    if (isPlaying) {
      // 33 RPM ≈ 0.55 rev/s, 45 RPM ≈ 0.75 rev/s
      const rps = platterRpm === 33 ? 0.55 : 0.75
      spinRef.current += rps * Math.PI * 2 * delta
      if (platterRef.current) platterRef.current.rotation.y = spinRef.current
      if (vinylRef.current) vinylRef.current.rotation.y = spinRef.current
    }
  })

  return (
    <group>
      {/* Platter base */}
      <mesh ref={platterRef} material={platterMat}>
        <cylinderGeometry args={[0.22, 0.22, 0.022, 24]} />
      </mesh>

      {/* Spindle */}
      <mesh position={[0, 0.022, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.015, 6]} />
        <meshLambertMaterial color="#888888" flatShading />
      </mesh>

      {/* Vinyl record (only when loaded) */}
      {loadedAlbum && (
        <mesh ref={vinylRef} position={[0, 0.012, 0]} material={vinylMat}>
          <cylinderGeometry args={[0.2, 0.2, 0.004, 24]} />
        </mesh>
      )}

      {/* Center label */}
      {loadedAlbum && (
        <mesh position={[0, 0.016, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.002, 16]} />
          <meshLambertMaterial map={labelTex} flatShading />
        </mesh>
      )}
    </group>
  )
}
