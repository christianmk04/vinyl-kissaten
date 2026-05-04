'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeRainSpriteSheet, applyPS1Material } from '@/lib/shaders/ps1'

const FRAME_COUNT = 8
const FRAME_H = 16 / 128

// Window opening is on the right wall (+x = 4), centered at z=0.5,
// width 2.5m, height 2m, sill at y=0.8, header at y=2.4.
// Beyond the window we build a small 3D night-time alley scene that the
// player can see through the rain. Everything is positioned in WORLD space
// to the +x side of the wall (x > 4) with normals pointing back toward
// the player (-x) so it's visible from inside.

// All exterior geometry is rotated 90° about Y so default-facing planes
// (whose normal is +z) end up facing -x — toward the player.
const FACE_PLAYER: [number, number, number] = [0, -Math.PI / 2, 0]

// Building silhouette across the alley. lit = which windows are warm.
function Building({
  position,
  size,
  windows,
}: {
  position: [number, number, number]
  size: [number, number, number]
  windows: { x: number; y: number; lit: boolean; color?: string }[]
}) {
  const [w, h, d] = size
  return (
    <group position={position}>
      {/* Wall facing player */}
      <mesh position={[-d / 2, 0, 0]} rotation={FACE_PLAYER}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color="#0d0c18" fog={false} />
      </mesh>
      {/* Roof line cap (slightly lighter so silhouette reads against sky) */}
      <mesh position={[-d / 2 - 0.001, h / 2 - 0.04, 0]} rotation={FACE_PLAYER}>
        <planeGeometry args={[w, 0.04]} />
        <meshBasicMaterial color="#1a1828" fog={false} />
      </mesh>
      {/* Windows — small bright rectangles, mostly warm with a few cool blues */}
      {windows.map((win, i) => (
        <mesh
          key={i}
          position={[-d / 2 - 0.002, win.y, win.x]}
          rotation={FACE_PLAYER}
        >
          <planeGeometry args={[0.18, 0.22]} />
          <meshBasicMaterial
            color={win.lit ? win.color || '#ffd066' : '#0a0810'}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// Old-style street lamp: post + lit head + soft halo + ground pool.
function StreetLamp({
  position,
  intensity = 1,
}: {
  position: [number, number, number]
  intensity?: number
}) {
  const haloRef = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (haloRef.current) {
      const t = clock.getElapsedTime()
      // Subtle gas-lamp flicker
      haloRef.current.opacity =
        intensity * (0.55 + Math.sin(t * 2.3) * 0.04 + Math.sin(t * 5.7) * 0.02)
    }
  })
  return (
    <group position={position}>
      {/* Post */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.025, 0.04, 2.0, 6]} />
        <meshBasicMaterial color="#0a0810" fog={false} />
      </mesh>
      {/* Cross arm */}
      <mesh position={[0, 1.95, 0]}>
        <boxGeometry args={[0.18, 0.04, 0.04]} />
        <meshBasicMaterial color="#0a0810" fog={false} />
      </mesh>
      {/* Lamp head housing */}
      <mesh position={[0, 1.78, 0]}>
        <boxGeometry args={[0.16, 0.18, 0.16]} />
        <meshBasicMaterial color="#1a1410" fog={false} />
      </mesh>
      {/* Bulb glow — bright core */}
      <mesh position={[0, 1.74, 0]}>
        <sphereGeometry args={[0.07, 6, 6]} />
        <meshBasicMaterial color="#ffe6a0" fog={false} />
      </mesh>
      {/* Halo billboard */}
      <mesh position={[0, 1.74, 0]} rotation={FACE_PLAYER}>
        <planeGeometry args={[0.55, 0.55]} />
        <meshBasicMaterial
          ref={haloRef}
          color="#ffc870"
          transparent
          opacity={0.55 * intensity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      {/* Wet pool of light on pavement */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.65, 16]} />
        <meshBasicMaterial
          color="#ffb060"
          transparent
          opacity={0.32 * intensity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  )
}

// Parked car silhouette with brake lights. Player sees the LEFT side of the
// car (since car is at +x looking at +z direction = car facing along +z).
// We rotate so the car's long axis runs along z (parallel to the curb).
function Car({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Lower body — long along z (parallel to the road) */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.7, 0.36, 1.6]} />
        <meshBasicMaterial color="#0a0810" fog={false} />
      </mesh>
      {/* Cabin — slightly narrower, set back toward +z */}
      <mesh position={[0, 0.46, -0.05]}>
        <boxGeometry args={[0.65, 0.22, 0.85]} />
        <meshBasicMaterial color="#0e0a14" fog={false} />
      </mesh>
      {/* Side window strip — faint blue reflection visible to player */}
      <mesh position={[-0.331, 0.46, -0.05]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.82, 0.2]} />
        <meshBasicMaterial color="#1a2638" fog={false} />
      </mesh>
      {/* Tail lights — facing -z (the back of the car) */}
      <mesh position={[0.18, 0.22, 0.78]}>
        <planeGeometry args={[0.16, 0.06]} />
        <meshBasicMaterial color="#ff3a28" fog={false} />
      </mesh>
      <mesh position={[-0.18, 0.22, 0.78]}>
        <planeGeometry args={[0.16, 0.06]} />
        <meshBasicMaterial color="#ff3a28" fog={false} />
      </mesh>
      {/* Tail-light glow halos — face the player */}
      <mesh position={[0.18, 0.22, 0.81]} rotation={FACE_PLAYER}>
        <planeGeometry args={[0.28, 0.16]} />
        <meshBasicMaterial
          color="#ff2818"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <mesh position={[-0.18, 0.22, 0.81]} rotation={FACE_PLAYER}>
        <planeGeometry args={[0.28, 0.16]} />
        <meshBasicMaterial
          color="#ff2818"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      {/* Wheels */}
      {[-0.55, 0.55].map((z) =>
        [-0.31, 0.31].map((x) => (
          <mesh key={`${x}-${z}`} position={[x, 0.1, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.1, 0.1, 0.06, 8]} />
            <meshBasicMaterial color="#050308" fog={false} />
          </mesh>
        )),
      )}
    </group>
  )
}

// Procedural building window layouts — keep them deterministic per building
// so they don't reshuffle on hot-reload but still look organic.
function buildingWindows(
  cols: number,
  rows: number,
  spacing: number,
  yStart: number,
  litChance: number,
  seed: number,
): { x: number; y: number; lit: boolean; color?: string }[] {
  const rng = (i: number) =>
    Math.abs(Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453) % 1
  const out: { x: number; y: number; lit: boolean; color?: string }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      const lit = rng(idx) < litChance
      const cool = rng(idx + 0.5) < 0.18
      out.push({
        x: (c - (cols - 1) / 2) * spacing,
        y: yStart + r * spacing * 1.1,
        lit,
        color: cool ? '#7ac0ff' : '#ffd066',
      })
    }
  }
  return out
}

export default function RainWindow() {
  const rainTex = useMemo(() => makeRainSpriteSheet(), [])

  const frameRef = useRef(0)
  const timeRef = useRef(0)

  const rainMat = useMemo(() => {
    rainTex.repeat.set(1, FRAME_H)
    rainTex.offset.set(0, 0)
    const mat = new THREE.MeshBasicMaterial({
      map: rainTex,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    applyPS1Material(mat, { snapStrength: 120 })
    return mat
  }, [rainTex])

  // Subtle wet-glass tint behind the rain — picks up the warm interior.
  const glassTintMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#1a2230',
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  )

  useFrame((_, delta) => {
    timeRef.current += delta
    if (timeRef.current > 1 / 12) {
      timeRef.current = 0
      frameRef.current = (frameRef.current + 1) % FRAME_COUNT
      rainTex.offset.set(0, 1 - (frameRef.current + 1) * FRAME_H)
      rainTex.needsUpdate = true
    }
  })

  // Pre-compute window layouts so they're stable.
  const buildingA = useMemo(
    () => buildingWindows(3, 6, 0.32, -0.4, 0.55, 1),
    [],
  )
  const buildingB = useMemo(
    () => buildingWindows(2, 4, 0.34, 0.2, 0.45, 7),
    [],
  )
  const buildingC = useMemo(
    () => buildingWindows(4, 7, 0.28, -0.6, 0.4, 13),
    [],
  )

  return (
    <>
      {/* ── EXTERIOR SCENE (world space, beyond the window) ─────────── */}

      {/* Night sky backdrop — dark blue-grey filling everything beyond */}
      <mesh position={[10.5, 2.0, 0.5]} rotation={FACE_PLAYER}>
        <planeGeometry args={[16, 8]} />
        <meshBasicMaterial color="#0a0d18" fog={false} />
      </mesh>

      {/* Distant city glow — warm horizon band */}
      <mesh position={[10.4, 1.4, 0.5]} rotation={FACE_PLAYER}>
        <planeGeometry args={[16, 0.6]} />
        <meshBasicMaterial
          color="#3a2818"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* Ground / wet street — runs perpendicular to window, lots of depth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7.5, 0.0, 0.5]}>
        <planeGeometry args={[7, 8]} />
        <meshBasicMaterial color="#0a0a12" fog={false} />
      </mesh>

      {/* Sidewalk — slightly lighter strip closer to the building */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5.0, 0.005, 0.5]}>
        <planeGeometry args={[0.9, 8]} />
        <meshBasicMaterial color="#15151c" fog={false} />
      </mesh>

      {/* Curb edge — thin lighter line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5.45, 0.008, 0.5]}>
        <planeGeometry args={[0.04, 8]} />
        <meshBasicMaterial color="#2a2a30" fog={false} />
      </mesh>

      {/* Road centerline dashes (further out, soft yellow) */}
      {[-3.0, -1.5, 0.0, 1.5, 3.0].map((zOff, i) => (
        <mesh
          key={`dash-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[8.0, 0.012, 0.5 + zOff]}
        >
          <planeGeometry args={[0.5, 0.12]} />
          <meshBasicMaterial color="#5a4220" fog={false} />
        </mesh>
      ))}

      {/* Wet reflection puddles on street — additive warm smears */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.5, 0.01, -1.2]}>
        <circleGeometry args={[0.55, 16]} />
        <meshBasicMaterial
          color="#5a3818"
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7.2, 0.01, 1.8]}>
        <circleGeometry args={[0.7, 16]} />
        <meshBasicMaterial
          color="#3a2848"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* === BUILDINGS across the street (mid-distance) === */}
      <Building
        position={[9.5, 1.7, -2.2]}
        size={[3.0, 3.4, 0.5]}
        windows={buildingA}
      />
      <Building
        position={[9.5, 1.4, 0.8]}
        size={[2.4, 2.8, 0.5]}
        windows={buildingB}
      />
      <Building
        position={[9.7, 2.2, 3.4]}
        size={[3.5, 4.4, 0.5]}
        windows={buildingC}
      />

      {/* Far skyline — very dark silhouettes for layered depth */}
      <Building
        position={[10.2, 2.6, -4.5]}
        size={[2.5, 5.2, 0.4]}
        windows={[
          { x: -0.6, y: -1.0, lit: true, color: '#7ac0ff' },
          { x: 0.4, y: 0.5, lit: true, color: '#ffd066' },
          { x: -0.2, y: 1.6, lit: true, color: '#ffd066' },
        ]}
      />

      {/* === STREET LAMPS on the sidewalk (curb at x=5.45) === */}
      <StreetLamp position={[5.15, 0, -1.4]} intensity={1.0} />
      <StreetLamp position={[5.15, 0, 2.6]} intensity={0.95} />

      {/* === Parked car at the curb (visible through lower window) === */}
      <Car position={[6.0, 0, 0.6]} />

      {/* Neon shop sign across the street — small accent */}
      <mesh position={[9.45, 0.85, 1.6]} rotation={FACE_PLAYER}>
        <planeGeometry args={[0.55, 0.16]} />
        <meshBasicMaterial color="#ff3060" fog={false} />
      </mesh>
      <mesh position={[9.42, 0.85, 1.6]} rotation={FACE_PLAYER}>
        <planeGeometry args={[0.85, 0.36]} />
        <meshBasicMaterial
          color="#ff2860"
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* ── INTERIOR WINDOW PIECES (world space, on the wall) ────────── */}
      {/* Window opening is z=[-0.75, 1.75] (2.5m wide), y=[0.8, 2.4] (1.6m tall),
          centered at z=0.5, y=1.6. */}
      <group position={[4, 1.6, 0.5]}>
        {/* Subtle wet-glass tint — sits just outside the rain pane */}
        <mesh rotation={[0, -Math.PI / 2, 0]} position={[0.002, 0, 0]}>
          <planeGeometry args={[2.5, 1.6]} />
          <primitive object={glassTintMat} attach="material" />
        </mesh>
        {/* Rain pane — facing the player */}
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[2.5, 1.6]} />
          <primitive object={rainMat} attach="material" />
        </mesh>
        {/* Window mullions — thin cross dividing the pane into 4 lights.
            These are slim strips, NOT a solid panel, so the view stays open. */}
        {/* Vertical mullion */}
        <mesh position={[-0.01, 0, 0]}>
          <boxGeometry args={[0.04, 1.6, 0.05]} />
          <meshLambertMaterial color="#1e0e04" flatShading />
        </mesh>
        {/* Horizontal mullion */}
        <mesh position={[-0.01, 0, 0]}>
          <boxGeometry args={[0.04, 0.05, 2.5]} />
          <meshLambertMaterial color="#1e0e04" flatShading />
        </mesh>
        {/* Inner frame trim — slim wood strips around the opening */}
        <mesh position={[-0.01, 0.78, 0]}>
          <boxGeometry args={[0.05, 0.04, 2.5]} />
          <meshLambertMaterial color="#3a1c08" flatShading />
        </mesh>
        <mesh position={[-0.01, -0.78, 0]}>
          <boxGeometry args={[0.05, 0.04, 2.5]} />
          <meshLambertMaterial color="#3a1c08" flatShading />
        </mesh>
        <mesh position={[-0.01, 0, 1.23]}>
          <boxGeometry args={[0.05, 1.6, 0.04]} />
          <meshLambertMaterial color="#3a1c08" flatShading />
        </mesh>
        <mesh position={[-0.01, 0, -1.23]}>
          <boxGeometry args={[0.05, 1.6, 0.04]} />
          <meshLambertMaterial color="#3a1c08" flatShading />
        </mesh>
      </group>
    </>
  )
}
