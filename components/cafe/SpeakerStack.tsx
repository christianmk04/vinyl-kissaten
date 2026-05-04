'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Two tall speakers FLANKING the bar counter (not behind it — the counter
// would block them) plus a wall-mounted equipment rack above the counter.
// Sells the room as a music venue and fills the previously-bare front wall.

// Hi-fi floor speaker. Reads as a speaker from across the room because:
//   - cones are MUCH lighter than the cabinet (high contrast silhouette)
//   - each driver has a brass/metal rim that catches the warm light
//   - the woofer cone has visible concentric ridges suggesting paper cone
//   - bright dust caps in the centers act as focal "eyes" the brain reads
//     instantly as speakers
function Speaker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Cabinet body — dark walnut */}
      <mesh>
        <boxGeometry args={[0.58, 1.55, 0.42]} />
        <meshLambertMaterial color="#2a1608" flatShading />
      </mesh>
      {/* Front baffle — slightly recessed black panel */}
      <mesh position={[0, 0, 0.215]}>
        <planeGeometry args={[0.52, 1.5]} />
        <meshLambertMaterial color="#1a0c06" flatShading />
      </mesh>
      {/* Inner baffle highlight (top edge) — sells the recessed-baffle look */}
      <mesh position={[0, 0.745, 0.216]}>
        <planeGeometry args={[0.52, 0.012]} />
        <meshBasicMaterial color="#5a3820" />
      </mesh>

      {/* ── TWEETER (top) ─────────────────────────────────────────── */}
      {/* Brass mounting ring */}
      <mesh position={[0, 0.55, 0.220]}>
        <ringGeometry args={[0.075, 0.105, 16]} />
        <meshLambertMaterial color="#a07840" flatShading />
      </mesh>
      {/* Black surround */}
      <mesh position={[0, 0.55, 0.222]}>
        <circleGeometry args={[0.078, 16]} />
        <meshLambertMaterial color="#1a1208" flatShading />
      </mesh>
      {/* Silk dome */}
      <mesh position={[0, 0.55, 0.225]}>
        <circleGeometry args={[0.048, 16]} />
        <meshLambertMaterial color="#7a5a3a" flatShading />
      </mesh>
      {/* Highlight pip — sells the convex dome */}
      <mesh position={[-0.012, 0.564, 0.228]}>
        <circleGeometry args={[0.012, 8]} />
        <meshBasicMaterial color="#d8b070" />
      </mesh>

      {/* ── MID DRIVER ────────────────────────────────────────────── */}
      <mesh position={[0, 0.18, 0.220]}>
        <ringGeometry args={[0.155, 0.185, 18]} />
        <meshLambertMaterial color="#a07840" flatShading />
      </mesh>
      {/* Outer cone (paper) */}
      <mesh position={[0, 0.18, 0.222]}>
        <circleGeometry args={[0.158, 18]} />
        <meshLambertMaterial color="#9a6c42" flatShading />
      </mesh>
      {/* Inner cone shadow ring */}
      <mesh position={[0, 0.18, 0.225]}>
        <circleGeometry args={[0.108, 18]} />
        <meshLambertMaterial color="#3a2010" flatShading />
      </mesh>
      {/* Dust cap — bright bullet center */}
      <mesh position={[0, 0.18, 0.228]}>
        <circleGeometry args={[0.045, 12]} />
        <meshLambertMaterial color="#8a6438" flatShading />
      </mesh>
      <mesh position={[-0.012, 0.192, 0.230]}>
        <circleGeometry args={[0.014, 8]} />
        <meshBasicMaterial color="#d8a060" />
      </mesh>

      {/* ── WOOFER (large bottom driver) ──────────────────────────── */}
      {/* Brass mounting ring */}
      <mesh position={[0, -0.32, 0.220]}>
        <ringGeometry args={[0.215, 0.255, 24]} />
        <meshLambertMaterial color="#a07840" flatShading />
      </mesh>
      {/* Outer rubber surround (dark) */}
      <mesh position={[0, -0.32, 0.222]}>
        <circleGeometry args={[0.22, 24]} />
        <meshLambertMaterial color="#0a0604" flatShading />
      </mesh>
      {/* Outer cone — light paper */}
      <mesh position={[0, -0.32, 0.224]}>
        <circleGeometry args={[0.195, 24]} />
        <meshLambertMaterial color="#a07248" flatShading />
      </mesh>
      {/* Concentric ridges — paper cone texture */}
      <mesh position={[0, -0.32, 0.226]}>
        <ringGeometry args={[0.158, 0.165, 24]} />
        <meshLambertMaterial color="#5a3818" flatShading />
      </mesh>
      <mesh position={[0, -0.32, 0.226]}>
        <ringGeometry args={[0.118, 0.125, 24]} />
        <meshLambertMaterial color="#5a3818" flatShading />
      </mesh>
      {/* Inner cone shadow */}
      <mesh position={[0, -0.32, 0.227]}>
        <circleGeometry args={[0.082, 18]} />
        <meshLambertMaterial color="#3a2010" flatShading />
      </mesh>
      {/* Dust cap — bullet */}
      <mesh position={[0, -0.32, 0.230]}>
        <circleGeometry args={[0.06, 12]} />
        <meshLambertMaterial color="#8a6438" flatShading />
      </mesh>
      <mesh position={[-0.018, -0.302, 0.232]}>
        <circleGeometry args={[0.018, 8]} />
        <meshBasicMaterial color="#d8a060" />
      </mesh>

      {/* ── BADGE & LED ──────────────────────────────────────────── */}
      {/* Logo plate (brass) */}
      <mesh position={[0, -0.65, 0.221]}>
        <planeGeometry args={[0.16, 0.06]} />
        <meshBasicMaterial color="#d8a060" />
      </mesh>
      {/* Logo text dashes */}
      <mesh position={[0, -0.65, 0.222]}>
        <planeGeometry args={[0.10, 0.012]} />
        <meshBasicMaterial color="#3a2010" />
      </mesh>
      {/* Power LED */}
      <mesh position={[0.22, -0.65, 0.222]}>
        <planeGeometry args={[0.018, 0.018]} />
        <meshBasicMaterial color="#5aff70" />
      </mesh>

      {/* Top cap chamfer — small lighter strip on top sells the cabinet form */}
      <mesh position={[0, 0.776, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.58, 0.42]} />
        <meshLambertMaterial color="#3a2010" flatShading />
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
      {/* Floor speakers flanking the counter — visible from any angle */}
      <group position={[-2.85, 0.78, 4.72]}>
        <Speaker position={[0, 0, 0]} />
      </group>
      <group position={[1.85, 0.78, 4.72]}>
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
