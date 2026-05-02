'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { applyPS1Material, makeWoodTexture } from '@/lib/shaders/ps1'
import AlbumSpine from './AlbumSpine'
import type { SpotifyAlbum } from '@/lib/types'

interface ShelfProps {
  albums: SpotifyAlbum[]
  position: [number, number, number]
  label: string
  onSelectAlbum: (album: SpotifyAlbum) => void
}

const SPINE_WIDTH = 0.034 // slightly more than geometry width for spacing
const MAX_ALBUMS_PER_SHELF = 20

export default function Shelf({ albums, position, label, onSelectAlbum }: ShelfProps) {
  const woodTex = useMemo(() => makeWoodTexture(), [])
  const shelfMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ map: woodTex, flatShading: true })
    woodTex.repeat.set(4, 1)
    applyPS1Material(m, { snapStrength: 160 })
    return m
  }, [woodTex])

  const displayed = albums.slice(0, MAX_ALBUMS_PER_SHELF)
  const totalWidth = displayed.length * SPINE_WIDTH
  const startX = -totalWidth / 2 + SPINE_WIDTH / 2

  return (
    <group position={position}>
      {/* Shelf plank */}
      <mesh position={[0, 0, 0]} material={shelfMat}>
        <boxGeometry args={[4, 0.04, 0.32]} />
      </mesh>

      {/* Back lip to stop albums falling */}
      <mesh position={[0, 0.14, -0.14]} material={shelfMat}>
        <boxGeometry args={[4, 0.28, 0.02]} />
      </mesh>

      {/* Albums standing on shelf */}
      {displayed.map((album, i) => (
        <AlbumSpine
          key={album.id}
          album={album}
          position={[startX + i * SPINE_WIDTH, 0.16, 0]}
          index={i}
          onSelect={onSelectAlbum}
        />
      ))}

      {/* Shelf label card */}
      <mesh position={[-1.85, 0.1, 0.17]}>
        <boxGeometry args={[0.25, 0.1, 0.005]} />
        <meshLambertMaterial color="#e8d5a8" flatShading />
      </mesh>
    </group>
  )
}
