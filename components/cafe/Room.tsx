'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import {
  makeWoodTexture,
  makeFloorPlankTexture,
  makeRugTexture,
} from '@/lib/shaders/ps1'

// Room: 8m wide × 10m deep × 3m tall, origin at floor center.

export default function Room() {
  const woodTex = useMemo(() => makeWoodTexture(), [])
  const floorTex = useMemo(() => makeFloorPlankTexture(), [])
  const rugTex = useMemo(() => makeRugTexture(), [])
  const ceilTex = useMemo(() => {
    const t = makeWoodTexture()
    t.repeat.set(4, 5)
    return t
  }, [])

  const wallMat = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ map: woodTex })
    woodTex.repeat.set(3, 1.5)
    return mat
  }, [woodTex])

  const floorMat = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ map: floorTex })
    floorTex.repeat.set(4, 6)
    return mat
  }, [floorTex])

  const ceilMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: ceilTex }),
    [ceilTex],
  )

  const beamMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#1a0d06' }),
    [],
  )

  const rugMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: rugTex }),
    [rugTex],
  )

  const darkWoodMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: '#1e1008', flatShading: true }),
    [],
  )

  const leafMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: '#1a3d12', flatShading: true }),
    [],
  )

  const leafLightMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: '#2a5018', flatShading: true }),
    [],
  )

  const potMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: '#7a3820', flatShading: true }),
    [],
  )

  return (
    <group>
      {/* ── Floor ────────────────────────────────────────────────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={floorMat}>
        <planeGeometry args={[8, 10]} />
      </mesh>

      {/* ── Ceiling ──────────────────────────────────────────────────────── */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]} material={ceilMat}>
        <planeGeometry args={[8, 10]} />
      </mesh>

      {/* Exposed ceiling beams running left-right, every 1.8m in z */}
      {[-3.6, -1.8, 0, 1.8, 3.6].map((z, i) => (
        <mesh key={`beam-${i}`} position={[0, 2.93, z]} material={beamMat}>
          <boxGeometry args={[8.1, 0.14, 0.18]} />
        </mesh>
      ))}
      {/* Longitudinal ridge beam down the center */}
      <mesh position={[0, 2.91, 0]} material={beamMat}>
        <boxGeometry args={[0.18, 0.12, 10.1]} />
      </mesh>

      {/* ── Walls ────────────────────────────────────────────────────────── */}
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

      {/* Right wall (+x) — two panels around the window opening.
          Window opening: z=[-0.75, 1.75], y=[0.8, 2.4] — clean 2.5m × 1.6m hole. */}
      <mesh position={[4, 1.5, -2.875]} material={wallMat}>
        <boxGeometry args={[0.12, 3, 4.25]} />
      </mesh>
      <mesh position={[4, 1.5, 3.375]} material={wallMat}>
        <boxGeometry args={[0.12, 3, 3.25]} />
      </mesh>
      {/* Window header + sill — span the opening exactly */}
      <mesh position={[4, 2.6, 0.5]} material={wallMat}>
        <boxGeometry args={[0.12, 0.4, 2.5]} />
      </mesh>
      <mesh position={[4, 0.4, 0.5]} material={wallMat}>
        <boxGeometry args={[0.12, 0.8, 2.5]} />
      </mesh>

      {/* Floor zone under seating area — visibly darker to delineate the rug
          area from the entrance/shelf area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.003, 0.5]}>
        <planeGeometry args={[4.4, 5.2]} />
        <meshBasicMaterial color="#0c0604" transparent opacity={0.92} />
      </mesh>

      {/* ── Persian rug ──────────────────────────────────────────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.005, 0.5]} material={rugMat}>
        <planeGeometry args={[3, 4]} />
      </mesh>

      {/* Left-wall posters and right-wall now-playing board are mounted by
          dedicated components from Cafe.tsx so they can read the live store
          for current track metadata. */}

      {/* ── Plants ───────────────────────────────────────────────────────── */}
      {/* Plant A — left-front corner */}
      <Plant position={[-3.4, 0, 3.8]} leafMat={leafMat} leafLight={leafLightMat} potMat={potMat} />

      {/* Plant B — left wall mid */}
      <Plant position={[-3.4, 0, -0.5]} leafMat={leafMat} leafLight={leafLightMat} potMat={potMat} large />

      {/* Plant C — right front (near window) */}
      <Plant position={[3.4, 0, 3.8]} leafMat={leafMat} leafLight={leafLightMat} potMat={potMat} />

      {/* Plant D — back left corner */}
      <Plant position={[-3.4, 0, -3.8]} leafMat={leafMat} leafLight={leafLightMat} potMat={potMat} large />

      {/* ── Skirting / floor trim ────────────────────────────────────────── */}
      <mesh position={[0, 0.06, -4.93]} material={darkWoodMat}>
        <boxGeometry args={[8, 0.12, 0.06]} />
      </mesh>
      <mesh position={[0, 0.06, 4.93]} material={darkWoodMat}>
        <boxGeometry args={[8, 0.12, 0.06]} />
      </mesh>
      <mesh position={[-3.93, 0.06, 0]} material={darkWoodMat}>
        <boxGeometry args={[0.06, 0.12, 10]} />
      </mesh>
      <mesh position={[3.93, 0.06, 0]} material={darkWoodMat}>
        <boxGeometry args={[0.06, 0.12, 10]} />
      </mesh>
    </group>
  )
}

function Plant({
  position,
  leafMat,
  leafLight,
  potMat,
  large = false,
}: {
  position: [number, number, number]
  leafMat: THREE.Material
  leafLight: THREE.Material
  potMat: THREE.Material
  large?: boolean
}) {
  const s = large ? 1.5 : 1.0
  return (
    <group position={position}>
      {/* Pot */}
      <mesh position={[0, 0.13 * s, 0]} material={potMat}>
        <boxGeometry args={[0.22 * s, 0.26 * s, 0.22 * s]} />
      </mesh>
      {/* Soil top */}
      <mesh position={[0, 0.27 * s, 0]} rotation={[-Math.PI / 2, 0, 0]} material={potMat}>
        <planeGeometry args={[0.18 * s, 0.18 * s]} />
      </mesh>
      {/* Stem */}
      <mesh position={[0, 0.52 * s, 0]} material={potMat}>
        <cylinderGeometry args={[0.025 * s, 0.03 * s, 0.52 * s, 5]} />
      </mesh>
      {/* Main foliage cluster */}
      <mesh position={[0, 0.88 * s, 0]} material={leafMat}>
        <boxGeometry args={[0.52 * s, 0.48 * s, 0.52 * s]} />
      </mesh>
      {/* Smaller "crown" cluster on top — kept entirely inside the main
          foliage's xz footprint so it adds vertical bulk without producing
          the awkward flat protrusions the previous offset clusters and
          drooping-leaf slabs created */}
      <mesh position={[0, 1.18 * s, 0]} material={leafLight}>
        <boxGeometry args={[0.38 * s, 0.22 * s, 0.38 * s]} />
      </mesh>
    </group>
  )
}
