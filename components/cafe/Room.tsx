'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  applyPS1Material,
  makeWoodTexture,
  makeFloorPlankTexture,
  makeRugTexture,
  makeColorTexture,
} from '@/lib/shaders/ps1'

// Room: 8m wide × 10m deep × 3m tall
// Origin at floor center. Vinyl shelves on -z wall, turntable on +x wall.

export default function Room() {
  const woodTex = useMemo(() => makeWoodTexture(), [])
  const floorTex = useMemo(() => makeFloorPlankTexture(), [])
  const rugTex = useMemo(() => makeRugTexture(), [])
  const ceilTex = useMemo(() => makeColorTexture('#1e1208', 4, 4), [])

  const floorMat = useMemo(() => {
    const mat = new THREE.MeshLambertMaterial({
      map: floorTex,
    })
    floorTex.repeat.set(4, 6)
    applyPS1Material(mat, { snapStrength: 160 })
    return mat
  }, [floorTex])

  const wallMat = useMemo(() => {
    const mat = new THREE.MeshLambertMaterial({ map: woodTex, flatShading: true })
    woodTex.repeat.set(3, 1.5)
    applyPS1Material(mat, { snapStrength: 160 })
    return mat
  }, [woodTex])

  const ceilMat = useMemo(() => {
    const mat = new THREE.MeshLambertMaterial({ map: ceilTex, flatShading: true })
    applyPS1Material(mat, { snapStrength: 160 })
    return mat
  }, [ceilTex])

  const rugMat = useMemo(() => {
    const mat = new THREE.MeshLambertMaterial({ map: rugTex, flatShading: true })
    applyPS1Material(mat, { snapStrength: 80 })
    return mat
  }, [rugTex])

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={floorMat}>
        <planeGeometry args={[8, 10]} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]} material={ceilMat}>
        <planeGeometry args={[8, 10]} />
      </mesh>

      {/* Back wall (vinyl shelves side, -z) */}
      <mesh position={[0, 1.5, -5]} material={wallMat}>
        <boxGeometry args={[8, 3, 0.12]} />
      </mesh>

      {/* Front wall (+z) */}
      <mesh position={[0, 1.5, 5]} material={wallMat}>
        <boxGeometry args={[8, 3, 0.12]} />
      </mesh>

      {/* Left wall (-x) */}
      <mesh position={[-4, 1.5, 0]} material={wallMat}>
        <boxGeometry args={[0.12, 3, 10]} />
      </mesh>

      {/* Right wall (+x) — has window cutout, handled as two panels */}
      <mesh position={[4, 1.5, -2]} material={wallMat}>
        <boxGeometry args={[0.12, 3, 6]} />
      </mesh>
      <mesh position={[4, 1.5, 3.5]} material={wallMat}>
        <boxGeometry args={[0.12, 3, 3]} />
      </mesh>
      {/* Window header + sill */}
      <mesh position={[4, 2.6, 0.5]} material={wallMat}>
        <boxGeometry args={[0.12, 0.4, 2.5]} />
      </mesh>
      <mesh position={[4, 0.4, 0.5]} material={wallMat}>
        <boxGeometry args={[0.12, 0.8, 2.5]} />
      </mesh>

      {/* Persian rug under listening chair area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2, 0.005, 0.5]} material={rugMat}>
        <planeGeometry args={[2, 3]} />
      </mesh>
    </group>
  )
}
