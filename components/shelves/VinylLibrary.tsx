'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { applyPS1Material, makeWoodTexture } from '@/lib/shaders/ps1'
import Shelf from './Shelf'
import { useGameStore } from '@/lib/game/store'
import type { SpotifyAlbum } from '@/lib/types'

const SHELF_Y_POSITIONS = [0.75, 1.55, 2.35]
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

export default function VinylLibrary() {
  const woodTex = useMemo(() => makeWoodTexture(), [])
  const shelvesByCategory = useGameStore((s) => s.shelvesByCategory)
  const setHeldAlbum = useGameStore((s) => s.setHeldAlbum)
  const setView = useGameStore((s) => s.setView)

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

  const categories = Object.keys(shelvesByCategory)
  const hasRealAlbums = categories.length > 0

  function handleSelectAlbum(album: SpotifyAlbum) {
    setHeldAlbum(album)
    setView('first-person')
  }

  // Build 3 shelves — one per category (or placeholder if no Spotify data)
  const shelfData = SHELF_Y_POSITIONS.map((y, i) => {
    const cat = categories[i]
    const albums = cat ? (shelvesByCategory[cat] ?? []) : PLACEHOLDER_ALBUMS.slice(i * 6, i * 6 + 6 + i * 3)
    const label = cat ?? `Shelf ${String.fromCharCode(65 + i)}`
    return { y, albums, label }
  })

  return (
    <group position={[0, 0, -4.8]}>
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
          key={i}
          albums={albums}
          position={[0, y, 0.22]}
          label={label}
          onSelectAlbum={handleSelectAlbum}
        />
      ))}
    </group>
  )
}
