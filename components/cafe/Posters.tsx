'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

// Procedural "concert poster" texture: a rectangular block of warm yellow with
// pixel suggestions of a title bar and an illustration silhouette. No real
// text — too low-res to read anyway, the silhouette and aged tint sell it.
function makePosterTexture(seed: number): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 96
  const ctx = c.getContext('2d')!

  // Aged paper background — warm yellow with rough mottle
  ctx.fillStyle = ['#d4b070', '#c8a55c', '#dec080'][seed % 3]
  ctx.fillRect(0, 0, 64, 96)

  // Mottled aging
  for (let i = 0; i < 80; i++) {
    const x = (Math.sin(seed * 7 + i * 13) * 0.5 + 0.5) * 64
    const y = (Math.cos(seed * 11 + i * 7) * 0.5 + 0.5) * 96
    ctx.fillStyle = `rgba(80,40,20,${0.05 + (i % 5) * 0.02})`
    ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2)
  }

  // Header band — dark
  ctx.fillStyle = '#3a1810'
  ctx.fillRect(4, 6, 56, 12)

  // "Title" pixels — abstract, just suggesting words
  ctx.fillStyle = '#f0e0a0'
  for (let i = 0; i < 7; i++) {
    const w = 2 + (i + seed) % 4
    ctx.fillRect(6 + i * 7, 9, w, 6)
  }

  // Central illustration silhouette — varies by seed
  ctx.fillStyle = '#5a2818'
  if (seed % 3 === 0) {
    // Sax-ish silhouette
    ctx.fillRect(20, 30, 8, 30)
    ctx.fillRect(28, 50, 14, 8)
    ctx.fillRect(38, 35, 6, 18)
  } else if (seed % 3 === 1) {
    // Trumpet bell + tube
    ctx.fillRect(18, 40, 24, 6)
    ctx.fillRect(38, 36, 10, 14)
  } else {
    // Piano keys
    for (let i = 0; i < 9; i++) {
      ctx.fillRect(14 + i * 4, 36, 3, 24)
    }
    ctx.fillStyle = '#1a0a04'
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(16 + i * 6, 36, 2, 16)
    }
  }

  // Footer band — date / venue suggestion
  ctx.fillStyle = '#3a1810'
  ctx.fillRect(8, 78, 48, 8)
  ctx.fillStyle = '#d4b070'
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(11 + i * 9, 81, 4, 2)
  }

  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

interface PosterProps {
  position: [number, number, number]
  rotationY?: number
  rotationZ?: number  // small tilt for "imperfect alignment"
  width?: number
  height?: number
  seed: number
  facing?: 'right' | 'left' | 'forward' | 'back'
  frameColor?: string
}

function Poster({
  position,
  rotationY = 0,
  rotationZ = 0,
  width = 0.32,
  height = 0.46,
  seed,
  facing = 'right',
  frameColor = '#1a0a04',
}: PosterProps) {
  const tex = useMemo(() => makePosterTexture(seed), [seed])
  const yaw = facing === 'right' ? Math.PI / 2 : facing === 'left' ? -Math.PI / 2 : facing === 'forward' ? 0 : Math.PI
  return (
    <group position={position} rotation={[0, yaw + rotationY, rotationZ]}>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[width + 0.035, height + 0.035, 0.018]} />
        <meshLambertMaterial color={frameColor} flatShading />
      </mesh>
      {/* Poster face */}
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={tex} />
      </mesh>
    </group>
  )
}

// Four jazz/classical posters along the left wall — A2/A3-realistic sizes,
// mixed portrait + landscape, varied frame colors (black wood, natural wood,
// dark walnut). Small tilt offsets so they look hung by a person, not installed
// by a robot.
export default function Posters() {
  return (
    <>
      {/* Tall portrait — black frame */}
      <Poster
        position={[-3.91, 1.95, -2.8]}
        rotationZ={0.022}
        width={0.34} height={0.48}
        seed={0}
        facing="right"
        frameColor="#0e0604"
      />

      {/* Smaller portrait below+forward — natural wood frame */}
      <Poster
        position={[-3.91, 1.45, -1.7]}
        rotationZ={-0.018}
        width={0.26} height={0.36}
        seed={1}
        facing="right"
        frameColor="#7a4828"
      />

      {/* Landscape — dark walnut frame, set higher */}
      <Poster
        position={[-3.91, 2.05, -0.4]}
        rotationZ={0.014}
        width={0.46} height={0.30}
        seed={2}
        facing="right"
        frameColor="#3a2010"
      />

      {/* Small square-ish — natural wood, lower */}
      <Poster
        position={[-3.91, 1.55, 1.0]}
        rotationZ={-0.026}
        width={0.28} height={0.32}
        seed={3}
        facing="right"
        frameColor="#7a4828"
      />

      {/* Right wall fill — extra posters in the back portion of the room
          so the wall doesn't read as empty next to the Now Playing board. */}
      <Poster
        position={[3.91, 1.95, -3.7]}
        rotationZ={-0.020}
        width={0.34} height={0.46}
        seed={4}
        facing="left"
        frameColor="#0e0604"
      />
      <Poster
        position={[3.91, 1.50, -3.5]}
        rotationZ={0.018}
        width={0.26} height={0.30}
        seed={5}
        facing="left"
        frameColor="#7a4828"
      />
      <Poster
        position={[3.91, 1.95, -1.4]}
        rotationZ={0.014}
        width={0.42} height={0.30}
        seed={6}
        facing="left"
        frameColor="#3a2010"
      />
    </>
  )
}
