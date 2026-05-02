'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { applyPS1Material } from '@/lib/shaders/ps1'
import { playSound } from '@/lib/audio/howlerSetup'

// Tonearm pivot is at back-right of the platter.
// Rest position: ~60° away from record. Play position: ~20° over record.
const REST_ANGLE = Math.PI * 0.38
const PLAY_ANGLE = Math.PI * 0.12
const LIFT_HEIGHT = 0.035

export default function Tonearm() {
  const tonearmState = useGameStore((s) => s.tonearmState)
  const setTonearmState = useGameStore((s) => s.setTonearmState)
  const loadedAlbum = useGameStore((s) => s.loadedAlbum)

  const groupRef = useRef<THREE.Group>(null)
  const currentAngleRef = useRef(REST_ANGLE)
  const currentHeightRef = useRef(LIFT_HEIGHT)

  const armMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ color: '#888880', flatShading: true })
    applyPS1Material(m, { snapStrength: 80, affineUV: false })
    return m
  }, [])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    let targetAngle = REST_ANGLE
    let targetHeight = LIFT_HEIGHT

    if (tonearmState === 'playing') {
      targetAngle = PLAY_ANGLE
      targetHeight = 0
    } else if (tonearmState === 'cued') {
      targetAngle = PLAY_ANGLE
      targetHeight = LIFT_HEIGHT
    }

    currentAngleRef.current = THREE.MathUtils.lerp(
      currentAngleRef.current,
      targetAngle,
      delta * 2,
    )
    currentHeightRef.current = THREE.MathUtils.lerp(
      currentHeightRef.current,
      targetHeight,
      delta * 2,
    )

    groupRef.current.rotation.y = currentAngleRef.current
    groupRef.current.position.y = 0.05 + currentHeightRef.current
  })

  function handleClick() {
    if (!loadedAlbum) return

    if (tonearmState === 'rest') {
      setTonearmState('cued')
      playSound('switchClick')
    } else if (tonearmState === 'cued') {
      setTonearmState('playing')
      playSound('needleDrop')
    } else if (tonearmState === 'playing') {
      setTonearmState('rest')
      playSound('needleLift')
    }
  }

  return (
    <group position={[0.2, 0, -0.18]}>
      {/* Pivot base */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.04, 8]} />
        <meshLambertMaterial color="#444444" flatShading />
      </mesh>

      {/* Rest post */}
      <mesh position={[0.12, 0.055, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.04, 5]} />
        <meshLambertMaterial color="#444444" flatShading />
      </mesh>

      {/* Arm group — rotates around pivot */}
      <group ref={groupRef} position={[0, 0.05, 0]}>
        {/* Main arm tube */}
        <mesh
          position={[-0.15, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          material={armMat}
          onClick={handleClick}
          onPointerEnter={() => { document.body.style.cursor = 'pointer' }}
          onPointerLeave={() => { document.body.style.cursor = 'none' }}
        >
          <cylinderGeometry args={[0.007, 0.007, 0.3, 6]} />
        </mesh>

        {/* Head shell */}
        <mesh
          position={[-0.31, 0, 0]}
          material={armMat}
          onClick={handleClick}
          onPointerEnter={() => { document.body.style.cursor = 'pointer' }}
          onPointerLeave={() => { document.body.style.cursor = 'none' }}
        >
          <boxGeometry args={[0.04, 0.012, 0.025]} />
        </mesh>

        {/* Stylus tip */}
        <mesh position={[-0.33, -0.01, 0]}>
          <cylinderGeometry args={[0.002, 0.001, 0.012, 4]} />
          <meshLambertMaterial color="#cccccc" flatShading />
        </mesh>
      </group>
    </group>
  )
}
