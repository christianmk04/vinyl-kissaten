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
      pos[i * 3 + 1] = ((pos[i * 3 + 1] + 0.008) % 0.4)
      pos[i * 3] += Math.sin(t * 2 + i) * 0.0008
    }
    steamRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <>
      {/* ── Bar counter along front wall ─────────────────────────────────── */}
      <group position={[-0.5, 0, 4.25]}>
        {/* Counter top */}
        <mesh position={[0, 1.05, 0]} material={woodMat}>
          <boxGeometry args={[3.4, 0.08, 0.55]} />
        </mesh>
        {/* Counter body */}
        <mesh position={[0, 0.52, 0]} material={darkMat}>
          <boxGeometry args={[3.4, 1.0, 0.5]} />
        </mesh>

        {/* Espresso machine */}
        <group position={[0.8, 1.13, 0]}>
          <mesh material={darkMat}>
            <boxGeometry args={[0.45, 0.38, 0.35]} />
          </mesh>
          <mesh position={[0, -0.18, 0.12]}>
            <cylinderGeometry args={[0.06, 0.06, 0.1, 6]} />
            <meshLambertMaterial color="#333333" flatShading />
          </mesh>
          <mesh position={[0, -0.23, 0.12]}>
            <cylinderGeometry args={[0.055, 0.055, 0.04, 6]} />
            <meshLambertMaterial color="#222222" flatShading />
          </mesh>
          <mesh position={[0.25, -0.05, 0.08]} rotation={[0, 0, -0.3]}>
            <cylinderGeometry args={[0.008, 0.008, 0.22, 5]} />
            <meshLambertMaterial color="#555555" flatShading />
          </mesh>
          <points ref={steamRef} position={[0.28, 0.06, 0.08]}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[steamPositions, 3]} />
            </bufferGeometry>
            <pointsMaterial color="#aabbcc" size={0.015} transparent opacity={0.3} sizeAttenuation />
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

        {/* Bar stools (face into room, toward -z) */}
        {[-1.2, 0, 1.2].map((x, i) => (
          <group key={i} position={[x, 0, -0.65]}>
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

        {/* Barista stool — sits behind the counter, suggests an owner is at work.
            Lower than the bar stools (counter-side prep height) and tucked
            tight against the counter back. */}
        <group position={[-0.6, 0, 0.30]}>
          {/* Seat */}
          <mesh position={[0, 0.62, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.05, 8]} />
            <meshLambertMaterial color="#2a0808" flatShading />
          </mesh>
          {/* Stem */}
          <mesh position={[0, 0.31, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.62, 5]} />
            <meshLambertMaterial color="#1a0a04" flatShading />
          </mesh>
          {/* Cross-foot base */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.025, 8]} />
            <meshLambertMaterial color="#1a0a04" flatShading />
          </mesh>
          {/* Folded apron / cloth draped over the seat — gives a "someone was
              just here" cue without committing to a full character mesh */}
          <mesh position={[0.04, 0.66, 0.02]} rotation={[0, 0.3, 0]}>
            <boxGeometry args={[0.18, 0.04, 0.14]} />
            <meshLambertMaterial color="#5a3020" flatShading />
          </mesh>
        </group>
      </group>

      {/* ── Cafe tables scattered in room center ─────────────────────────── */}
      <CafeTable position={[-2.5, 0, -0.8]} />
      <CafeTable position={[-1.8, 0, 1.8]} />
      <CafeTable position={[0.5, 0, 2.2]} />
    </>
  )
}

function CafeTable({ position }: { position: [number, number, number] }) {
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
  const seatMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: '#3a1010', flatShading: true }),
    [],
  )

  return (
    <group position={position}>
      {/* Tabletop */}
      <mesh position={[0, 0.76, 0]} material={mat}>
        <boxGeometry args={[0.75, 0.06, 0.75]} />
      </mesh>
      {/* Legs */}
      {([ [-0.3, 0, -0.3], [0.3, 0, -0.3], [-0.3, 0, 0.3], [0.3, 0, 0.3] ] as [number,number,number][]).map(([lx, , lz], j) => (
        <mesh key={j} position={[lx, 0.38, lz]} material={legMat}>
          <boxGeometry args={[0.05, 0.76, 0.05]} />
        </mesh>
      ))}
      {/* Chairs — seat + backrest */}
      {([[-0.55, 0, 0, 0], [0.55, 0, 0, Math.PI]] as [number,number,number,number][]).map(([cx, , cz, ry], j) => (
        <group key={j} position={[cx, 0, cz]} rotation={[0, ry, 0]}>
          <mesh position={[0, 0.45, 0]} material={seatMat}>
            <boxGeometry args={[0.42, 0.07, 0.42]} />
          </mesh>
          <mesh position={[0, 0.78, -0.18]} material={seatMat}>
            <boxGeometry args={[0.42, 0.54, 0.07]} />
          </mesh>
          {/* Chair legs */}
          {([ [-0.17, 0, -0.17], [0.17, 0, -0.17], [-0.17, 0, 0.17], [0.17, 0, 0.17] ] as [number,number,number][]).map(([lx, , lz], k) => (
            <mesh key={k} position={[lx, 0.22, lz]} material={legMat}>
              <boxGeometry args={[0.04, 0.44, 0.04]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
