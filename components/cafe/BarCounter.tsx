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

        {/* Espresso machine — sits ON the counter top (group origin is the
            machine center; box height 0.40 means y must be counter top
            (1.09) + 0.20 = 1.29 so the bottom flushes with the counter).
            Faces -z (into the room) so the player sees the group head and
            portafilter from the seating side. */}
        <EspressoMachine position={[0.8, 1.29, 0]} steamRef={steamRef} steamPositions={steamPositions} />

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

// ── Espresso machine ──────────────────────────────────────────────────────
// Designed to read clearly even under the PS1 pipeline at counter distance:
//   • Polished steel body with brighter front faceplate so it pops against
//     the dark counter trim
//   • Cup-warmer top tray + a row of inverted demitasse cups
//   • A single round group head with portafilter handle protruding toward
//     the seating side (-z), the most recognizable espresso silhouette
//   • Steam wand on the right with the existing animated steam particles
//   • Round pressure gauge dial on the front faceplate
//   • Drip tray beneath the group head
// Local axes: the machine is centered at the group origin. -z faces the
// room (where the player stands), +z faces the barista behind the counter.
function EspressoMachine({
  position,
  steamRef,
  steamPositions,
}: {
  position: [number, number, number]
  steamRef: React.RefObject<THREE.Points | null>
  steamPositions: Float32Array
}) {
  return (
    <group position={position}>
      {/* === MAIN BODY (polished steel) === */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.50, 0.40, 0.36]} />
        <meshLambertMaterial color="#a8a4a0" flatShading />
      </mesh>
      {/* Faceplate (slightly brighter, sits 1cm in front of body) */}
      <mesh position={[0, 0.02, -0.181]}>
        <planeGeometry args={[0.46, 0.32]} />
        <meshBasicMaterial color="#d8d4cc" />
      </mesh>
      {/* Thin black trim around faceplate to outline it */}
      <mesh position={[0, 0.02, -0.180]}>
        <planeGeometry args={[0.48, 0.34]} />
        <meshBasicMaterial color="#1a1410" />
      </mesh>

      {/* === CUP WARMER TOP TRAY (raised lip + inverted demitasse cups) === */}
      <mesh position={[0, 0.215, 0]}>
        <boxGeometry args={[0.46, 0.03, 0.32]} />
        <meshLambertMaterial color="#3a3430" flatShading />
      </mesh>
      {/* Stack of two rows of cups, white porcelain */}
      {[-0.15, -0.05, 0.05, 0.15].map((cx) =>
        [-0.06, 0.06].map((cz) => (
          <mesh key={`${cx}-${cz}`} position={[cx, 0.245, cz]}>
            <cylinderGeometry args={[0.025, 0.022, 0.025, 8]} />
            <meshLambertMaterial color="#f0e8d8" flatShading />
          </mesh>
        )),
      )}

      {/* === GROUP HEAD (front, facing -z) === */}
      {/* Chrome ring */}
      <mesh position={[-0.10, -0.06, -0.181]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.04, 16]} />
        <meshLambertMaterial color="#e8e4dc" flatShading />
      </mesh>
      {/* Inner dark recess */}
      <mesh position={[-0.10, -0.06, -0.20]}>
        <circleGeometry args={[0.038, 16]} />
        <meshBasicMaterial color="#0a0604" />
      </mesh>
      {/* Portafilter handle — horizontal, sticking forward into the room */}
      <mesh position={[-0.10, -0.07, -0.26]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.13, 8]} />
        <meshLambertMaterial color="#3a2008" flatShading />
      </mesh>
      {/* Portafilter "head" — small disc where the basket attaches */}
      <mesh position={[-0.10, -0.07, -0.215]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.034, 0.034, 0.025, 12]} />
        <meshLambertMaterial color="#cccac4" flatShading />
      </mesh>
      {/* Wooden grip cap on the end of the portafilter */}
      <mesh position={[-0.10, -0.07, -0.33]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.018, 0.04, 8]} />
        <meshLambertMaterial color="#5a2a10" flatShading />
      </mesh>

      {/* === PRESSURE GAUGE (round dial, front-right of faceplate) === */}
      <mesh position={[0.12, 0.04, -0.182]}>
        <ringGeometry args={[0.038, 0.046, 18]} />
        <meshBasicMaterial color="#1a1410" />
      </mesh>
      <mesh position={[0.12, 0.04, -0.183]}>
        <circleGeometry args={[0.038, 18]} />
        <meshBasicMaterial color="#f0eadc" />
      </mesh>
      {/* Gauge needle */}
      <mesh position={[0.12, 0.045, -0.184]} rotation={[0, 0, -0.6]}>
        <planeGeometry args={[0.004, 0.030]} />
        <meshBasicMaterial color="#aa1a1a" />
      </mesh>
      {/* Tick marks at the cardinal positions */}
      {[
        { a: -1.2, c: '#1a1410' },
        { a: -0.6, c: '#1a1410' },
        { a: 0, c: '#1a1410' },
        { a: 0.6, c: '#1a1410' },
        { a: 1.2, c: '#aa1a1a' },
      ].map((tk, i) => (
        <mesh
          key={i}
          position={[
            0.12 + Math.sin(tk.a) * 0.030,
            0.04 + Math.cos(tk.a) * 0.030,
            -0.184,
          ]}
          rotation={[0, 0, tk.a]}
        >
          <planeGeometry args={[0.003, 0.006]} />
          <meshBasicMaterial color={tk.c} />
        </mesh>
      ))}

      {/* === BREW BUTTONS (small row beneath the gauge) === */}
      {[-0.04, 0.04, 0.12].map((bx, i) => (
        <mesh key={i} position={[bx + 0.04, -0.06, -0.184]}>
          <circleGeometry args={[0.014, 12]} />
          <meshBasicMaterial color={i === 1 ? '#5aff80' : '#444038'} />
        </mesh>
      ))}

      {/* === STEAM WAND === */}
      {/* Pivot block on the right side of the body */}
      <mesh position={[0.225, 0.04, -0.10]}>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshLambertMaterial color="#3a3430" flatShading />
      </mesh>
      {/* Wand pipe — angles outward and downward */}
      <mesh position={[0.30, -0.04, -0.10]} rotation={[0, 0, Math.PI / 2 + 0.5]}>
        <cylinderGeometry args={[0.009, 0.009, 0.22, 8]} />
        <meshLambertMaterial color="#d8d4cc" flatShading />
      </mesh>
      {/* Wand tip */}
      <mesh position={[0.36, -0.13, -0.10]}>
        <cylinderGeometry args={[0.012, 0.008, 0.025, 8]} />
        <meshLambertMaterial color="#b8b4ac" flatShading />
      </mesh>

      {/* === DRIP TRAY (slotted grate beneath the group head) === */}
      <mesh position={[-0.10, -0.18, -0.16]}>
        <boxGeometry args={[0.18, 0.02, 0.06]} />
        <meshLambertMaterial color="#2a2420" flatShading />
      </mesh>
      {/* Grate slots — three thin dark lines suggesting drainage */}
      {[-0.05, 0, 0.05].map((sx, i) => (
        <mesh key={i} position={[-0.10 + sx, -0.169, -0.16]}>
          <planeGeometry args={[0.004, 0.05]} />
          <meshBasicMaterial color="#0a0604" />
        </mesh>
      ))}

      {/* === BRAND BADGE (top center of faceplate) === */}
      <mesh position={[0, 0.13, -0.184]}>
        <planeGeometry args={[0.16, 0.025]} />
        <meshBasicMaterial color="#5a3010" />
      </mesh>
      <mesh position={[0, 0.13, -0.185]}>
        <planeGeometry args={[0.18, 0.04]} />
        <meshBasicMaterial color="#d8a060" />
      </mesh>

      {/* === STEAM PARTICLES (rising from the wand tip) === */}
      <points ref={steamRef} position={[0.36, -0.10, -0.10]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[steamPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#e8eef4" size={0.018} transparent opacity={0.45} sizeAttenuation />
      </points>
    </group>
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
