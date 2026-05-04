'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { applyPS1Material, makeWoodTexture } from '@/lib/shaders/ps1'
import AlbumSpine from './AlbumSpine'
import type { SpotifyAlbum } from '@/lib/types'

const FACE_SPACING = 0.55  // face-out spacing per album (50cm cover + 5cm gap)
const MAX_ALBUMS_PER_SHELF = 11

interface ShelfProps {
  albums: SpotifyAlbum[]
  position: [number, number, number]
  label: string
  onSelectAlbum: (album: SpotifyAlbum) => void
}

export default function Shelf({ albums, position, onSelectAlbum }: ShelfProps) {
  const woodTex = useMemo(() => makeWoodTexture(), [])
  const shelfMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ map: woodTex, flatShading: true })
    woodTex.repeat.set(4, 1)
    applyPS1Material(m, { snapStrength: 160 })
    return m
  }, [woodTex])

  const displayed = albums.slice(0, MAX_ALBUMS_PER_SHELF)
  const totalWidth = displayed.length * FACE_SPACING
  const startX = -totalWidth / 2 + FACE_SPACING / 2

  return (
    <group position={position}>
      {/* Shelf plank */}
      <mesh material={shelfMat}>
        <boxGeometry args={[6.4, 0.04, 0.42]} />
      </mesh>

      {/* Shadow strip under the rail — gives each shelf a sense of depth
          rather than floating against the back panel */}
      <mesh position={[0, -0.025, 0.05]}>
        <boxGeometry args={[6.4, 0.012, 0.32]} />
        <meshBasicMaterial color="#0a0604" transparent opacity={0.85} />
      </mesh>

      {/* Back panel */}
      <mesh position={[0, 0.27, -0.20]} material={shelfMat}>
        <boxGeometry args={[6.4, 0.54, 0.02]} />
      </mesh>

      {/* Albums face-out, standing on shelf plank */}
      {displayed.map((album, i) => (
        <AlbumSpine
          key={album.id}
          album={album}
          position={[startX + i * FACE_SPACING, 0.29, 0.02]}
          index={i}
          onSelect={onSelectAlbum}
        />
      ))}
    </group>
  )
}
