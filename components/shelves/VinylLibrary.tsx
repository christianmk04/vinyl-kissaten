'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { applyPS1Material, makeWoodTexture, ps1Texture } from '@/lib/shaders/ps1'
import Shelf from './Shelf'
import { useGameStore } from '@/lib/game/store'
import type { SpotifyAlbum } from '@/lib/types'

const SHELF_Y_POSITIONS = [0.75, 1.55, 2.35]
const SHELF_COUNT = SHELF_Y_POSITIONS.length
const ALBUMS_PER_SHELF = 11  // matches Shelf.tsx::MAX_ALBUMS_PER_SHELF
const PAGE_SIZE = SHELF_COUNT * ALBUMS_PER_SHELF  // 33 albums per shelf "page"

// How far back the shelf carriage slides during the page-flip animation. The
// scene fog runs from distance 5 → 14 (Cafe.tsx), and the shelf base sits at
// world z=-4.8, so an additional -10 puts the shelves at distance ~14.8 —
// fully obscured by fog before the page swap happens.
const HIDDEN_Z_OFFSET = -10
const VISIBLE_Z_OFFSET = 0
// Time-based animation (in milliseconds). We deliberately use elapsed time
// rather than a per-frame lerp factor, because per-frame lerp produces an
// exponential ease-out curve that races through the start of the motion in
// ~5 frames — combined with fog ramp-up, this read as "the shelf vanished"
// rather than "the shelf is moving away". An explicit duration with an
// ease-in-out curve gives a sustained, perceptible glide.
const PHASE_DURATION_MS = 1100

// Proximity gating for the HTML nav overlay. Center of the shelf unit is
// roughly (0, 1.5, -4.8). We show the overlay when the player is within
// NEAR_SHELF_ENTER and hide it again only after they back away past
// NEAR_SHELF_EXIT — the small gap is hysteresis so the overlay doesn't
// flicker if the player stands right at the threshold.
const SHELF_CENTER = new THREE.Vector3(0, 1.5, -4.8)
const NEAR_SHELF_ENTER = 4.5  // m — show overlay when closer than this
const NEAR_SHELF_EXIT  = 5.2  // m — hide overlay only after farther than this

type AnimPhase = 'idle' | 'exiting' | 'entering'

// Smoothstep — ease-in-out from 0 to 1. Slow start, steady middle, slow end.
function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

const PLACEHOLDER_ALBUMS: SpotifyAlbum[] = Array.from({ length: 18 }, (_, i) => ({
  id: `placeholder-${i}`,
  uri: `spotify:album:placeholder-${i}`,
  name: ['Blue Note', 'Kind of Blue', 'Coltrane', 'Mingus Ah Um', 'Miles Smiles', 'Saxophone Colossus', 'A Love Supreme', 'Time Out', 'Moanin', 'Getz/Gilberto'][i % 10],
  artists: [{ id: `a${i}`, name: ['Miles Davis', 'John Coltrane', 'Bill Evans', 'Charles Mingus', 'Sonny Rollins', 'Stan Getz'][i % 6] }],
  images: [],
  genres: [],
  total_tracks: 6 + (i % 4),
  release_date: `${1955 + (i % 15)}-01-01`,
}))

// ─── Page planning ───────────────────────────────────────────────────────────
//
// Slice the full library into shelf "pages" of up to 33 albums (3 rows × 11).
// Each page is itself an array of up to 3 shelf rows. We always render exactly
// SHELF_COUNT rows per page; a shorter final page just leaves the upper rows
// empty rather than padding with placeholders.
function paginate(albums: SpotifyAlbum[]): SpotifyAlbum[][][] {
  if (albums.length === 0) return []
  const pages: SpotifyAlbum[][][] = []
  for (let p = 0; p < albums.length; p += PAGE_SIZE) {
    const pageAlbums = albums.slice(p, p + PAGE_SIZE)
    // How many rows this page actually needs (1, 2, or 3) — bottom-up.
    const rowsUsed = Math.min(SHELF_COUNT, Math.max(1, Math.ceil(pageAlbums.length / ALBUMS_PER_SHELF)))
    const perRow = Math.ceil(pageAlbums.length / rowsUsed)
    const rows: SpotifyAlbum[][] = []
    for (let r = 0; r < SHELF_COUNT; r++) {
      if (r < rowsUsed) {
        rows.push(pageAlbums.slice(r * perRow, (r + 1) * perRow).slice(0, ALBUMS_PER_SHELF))
      } else {
        rows.push([])
      }
    }
    pages.push(rows)
  }
  return pages
}

// ─── Procedural textures for buttons + label ─────────────────────────────────

// ─── Jazz gallery wall (revealed when shelf carriage recedes) ────────────────
//
// A grid of procedurally-textured "concert posters" mounted on the room's
// back wall, sitting just behind where the shelf carriage idles. Hidden by
// the shelf back panel in the rest state; once the carriage slides back into
// the fog for a page change, the posters become visible — filling what was
// previously a blank wood wall.

const POSTER_TITLES = [
  'BLUE NOTE\nFESTIVAL',
  'COLTRANE\nQUARTET',
  'MINGUS\nWORKSHOP',
  'BILL EVANS\nTRIO',
  'MONK @ THE\nVANGUARD',
  'KIND OF\nBLUE',
  'A LOVE\nSUPREME',
  'TOKYO\nKISSATEN',
  'NIGHT &\nDAY',
  'COOL\nSTRUTTIN\'',
  'ROUND\nMIDNIGHT',
  'JAZZ\nMESSENGERS',
]
const POSTER_PALETTES: Array<[string, string, string]> = [
  ['#1f1812', '#d4965a', '#f5e6c8'], // sepia
  ['#0f1a2a', '#5a8cc8', '#f0eed8'], // cool blue
  ['#2a0f0a', '#cc6644', '#f8e0c0'], // brick red
  ['#0f1a14', '#6aaa78', '#e8f0d0'], // mint
  ['#1a1410', '#cc8833', '#fff0c0'], // amber kissaten
  ['#1f0f1f', '#aa66aa', '#f0e0f0'], // mauve
]

function hashSeed(seed: number): () => number {
  // Tiny deterministic PRNG so each poster gets a stable but varied look
  let s = (seed * 2654435761) >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makePosterTexture(seed: number): THREE.CanvasTexture {
  const rand = hashSeed(seed)
  const w = 256
  const h = 384
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!

  const palette = POSTER_PALETTES[Math.floor(rand() * POSTER_PALETTES.length)]
  const [bg, accent, ink] = palette

  // Background paper
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Border
  ctx.strokeStyle = accent
  ctx.lineWidth = 6
  ctx.strokeRect(8, 8, w - 16, h - 16)

  // Decorative band across the top
  ctx.fillStyle = accent
  ctx.fillRect(20, 30, w - 40, 6)
  ctx.fillRect(20, h - 36, w - 40, 6)

  // A geometric "instrument" silhouette — a stylized record or sax shape
  const variant = Math.floor(rand() * 3)
  ctx.fillStyle = accent
  if (variant === 0) {
    // Concentric circles (record)
    ctx.beginPath()
    ctx.arc(w / 2, h / 2 - 20, 70, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.arc(w / 2, h / 2 - 20, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(w / 2, h / 2 - 20, 8, 0, Math.PI * 2)
    ctx.fill()
  } else if (variant === 1) {
    // Tall rectangle (microphone / abstract)
    ctx.fillRect(w / 2 - 30, h / 2 - 80, 60, 110)
    ctx.beginPath()
    ctx.arc(w / 2, h / 2 - 80, 30, Math.PI, 0)
    ctx.fill()
  } else {
    // Triangle stack (jazz pyramid)
    ctx.beginPath()
    ctx.moveTo(w / 2, h / 2 - 90)
    ctx.lineTo(w / 2 - 80, h / 2 + 30)
    ctx.lineTo(w / 2 + 80, h / 2 + 30)
    ctx.closePath()
    ctx.fill()
  }

  // Title text — chunky two-line block
  const title = POSTER_TITLES[Math.floor(rand() * POSTER_TITLES.length)]
  const lines = title.split('\n')
  ctx.fillStyle = ink
  ctx.font = 'bold 30px "Courier New", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const titleY = h / 2 + 100
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, titleY + i * 32)
  })

  // Date/venue tagline
  const year = 1955 + Math.floor(rand() * 35)
  ctx.fillStyle = accent
  ctx.font = 'bold 18px "Courier New", monospace'
  ctx.fillText(`· ${year} ·`, w / 2, h - 60)

  return ps1Texture(new THREE.CanvasTexture(c))
}

// ─── Components ──────────────────────────────────────────────────────────────

// Jazz/concert posters mounted on the room's back wall, just behind the
// shelf carriage's idle position. Hidden by the shelf back panel during
// normal browsing; revealed when the shelf recedes into the fog during a
// page change. Fills what was previously a blank wood wall during the
// transition. NB: this lives OUTSIDE the carriage group so it stays put
// while the shelves slide back.
function JazzPostersWall() {
  // Procedurally lay out a mix of poster sizes across the wall area roughly
  // matching the shelf footprint (6.6m × 3.2m). Hand-tuned positions for
  // visual rhythm rather than pure grid.
  type Poster = {
    seed: number
    x: number
    y: number
    w: number
    h: number
    tilt: number
  }
  const posters: Poster[] = useMemo(
    () => [
      // Top row — bigger feature posters
      { seed: 1, x: -2.4, y: 2.5, w: 0.85, h: 1.20, tilt: -0.04 },
      { seed: 2, x: -0.7, y: 2.6, w: 0.90, h: 1.30, tilt: 0.02 },
      { seed: 3, x:  1.1, y: 2.4, w: 0.80, h: 1.15, tilt: -0.03 },
      { seed: 4, x:  2.5, y: 2.5, w: 0.75, h: 1.10, tilt: 0.05 },
      // Middle band
      { seed: 5, x: -2.7, y: 1.3, w: 0.65, h: 0.95, tilt: 0.03 },
      { seed: 6, x: -1.3, y: 1.2, w: 0.70, h: 1.00, tilt: -0.02 },
      { seed: 7, x:  0.4, y: 1.3, w: 0.85, h: 1.20, tilt: 0.01 },
      { seed: 8, x:  2.0, y: 1.2, w: 0.70, h: 1.00, tilt: -0.04 },
      // Bottom row — smaller flyers
      { seed: 9,  x: -2.3, y: 0.30, w: 0.55, h: 0.80, tilt: 0.04 },
      { seed: 10, x: -0.9, y: 0.25, w: 0.60, h: 0.85, tilt: -0.03 },
      { seed: 11, x:  0.7, y: 0.30, w: 0.55, h: 0.80, tilt: 0.02 },
      { seed: 12, x:  2.2, y: 0.25, w: 0.65, h: 0.90, tilt: -0.05 },
    ],
    [],
  )
  const textures = useMemo(
    () => posters.map((p) => makePosterTexture(p.seed)),
    [posters],
  )
  const materials = useMemo(
    () => textures.map((t) => new THREE.MeshBasicMaterial({ map: t })),
    [textures],
  )

  useEffect(
    () => () => {
      textures.forEach((t) => t.dispose())
      materials.forEach((m) => m.dispose())
    },
    [textures, materials],
  )

  // Posters sit at outer-local z=-0.12 (= world z=-4.92). The room's back
  // wall (Room.tsx) is a 12cm-thick box centered at world z=-5, so its
  // *front face* is at world z=-4.94 — anything behind that is hidden inside
  // wall geometry. We park the posters 2cm in front of the wall front face
  // so they always render over the wall.
  //
  // Visibility: the shelf back panel idles at outer-local z=0.10 (closer to
  // the camera in screen space), so it cleanly occludes the posters during
  // normal browsing. When the carriage slides back to z=-10 the back panel
  // ends up at outer-local z=-9.90 — well behind the posters — and the
  // gallery becomes visible. Fog (starts at distance 5) softly veils them at
  // distance ~4.92, which flatters the look.
  const POSTER_Z = -0.12
  return (
    <group>
      {posters.map((p, i) => (
        <mesh
          key={p.seed}
          position={[p.x, p.y, POSTER_Z]}
          rotation={[0, 0, p.tilt]}
          material={materials[i]}
        >
          <planeGeometry args={[p.w, p.h]} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Main library ────────────────────────────────────────────────────────────

export default function VinylLibrary() {
  const woodTex = useMemo(() => makeWoodTexture(), [])
  const shelvesByCategory = useGameStore((s) => s.shelvesByCategory)
  const setHeldAlbum = useGameStore((s) => s.setHeldAlbum)
  const setView = useGameStore((s) => s.setView)
  const setShelfPage = useGameStore((s) => s.setShelfPage)
  const setShelfPageRequester = useGameStore((s) => s.setShelfPageRequester)
  const setNearShelf = useGameStore((s) => s.setNearShelf)
  const { camera } = useThree()

  const shelfMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({
      map: woodTex,
      color: '#2a1810',
      flatShading: true,
    })
    applyPS1Material(m, { snapStrength: 160 })
    return m
  }, [woodTex])

  // Dark, mostly-desaturated brown for the back panel — readable as material
  // without competing with the warm orange shelf rails for visual attention.
  const backPanelMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({
      map: woodTex,
      color: '#221610',
      flatShading: true,
    })
    applyPS1Material(m, { snapStrength: 160 })
    return m
  }, [woodTex])

  function handleSelectAlbum(album: SpotifyAlbum) {
    setHeldAlbum(album)
    setView('first-person')
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  // Flatten everything into a single ordered list, then paginate. We give up
  // the per-shelf genre grouping at this point because real Spotify libraries
  // mostly don't carry genre data on the album object anyway, and pagination
  // is more useful than half-empty shelves.
  const allAlbums = useMemo(
    () => Object.values(shelvesByCategory).flat(),
    [shelvesByCategory],
  )
  const pages = useMemo(() => paginate(allAlbums), [allAlbums])
  const pageCount = pages.length
  const hasRealAlbums = pageCount > 0

  // currentPage is React state because the JSX needs to re-render with new
  // album data when it changes. Everything else animation-related is a ref
  // so the carriage z-position is never reset by React reconciliation.
  const [currentPage, setCurrentPage] = useState(0)
  const animPhaseRef = useRef<AnimPhase>('idle')
  const phaseStartRef = useRef(0)
  const pendingPageRef = useRef<number | null>(null)

  // Carriage group — direct ref mutation in useFrame. NB: we never pass a
  // `position` prop, because R3F would re-apply it on every React render and
  // clobber the animated z-position mid-transition.
  const carriageRef = useRef<THREE.Group>(null)

  // Tracks the last published "near shelf" state so we only push to the
  // store on transitions (not every frame). useRef instead of useState
  // because changing this should not trigger a re-render.
  const isNearShelfRef = useRef(false)

  // Snap back to page 0 if the library shape changes underneath us (e.g.
  // first load completes, or the user signs out and back in).
  useEffect(() => {
    setCurrentPage(0)
    pendingPageRef.current = null
    animPhaseRef.current = 'idle'
    if (carriageRef.current) carriageRef.current.position.z = VISIBLE_Z_OFFSET
  }, [allAlbums.length])

  // Publish the current page + total count to the global store so the HUD
  // overlay (rendered outside the R3F canvas) can show a crisp page indicator
  // and instructions. The 3D plate version was unreadable after the PS1
  // nearest-neighbor downsample; HTML at native resolution is much clearer.
  useEffect(() => {
    setShelfPage(currentPage, pageCount)
  }, [currentPage, pageCount, setShelfPage])

  function changePage(delta: number) {
    if (animPhaseRef.current !== 'idle' || pageCount <= 1) return
    const target = ((currentPage + delta) % pageCount + pageCount) % pageCount
    if (target === currentPage) return
    pendingPageRef.current = target
    animPhaseRef.current = 'exiting'
    phaseStartRef.current = performance.now()
  }

  const goPrev = () => changePage(-1)
  const goNext = () => changePage(1)

  // Expose the page-change actions to anything outside the R3F tree (the
  // HTML overlay click buttons in particular). We re-register on every
  // currentPage change because the captured `currentPage` inside changePage
  // would otherwise be stale.
  useEffect(() => {
    setShelfPageRequester(goPrev, goNext)
    return () => setShelfPageRequester(null, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageCount, setShelfPageRequester])

  // Keyboard shortcut: Page Up / Page Down for shelf pagination. Stays out
  // of the way of the existing controls (E to interact, [ ] for skip track,
  // WASD movement) and gives a fast fallback when the on-shelf buttons are
  // off-screen at the player's current viewing angle.
  useEffect(() => {
    if (pageCount <= 1) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'PageUp') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'PageDown') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount, currentPage])

  // ── Per-frame work: proximity check + carriage slide animation ────────────
  //
  // Carriage animation is time-based, ease-in-out. Each phase takes
  // PHASE_DURATION_MS:
  //   exit  — z lerps 0 → -10 over ~1.1s with smoothstep easing
  //   swap  — currentPage updates while shelf is fully fogged
  //   enter — z lerps -10 → 0 over ~1.1s, also smoothstep
  // Total ~2.2s round trip. Smoothstep gives a perceptible, sustained motion
  // (slow at the start, steady through the middle, slow at the end) instead
  // of the exponential snap that the per-frame lerp produced previously.
  useFrame(() => {
    // ── Proximity check for HTML nav overlay ─────────────────────────────────
    // Compute distance from player to the shelf center every frame, but only
    // push to the store when crossing a threshold (with hysteresis between
    // enter/exit distances to prevent flicker). This is far cheaper than a
    // store update each frame, which would re-render the overlay 60×/sec.
    const dist = camera.position.distanceTo(SHELF_CENTER)
    if (!isNearShelfRef.current && dist < NEAR_SHELF_ENTER) {
      isNearShelfRef.current = true
      setNearShelf(true)
    } else if (isNearShelfRef.current && dist > NEAR_SHELF_EXIT) {
      isNearShelfRef.current = false
      setNearShelf(false)
    }

    // ── Carriage slide animation ─────────────────────────────────────────────
    const c = carriageRef.current
    if (!c) return
    const phase = animPhaseRef.current
    if (phase === 'idle') return

    const elapsed = performance.now() - phaseStartRef.current
    const t = smoothstep(elapsed / PHASE_DURATION_MS)

    if (phase === 'exiting') {
      c.position.z = THREE.MathUtils.lerp(VISIBLE_Z_OFFSET, HIDDEN_Z_OFFSET, t)
      if (elapsed >= PHASE_DURATION_MS) {
        // Phase complete — pin to hidden depth, swap album content (invisible
        // to the player because the carriage is fully fogged), kick off enter.
        c.position.z = HIDDEN_Z_OFFSET
        if (pendingPageRef.current !== null) {
          setCurrentPage(pendingPageRef.current)
          pendingPageRef.current = null
        }
        animPhaseRef.current = 'entering'
        phaseStartRef.current = performance.now()
      }
    } else {
      c.position.z = THREE.MathUtils.lerp(HIDDEN_Z_OFFSET, VISIBLE_Z_OFFSET, t)
      if (elapsed >= PHASE_DURATION_MS) {
        c.position.z = VISIBLE_Z_OFFSET
        animPhaseRef.current = 'idle'
      }
    }
  })

  // ── Render data ────────────────────────────────────────────────────────────
  const visiblePage = hasRealAlbums ? pages[currentPage] : null
  const shelfData = SHELF_Y_POSITIONS.map((y, i) => {
    if (visiblePage) {
      return { y, albums: visiblePage[i] ?? [], label: `Library · Page ${currentPage + 1}` }
    }
    return {
      y,
      albums: PLACEHOLDER_ALBUMS.slice(i * 6, i * 6 + 6 + i * 3),
      label: `Shelf ${String.fromCharCode(65 + i)}`,
    }
  })


  return (
    <group position={[0, 0, -4.8]}>
      {/* Jazz/concert posters mounted on the room's back wall, just behind
          where the shelf carriage idles. Hidden by the back panel during
          normal browsing, revealed when the shelves recede during a page
          change — fills what was previously a blank wood wall. NB: lives
          OUTSIDE the carriage group so it stays put while the shelves slide
          back into the fog. */}
      {pageCount > 1 && <JazzPostersWall />}

      {/* Carriage = the entire shelf unit (frame, uprights, shelves, controls).
          Everything inside slides as one body during a page change. NB: do not
          pass a `position` prop here — see useFrame comment above. */}
      <group ref={carriageRef}>
        {/* Main shelf unit frame — back panel uses lighter wood so it reads
            as material rather than void behind the records */}
        <mesh position={[0, 1.55, 0.1]} material={backPanelMat}>
          <boxGeometry args={[6.6, 3.2, 0.1]} />
        </mesh>
        {/* Side uprights */}
        <mesh position={[-3.25, 1.55, 0.30]} material={shelfMat}>
          <boxGeometry args={[0.06, 3.2, 0.45]} />
        </mesh>
        <mesh position={[3.25, 1.55, 0.30]} material={shelfMat}>
          <boxGeometry args={[0.06, 3.2, 0.45]} />
        </mesh>

        {shelfData.map(({ y, albums, label }, i) => (
          <Shelf
            key={`${currentPage}-${i}`}
            albums={albums}
            position={[0, y, 0.22]}
            label={label}
            onSelectAlbum={handleSelectAlbum}
          />
        ))}

        {/* Page-flip controls live entirely outside the 3D scene now —
            see ShelfNavOverlay in Cafe.tsx. Any in-scene 3D button is
            inherently positional and falls out of view at some camera
            angle (we tried below the bottom shelf, between shelves, and
            on the side uprights — each had a complaint). HTML overlay
            buttons + PgUp/PgDn shortcuts give "always visible, always
            reachable" navigation without cluttering the records. */}
      </group>
    </group>
  )
}
