'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { applyPS1Material, makeFaceTexture, makeColorTexture } from '@/lib/shaders/ps1'

interface PatronProps {
  position: [number, number, number]
  rotation?: number
  outfitColor: string
  item: 'newspaper' | 'cup' | 'none'
  offset?: number // phase offset for idle animation
}

export default function Patron({
  position,
  rotation = 0,
  outfitColor,
  item,
  offset = 0,
}: PatronProps) {
  const torsoRef = useRef<THREE.Mesh>(null)
  const armLRef = useRef<THREE.Mesh>(null)
  const armRRef = useRef<THREE.Mesh>(null)
  const itemRef = useRef<THREE.Mesh>(null)

  const faceTex = useMemo(() => makeFaceTexture(), [])
  const outfitTex = useMemo(() => makeColorTexture(outfitColor, 8, 8), [outfitColor])
  const skinTex = useMemo(() => makeColorTexture('#c8a878', 4, 4), [])

  const bodyMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ map: outfitTex, flatShading: true })
    applyPS1Material(m, { snapStrength: 80 })
    return m
  }, [outfitTex])

  const headMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ map: faceTex, flatShading: true })
    applyPS1Material(m, { snapStrength: 80 })
    return m
  }, [faceTex])

  const armMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ map: outfitTex, flatShading: true })
    applyPS1Material(m, { snapStrength: 80 })
    return m
  }, [outfitTex])

  const cupraisedRef = useRef(false)
  const cupTimer = useRef(Math.random() * 8)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + offset

    // Slow torso sway
    if (torsoRef.current) {
      torsoRef.current.rotation.y = Math.sin(t * 0.5) * 0.03
    }

    // Cup-raise animation
    if (item === 'cup' && armRRef.current) {
      cupTimer.current -= 0.016
      if (cupTimer.current < 0) {
        cupraisedRef.current = !cupraisedRef.current
        cupTimer.current = cupraisedRef.current ? 2 : 5 + Math.random() * 5
      }
      const targetAngle = cupraisedRef.current ? -1.2 : -0.3
      armRRef.current.rotation.x = THREE.MathUtils.lerp(
        armRRef.current.rotation.x,
        targetAngle,
        0.08,
      )
    }

    // Newspaper rustle
    if (item === 'newspaper' && itemRef.current) {
      itemRef.current.rotation.z = Math.sin(t * 2.3) * 0.02
    }
  })

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Torso */}
      <mesh ref={torsoRef} position={[0, 1.1, 0]} material={bodyMat}>
        <boxGeometry args={[0.4, 0.55, 0.25]} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.55, 0]} material={headMat}>
        <boxGeometry args={[0.28, 0.28, 0.28]} />
      </mesh>

      {/* Left arm */}
      <mesh ref={armLRef} position={[-0.27, 1.1, 0]} rotation={[0.3, 0, 0.2]} material={armMat}>
        <cylinderGeometry args={[0.055, 0.055, 0.45, 5]} />
      </mesh>

      {/* Right arm */}
      <mesh ref={armRRef} position={[0.27, 1.1, 0]} rotation={[-0.3, 0, -0.2]} material={armMat}>
        <cylinderGeometry args={[0.055, 0.055, 0.45, 5]} />
      </mesh>

      {/* Item */}
      {item === 'cup' && (
        <mesh ref={itemRef} position={[0.38, 0.9, 0.1]}>
          <cylinderGeometry args={[0.04, 0.035, 0.08, 5]} />
          <meshLambertMaterial color="#e8d5a8" flatShading />
        </mesh>
      )}
      {item === 'newspaper' && (
        <mesh ref={itemRef} position={[0, 1.1, 0.18]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.3, 0.25, 0.01]} />
          <meshLambertMaterial color="#d4c8a0" flatShading />
        </mesh>
      )}
    </group>
  )
}
