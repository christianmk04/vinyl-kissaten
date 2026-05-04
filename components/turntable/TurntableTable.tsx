'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { applyPS1Material, makeWoodTexture } from '@/lib/shaders/ps1'
import { interactions } from '@/lib/game/interactions'
import Platter from './Platter'
import Tonearm from './Tonearm'

// Turntable sits at: position [3, 0.82, 0] (near right wall)
// Table surface at y=0.82, turntable deck at y=0.87

export default function TurntableTable() {
  const woodTex = useMemo(() => makeWoodTexture(), [])
  const tableMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ map: woodTex, flatShading: true })
    woodTex.repeat.set(2, 1)
    applyPS1Material(m, { snapStrength: 160 })
    return m
  }, [woodTex])

  const deckMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ color: '#1a1a1a', flatShading: true })
    applyPS1Material(m, { snapStrength: 80, affineUV: false })
    return m
  }, [])

  const setView = useGameStore((s) => s.setView)
  const loadedAlbum = useGameStore((s) => s.loadedAlbum)
  const heldAlbum = useGameStore((s) => s.heldAlbum)
  const setLoadedAlbum = useGameStore((s) => s.setLoadedAlbum)
  const setHeldAlbum = useGameStore((s) => s.setHeldAlbum)

  const deckRef = useRef<THREE.Mesh>(null)
  const ampRef = useRef<THREE.Group>(null)

  useEffect(() => {
    const deck = deckRef.current
    if (!deck) return
    const label = heldAlbum
      ? 'Press E to place record'
      : loadedAlbum
        ? 'Press E to operate turntable'
        : 'Press E to operate turntable'

    interactions.register(deck.uuid, label, () => {
      if (heldAlbum) {
        setLoadedAlbum(heldAlbum)
        setHeldAlbum(null)
      }
      setView('turntable-top-down')
    })
    return () => interactions.unregister(deck.uuid)
  }, [heldAlbum, loadedAlbum])

  return (
    <group position={[3, 0, 0]}>
      {/* Console table */}
      <mesh position={[0, 0.81, 0]} material={tableMat}>
        <boxGeometry args={[1.2, 0.05, 0.65]} />
      </mesh>
      {/* Table legs */}
      {[[-0.52, 0, -0.27], [0.52, 0, -0.27], [-0.52, 0, 0.27], [0.52, 0, 0.27]].map(
        ([x, , z], i) => (
          <mesh key={i} position={[x, 0.405, z]} material={tableMat}>
            <boxGeometry args={[0.06, 0.81, 0.06]} />
          </mesh>
        ),
      )}
      {/* Lower shelf */}
      <mesh position={[0, 0.35, 0]} material={tableMat}>
        <boxGeometry args={[1.1, 0.03, 0.6]} />
      </mesh>

      {/* Turntable deck (plinth) */}
      <mesh ref={deckRef} position={[0, 0.875, 0]} material={deckMat}>
        <boxGeometry args={[0.55, 0.04, 0.55]} />
      </mesh>

      {/* Platter + tonearm group on top of deck */}
      <group position={[-0.05, 0.895, 0.02]}>
        <Platter />
        <Tonearm />
      </group>

      {/* Tube amp on lower shelf */}
      <group ref={ampRef} position={[0, 0.4, 0]}>
        <mesh>
          <boxGeometry args={[0.35, 0.2, 0.28]} />
          <meshLambertMaterial color="#1a1208" flatShading />
        </mesh>
        {/* Vacuum tubes */}
        {[-0.08, 0.08].map((x, i) => (
          <mesh key={i} position={[x, 0.14, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.1, 6]} />
            <meshBasicMaterial color="#ffeeaa" transparent opacity={0.7} />
          </mesh>
        ))}
      </group>

      {/* Small lamp on table */}
      <group position={[0.4, 0.84, 0]}>
        <mesh>
          <cylinderGeometry args={[0.015, 0.02, 0.25, 6]} />
          <meshLambertMaterial color="#2a1a08" flatShading />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <coneGeometry args={[0.12, 0.18, 6]} />
          <meshLambertMaterial color="#c8a030" flatShading />
        </mesh>
        <pointLight
          position={[0, 0.12, 0]}
          color="#ffbb44"
          intensity={25}
          distance={2}
          decay={2}
        />
      </group>

      {/* Leather chair */}
      <group position={[-1, 0, 0]}>
        {/* Seat */}
        <mesh position={[0, 0.48, 0]}>
          <boxGeometry args={[0.6, 0.12, 0.6]} />
          <meshLambertMaterial color="#3a1010" flatShading />
        </mesh>
        {/* Back */}
        <mesh position={[0, 0.9, -0.25]}>
          <boxGeometry args={[0.6, 0.7, 0.1]} />
          <meshLambertMaterial color="#3a1010" flatShading />
        </mesh>
        {/* Legs */}
        {[[-0.22, 0, -0.22], [0.22, 0, -0.22], [-0.22, 0, 0.22], [0.22, 0, 0.22]].map(
          ([x, , z], i) => (
            <mesh key={i} position={[x, 0.24, z]}>
              <boxGeometry args={[0.05, 0.48, 0.05]} />
              <meshLambertMaterial color="#2a1008" flatShading />
            </mesh>
          ),
        )}
      </group>
    </group>
  )
}
