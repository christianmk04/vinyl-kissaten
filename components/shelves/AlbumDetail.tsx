'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { makeAlbumPlaceholderTexture, ps1Texture } from '@/lib/shaders/ps1'
import type { SpotifyAlbum } from '@/lib/types'

const PAGE_SIZE = 12
const GRID_COLS = 4
const GRID_ROWS = 3
const CARD_SIZE = 0.35
const CARD_GAP = 0.04

export default function AlbumDetail() {
  const { camera } = useThree()
  const view = useGameStore((s) => s.view)
  const activeCategory = useGameStore((s) => s.activeShelfCategory)
  const page = useGameStore((s) => s.activeShelfPage)
  const shelvesByCategory = useGameStore((s) => s.shelvesByCategory)
  const setHeldAlbum = useGameStore((s) => s.setHeldAlbum)
  const setView = useGameStore((s) => s.setView)

  const targetPos = useRef(new THREE.Vector3(0, 1.5, -3.5))
  const targetLook = useRef(new THREE.Vector3(0, 1.5, -5))

  useFrame(() => {
    if (view !== 'shelf-detail') return
    camera.position.lerp(targetPos.current, 0.08)
  })

  if (view !== 'shelf-detail' || !activeCategory) return null

  const allAlbums = shelvesByCategory[activeCategory] ?? []
  const pageAlbums = allAlbums.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const gridW = GRID_COLS * (CARD_SIZE + CARD_GAP) - CARD_GAP
  const gridH = GRID_ROWS * (CARD_SIZE + CARD_GAP) - CARD_GAP
  const startX = -gridW / 2 + CARD_SIZE / 2
  const startY = 2.0

  return (
    <group position={[0, 0, -4]}>
      {pageAlbums.map((album, i) => {
        const col = i % GRID_COLS
        const row = Math.floor(i / GRID_COLS)
        const x = startX + col * (CARD_SIZE + CARD_GAP)
        const y = startY - row * (CARD_SIZE + CARD_GAP)
        return (
          <AlbumCard
            key={album.id}
            album={album}
            index={i}
            position={[x, y, 0]}
            onSelect={() => {
              setHeldAlbum(album)
              setView('first-person')
            }}
          />
        )
      })}
      {/* Back button */}
      <mesh
        position={[-gridW / 2 - 0.3, 1.0, 0]}
        onClick={() => setView('first-person')}
      >
        <boxGeometry args={[0.3, 0.12, 0.02]} />
        <meshLambertMaterial color="#3a2418" flatShading />
      </mesh>
    </group>
  )
}

function AlbumCard({
  album,
  index,
  position,
  onSelect,
}: {
  album: SpotifyAlbum
  index: number
  position: [number, number, number]
  onSelect: () => void
}) {
  const tex = useMemo(() => {
    if (album.artDataUrl) {
      const loader = new THREE.TextureLoader()
      return ps1Texture(loader.load(album.artDataUrl))
    }
    return makeAlbumPlaceholderTexture(index)
  }, [album.artDataUrl, index])

  const hoverRef = useRef(false)
  const meshRef = useRef<THREE.Mesh>(null)

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={onSelect}
      onPointerEnter={() => {
        hoverRef.current = true
        if (meshRef.current) {
          ;(meshRef.current.material as THREE.MeshLambertMaterial).emissive?.set(
            '#332200',
          )
        }
      }}
      onPointerLeave={() => {
        hoverRef.current = false
        if (meshRef.current) {
          ;(meshRef.current.material as THREE.MeshLambertMaterial).emissive?.set(
            '#000000',
          )
        }
      }}
    >
      <boxGeometry args={[CARD_SIZE, CARD_SIZE, 0.015]} />
      <meshLambertMaterial map={tex} flatShading />
    </mesh>
  )
}
