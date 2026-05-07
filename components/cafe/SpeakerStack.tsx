'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { applyPS1Material, makeWoodTexture } from '@/lib/shaders/ps1'

// Two tall speakers FLANKING the bar counter (not behind it — the counter
// would block them) plus a wall-mounted equipment rack above the counter.
// Sells the room as a music venue and fills the previously-bare front wall.

// One driver (tweeter or woofer). Built from concentric rings and discs in
// `MeshBasicMaterial` so they stay at full brightness regardless of the
// cafe's dim lighting — the previous Lambert version dimmed cone colors
// into the same value as the cabinet, which is why the speakers read as
// flat wooden blocks. Each layer is z-separated by 5–10 mm to comfortably
// resolve under the PS1 nearest-neighbor pipeline at viewing distance.
// Z-stack note: the cabinet uses PS1 vertex snap (snapStrength=160 → step
// ~6.25 mm), so its front face wanders ±3 mm frame-to-frame. Everything on
// the baffle has to sit at least 10 mm in front of the cabinet front face
// (z=0.21) or it'll get punched through in patches as the snap shifts.
// Driver layers themselves use plain MeshBasicMaterial with no snap, so 2 mm
// between layers is plenty.
function SpeakerDriver({
  y,
  radius,
  coneColor,
  dustCapColor = '#f4e4b8',
  ridges = false,
}: {
  y: number
  radius: number
  coneColor: string
  dustCapColor?: string
  ridges?: boolean
}) {
  const R = radius
  return (
    <>
      {/* Brass mounting ring (outer band, ~15% of radius wide) */}
      <mesh position={[0, y, 0.228]}>
        <ringGeometry args={[R * 0.85, R, 28]} />
        <meshBasicMaterial color="#c89858" />
      </mesh>
      {/* Bolt heads on the brass ring — four small dark dots at the cardinal
          points to sell "this is a real driver bolted to the baffle" */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a, i) => (
        <mesh
          key={i}
          position={[Math.cos(a) * R * 0.925, y + Math.sin(a) * R * 0.925, 0.230]}
        >
          <circleGeometry args={[R * 0.04, 8]} />
          <meshBasicMaterial color="#1a1208" />
        </mesh>
      ))}
      {/* Black rubber surround */}
      <mesh position={[0, y, 0.232]}>
        <ringGeometry args={[R * 0.70, R * 0.85, 28]} />
        <meshBasicMaterial color="#0a0604" />
      </mesh>
      {/* Cone — bright paper that reads from across the room */}
      <mesh position={[0, y, 0.236]}>
        <circleGeometry args={[R * 0.70, 28]} />
        <meshBasicMaterial color={coneColor} />
      </mesh>
      {/* Concentric ridges on the cone (woofer-style detail) */}
      {ridges && (
        <>
          <mesh position={[0, y, 0.239]}>
            <ringGeometry args={[R * 0.55, R * 0.59, 28]} />
            <meshBasicMaterial color="#3a1f0a" />
          </mesh>
          <mesh position={[0, y, 0.239]}>
            <ringGeometry args={[R * 0.40, R * 0.44, 28]} />
            <meshBasicMaterial color="#3a1f0a" />
          </mesh>
        </>
      )}
      {/* Dark ring just outside the dust cap — the cone's inner shadow */}
      <mesh position={[0, y, 0.242]}>
        <ringGeometry args={[R * 0.30, R * 0.34, 24]} />
        <meshBasicMaterial color="#2a1408" />
      </mesh>
      {/* Dust cap — bright "eye" the brain reads as a speaker focal point */}
      <mesh position={[0, y, 0.245]}>
        <circleGeometry args={[R * 0.30, 18]} />
        <meshBasicMaterial color={dustCapColor} />
      </mesh>
      {/* Specular highlight pip on the dust cap (sells the convex form) */}
      <mesh position={[-R * 0.10, y + R * 0.10, 0.248]}>
        <circleGeometry args={[R * 0.09, 12]} />
        <meshBasicMaterial color="#fff5d8" />
      </mesh>
    </>
  )
}

// Hi-fi floor speaker. Bookshelf-style two-way (tweeter + woofer) with
// brass driver rings, bright cones, and a real wood-grain cabinet so the
// box doesn't read as a uniform dark block. The vertical dimension is
// chunky (1.55m) — these are floor-standing — but the front-baffle detail
// is what makes it read as a speaker and not furniture.
function Speaker({ position }: { position: [number, number, number] }) {
  // Wood texture for the cabinet — gives the side panels a visible grain
  // even in dim lighting (vs. the previous flat dark color which looked
  // like a painted box).
  const woodTex = useMemo(() => {
    const t = makeWoodTexture()
    t.repeat.set(0.6, 1.4)
    return t
  }, [])
  const cabinetMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({
      map: woodTex,
      color: '#3a2010',
      flatShading: true,
    })
    applyPS1Material(m, { snapStrength: 160 })
    return m
  }, [woodTex])

  return (
    <group position={position}>
      {/* Cabinet body — wood grain walnut */}
      <mesh material={cabinetMat}>
        <boxGeometry args={[0.58, 1.55, 0.42]} />
      </mesh>

      {/* Front baffle — sits 15mm in front of the cabinet front face (z=0.21).
          That gap is bigger than the PS1 vertex-snap step (~6.25mm) so the
          cabinet's snapped vertices can never punch through the baffle. */}
      <mesh position={[0, 0, 0.225]}>
        <planeGeometry args={[0.52, 1.5]} />
        <meshBasicMaterial color="#1a100a" />
      </mesh>
      {/* Baffle frame highlight — top */}
      <mesh position={[0, 0.745, 0.226]}>
        <planeGeometry args={[0.52, 0.014]} />
        <meshBasicMaterial color="#7a5028" />
      </mesh>
      {/* Baffle frame highlight — bottom */}
      <mesh position={[0, -0.745, 0.226]}>
        <planeGeometry args={[0.52, 0.014]} />
        <meshBasicMaterial color="#7a5028" />
      </mesh>

      {/* ── TWEETER (top, small dome) ─────────────────────────────── */}
      <SpeakerDriver
        y={0.50}
        radius={0.10}
        coneColor="#b89060"
        dustCapColor="#e8d090"
      />

      {/* ── WOOFER (bottom, large with ridges) ────────────────────── */}
      <SpeakerDriver
        y={-0.20}
        radius={0.22}
        coneColor="#d8b078"
        dustCapColor="#f4dca8"
        ridges
      />

      {/* ── BASS REFLEX PORT (round hole below the woofer) ──────── */}
      <mesh position={[0, -0.55, 0.227]}>
        <ringGeometry args={[0.034, 0.042, 18]} />
        <meshBasicMaterial color="#5a3a18" />
      </mesh>
      <mesh position={[0, -0.55, 0.228]}>
        <circleGeometry args={[0.034, 18]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* ── BADGE & LED ──────────────────────────────────────────── */}
      {/* Logo plate (brass) */}
      <mesh position={[-0.12, -0.68, 0.227]}>
        <planeGeometry args={[0.14, 0.05]} />
        <meshBasicMaterial color="#d8a060" />
      </mesh>
      <mesh position={[-0.12, -0.68, 0.228]}>
        <planeGeometry args={[0.10, 0.010]} />
        <meshBasicMaterial color="#2a1808" />
      </mesh>
      {/* Power LED — bright green so it reads as "powered on" */}
      <mesh position={[0.20, -0.68, 0.227]}>
        <ringGeometry args={[0.012, 0.018, 12]} />
        <meshBasicMaterial color="#5a3a18" />
      </mesh>
      <mesh position={[0.20, -0.68, 0.228]}>
        <circleGeometry args={[0.012, 12]} />
        <meshBasicMaterial color="#7aff80" />
      </mesh>

      {/* Top cap chamfer — small lighter strip on top sells the cabinet form.
          Sits 10mm above the cabinet's top face (y=0.775) so the cabinet's
          PS1-snapped top face can't pop above it from certain angles. */}
      <mesh position={[0, 0.785, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.58, 0.42]} />
        <meshLambertMaterial color="#4a2a14" flatShading />
      </mesh>
    </group>
  )
}

function AmpRack() {
  const ledRef = useRef<THREE.MeshBasicMaterial>(null)
  const vuRef = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ledRef.current) ledRef.current.opacity = 0.7 + Math.sin(t * 0.8) * 0.2
    // Subtle VU meter shimmer — fakes signal coming through
    if (vuRef.current) vuRef.current.opacity = 0.45 + Math.sin(t * 3.2) * 0.15 + Math.cos(t * 1.7) * 0.08
  })

  return (
    <group>
      {/* === RECEIVER (top, brushed metal feel) === */}
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[1.15, 0.16, 0.32]} />
        <meshLambertMaterial color="#2a241e" flatShading />
      </mesh>
      {/* Faceplate trim */}
      <mesh position={[0, 0.32, 0.161]}>
        <planeGeometry args={[1.13, 0.14]} />
        <meshLambertMaterial color="#3a342c" flatShading />
      </mesh>
      {/* VU meter — wide horizontal amber bar */}
      <mesh position={[0, 0.34, 0.166]}>
        <planeGeometry args={[0.40, 0.08]} />
        <meshBasicMaterial color="#1a0a00" />
      </mesh>
      <mesh position={[0, 0.34, 0.167]}>
        <planeGeometry args={[0.36, 0.05]} />
        <meshBasicMaterial ref={vuRef} color="#ffaa44" transparent opacity={0.5} />
      </mesh>
      {/* Tuning dial — cylinder lying on its side */}
      <mesh position={[-0.40, 0.34, 0.165]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.038, 0.038, 0.018, 12]} />
        <meshLambertMaterial color="#5a4838" flatShading />
      </mesh>
      {/* Volume knob */}
      <mesh position={[0.40, 0.34, 0.165]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.018, 12]} />
        <meshLambertMaterial color="#5a4838" flatShading />
      </mesh>
      {/* Knob highlight notch */}
      <mesh position={[0.40, 0.355, 0.176]}>
        <planeGeometry args={[0.006, 0.022]} />
        <meshBasicMaterial color="#e0c890" />
      </mesh>
      {/* Power LED — pulsing */}
      <mesh position={[-0.53, 0.385, 0.167]}>
        <planeGeometry args={[0.018, 0.014]} />
        <meshBasicMaterial ref={ledRef} color="#ff4422" transparent opacity={0.85} />
      </mesh>
      {/* Small button row */}
      {[-0.18, -0.12, -0.06].map((x, i) => (
        <mesh key={i} position={[x, 0.30, 0.166]}>
          <planeGeometry args={[0.022, 0.014]} />
          <meshLambertMaterial color="#5a4838" flatShading />
        </mesh>
      ))}

      {/* === AMP (middle) === */}
      <mesh position={[0, 0.13, 0]}>
        <boxGeometry args={[1.15, 0.20, 0.32]} />
        <meshLambertMaterial color="#1a1410" flatShading />
      </mesh>
      <mesh position={[0, 0.13, 0.161]}>
        <planeGeometry args={[1.13, 0.18]} />
        <meshLambertMaterial color="#241e18" flatShading />
      </mesh>
      {/* Big knob L */}
      <mesh position={[-0.42, 0.13, 0.165]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.022, 12]} />
        <meshLambertMaterial color="#6a5040" flatShading />
      </mesh>
      <mesh position={[-0.42, 0.155, 0.178]}>
        <planeGeometry args={[0.006, 0.025]} />
        <meshBasicMaterial color="#e8d5a0" />
      </mesh>
      {/* Big knob R */}
      <mesh position={[0.42, 0.13, 0.165]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.022, 12]} />
        <meshLambertMaterial color="#6a5040" flatShading />
      </mesh>
      <mesh position={[0.42, 0.105, 0.178]}>
        <planeGeometry args={[0.006, 0.025]} />
        <meshBasicMaterial color="#e8d5a0" />
      </mesh>
      {/* Small knob row */}
      {[-0.20, -0.10, 0.00, 0.10, 0.20].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.16, 0.165]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.014, 8]} />
            <meshLambertMaterial color="#5a4030" flatShading />
          </mesh>
          {/* Indicator dot */}
          <mesh position={[x, 0.16, 0.176]}>
            <planeGeometry args={[0.005, 0.005]} />
            <meshBasicMaterial color="#ffd060" />
          </mesh>
        </group>
      ))}
      {/* Status LEDs row — bright so they read */}
      {[
        { x: -0.30, c: '#ffaa44' },
        { x: -0.20, c: '#5aff70' },
        { x: -0.10, c: '#5aff70' },
        { x: 0.00, c: '#ffd060' },
        { x: 0.10, c: '#ff4422' },
      ].map((led, i) => (
        <mesh key={i} position={[led.x, 0.06, 0.166]}>
          <planeGeometry args={[0.012, 0.012]} />
          <meshBasicMaterial color={led.c} />
        </mesh>
      ))}
      {/* Channel labels (rectangles suggesting text) */}
      {[-0.30, -0.20, -0.10, 0.00, 0.10].map((x, i) => (
        <mesh key={i} position={[x, 0.04, 0.166]}>
          <planeGeometry args={[0.014, 0.005]} />
          <meshBasicMaterial color="#3a2818" />
        </mesh>
      ))}

      {/* === EQ / phono unit (bottom) === */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[1.15, 0.13, 0.32]} />
        <meshLambertMaterial color="#1a1410" flatShading />
      </mesh>
      <mesh position={[0, -0.05, 0.161]}>
        <planeGeometry args={[1.13, 0.11]} />
        <meshLambertMaterial color="#241e18" flatShading />
      </mesh>
      {/* EQ slider sliders */}
      {[-0.42, -0.30, -0.18, -0.06, 0.06, 0.18, 0.30, 0.42].map((x, i) => (
        <group key={i}>
          {/* Slot */}
          <mesh position={[x, -0.05, 0.165]}>
            <planeGeometry args={[0.012, 0.075]} />
            <meshBasicMaterial color="#0a0604" />
          </mesh>
          {/* Slider knob — varies position to simulate EQ curve */}
          <mesh position={[x, -0.05 + Math.sin(i * 0.9) * 0.022, 0.167]}>
            <planeGeometry args={[0.022, 0.012]} />
            <meshBasicMaterial color="#aa8060" />
          </mesh>
        </group>
      ))}

      {/* === Wood-effect equipment shelf the rack sits on === */}
      <mesh position={[0, -0.13, 0]}>
        <boxGeometry args={[1.30, 0.025, 0.36]} />
        <meshLambertMaterial color="#3a2010" flatShading />
      </mesh>
    </group>
  )
}

function FramedAlbum({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.42, 0.42, 0.025]} />
        <meshLambertMaterial color="#1a0a04" flatShading />
      </mesh>
      <mesh position={[0, 0, 0.014]}>
        <planeGeometry args={[0.36, 0.36]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

// Bar counter: world position [-0.5, 0, 4.25], body x ∈ [-2.2, 1.2].
// Speakers go OUTSIDE that x-range so the counter doesn't block them.
// Front wall at z=5 — speakers at z≈4.7 against the wall.
// Equipment rack mounted on the wall above the counter (y=2.0).
export default function SpeakerStack() {
  return (
    <>
      {/* Floor speakers flanking the counter. Rotated 180° around Y so the
          drivers face -Z (into the room). The Speaker component is built
          with its baffle on the +Z side; without this rotation the
          drivers end up on the wall-facing side and the player only sees
          the speaker's blank back panel. */}
      <group position={[-2.85, 0.78, 4.72]} rotation={[0, Math.PI, 0]}>
        <Speaker position={[0, 0, 0]} />
      </group>
      <group position={[1.85, 0.78, 4.72]} rotation={[0, Math.PI, 0]}>
        <Speaker position={[0, 0, 0]} />
      </group>

      {/* Wall-mounted equipment rack — positioned above counter, on front wall.
          Rotated 180° to face -Z (toward player), since front wall normals are +Z. */}
      <group position={[-0.5, 1.85, 4.93]} rotation={[0, Math.PI, 0]}>
        <AmpRack />
      </group>

      {/* Framed albums flanking the rack to fill the wall */}
      <group position={[-0.5, 2.40, 4.94]} rotation={[0, Math.PI, 0]}>
        <FramedAlbum position={[-0.85, 0, 0]} color="#7a4828" />
        <FramedAlbum position={[0.85, 0, 0]} color="#3a5060" />
      </group>
    </>
  )
}
