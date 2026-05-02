'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { applyPS1Material, makeWoodTexture, makeColorTexture } from '@/lib/shaders/ps1'

export default function BarCounter() {
  const woodTex = useMemo(() => makeWoodTexture(), [])
  const darkTex = useMemo(() => makeColorTexture('#1a0e06', 4, 4), [])

  const woodMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ map: woodTex, flatShading: true })
    applyPS1Material(m, { snapStrength: 160 })
    return m
  }, [woodTex])

  const darkMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ map: darkTex, flatShading: true })
    applyPS1Material(m, { snapStrength: 160 })
    return m
  }, [darkTex])

  // Steam particle for espresso machine
  const steamRef = useRef<THREE.Points>(null)
  const steamPositions = useMemo(() => {
    const arr = new Float32Array(20 * 3)
    for (let i = 0; i < 20; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.08
      arr[i * 3 + 1] = Math.random() * 0.3
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.08
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    if (!steamRef.current) return
    const pos = steamRef.current.geometry.attributes.position.array as Float32Array
    const t = clock.getElapsedTime()
    for (let i = 0; i < 20; i++) {
      pos[i * 3 + 1] = ((pos[i * 3 + 1] + 0.008) % 0.4) + 0
      pos[i * 3] += Math.sin(t * 2 + i) * 0.0008
    }
    steamRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <group position={[-1.5, 0, -4.5]}>
      {/* Counter top */}
      <mesh position={[0, 1.05, 0]} material={woodMat}>
        <boxGeometry args={[3, 0.08, 0.65]} />
      </mesh>
      {/* Counter body */}
      <mesh position={[0, 0.52, 0]} material={darkMat}>
        <boxGeometry args={[3, 1.0, 0.6]} />
      </mesh>

      {/* Espresso machine */}
      <group position={[0.8, 1.13, 0]}>
        {/* Machine body */}
        <mesh material={darkMat}>
          <boxGeometry args={[0.45, 0.38, 0.35]} />
        </mesh>
        {/* Group head */}
        <mesh position={[0, -0.18, 0.12]}>
          <cylinderGeometry args={[0.06, 0.06, 0.1, 6]} />
          <meshLambertMaterial color="#333333" flatShading />
        </mesh>
        {/* Portafilter */}
        <mesh position={[0, -0.23, 0.12]}>
          <cylinderGeometry args={[0.055, 0.055, 0.04, 6]} />
          <meshLambertMaterial color="#222222" flatShading />
        </mesh>
        {/* Steam wand */}
        <mesh position={[0.25, -0.05, 0.08]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.008, 0.008, 0.22, 5]} />
          <meshLambertMaterial color="#555555" flatShading />
        </mesh>

        {/* Steam particles */}
        <points ref={steamRef} position={[0.28, 0.06, 0.08]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[steamPositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#aabbcc"
            size={0.015}
            transparent
            opacity={0.3}
            sizeAttenuation
          />
        </points>
      </group>

      {/* Coffee cups */}
      {[[-0.8, 0], [0, 0], [-1.2, 0]].map(([x, z], i) => (
        <group key={i} position={[x, 1.13, z]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.025, 0.055, 6]} />
            <meshLambertMaterial color="#e8d5a8" flatShading />
          </mesh>
          <mesh position={[0, -0.01, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.004, 6]} />
            <meshLambertMaterial color="#d4c09a" flatShading />
          </mesh>
        </group>
      ))}

      {/* Bar stools */}
      {[-1.2, 0, 1.2].map((x, i) => (
        <group key={i} position={[x, 0, 0.7]}>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.06, 8]} />
            <meshLambertMaterial color="#3a1010" flatShading />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.7, 5]} />
            <meshLambertMaterial color="#2a1008" flatShading />
          </mesh>
        </group>
      ))}

      {/* Tables in cafe floor */}
      {[
        [-2.5, -2.0],
        [-2.5, 0.5],
      ].map(([x, z], i) => (
        <CafeTable key={i} x={x} z={z} />
      ))}
    </group>
  )
}

function CafeTable({ x, z }: { x: number; z: number }) {
  const woodTex = useMemo(() => makeWoodTexture(), [])
  const mat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ map: woodTex, flatShading: true })
    applyPS1Material(m, { snapStrength: 160 })
    return m
  }, [woodTex])
  const legMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: '#2a1008', flatShading: true }),
    [],
  )

  // Position offset from BarCounter group origin
  const ox = x + 1.5
  const oz = z + 4.5

  return (
    <group position={[ox, 0, oz]}>
      {/* Top */}
      <mesh position={[0, 0.76, 0]} material={mat}>
        <boxGeometry args={[0.75, 0.06, 0.75]} />
      </mesh>
      {/* Legs */}
      {[
        [-0.3, 0, -0.3],
        [0.3, 0, -0.3],
        [-0.3, 0, 0.3],
        [0.3, 0, 0.3],
      ].map(([lx, , lz], j) => (
        <mesh key={j} position={[lx, 0.38, lz]} material={legMat}>
          <boxGeometry args={[0.05, 0.76, 0.05]} />
        </mesh>
      ))}
      {/* Chair pair */}
      <mesh position={[0, 0.45, -0.55]} material={legMat}>
        <boxGeometry args={[0.42, 0.08, 0.42]} />
      </mesh>
      <mesh position={[0, 0.45, 0.55]} material={legMat}>
        <boxGeometry args={[0.42, 0.08, 0.42]} />
      </mesh>
    </group>
  )
}
