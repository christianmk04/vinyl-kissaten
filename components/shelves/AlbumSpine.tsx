'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { makeAlbumPlaceholderTexture, ps1Texture } from '@/lib/shaders/ps1'
import { interactions } from '@/lib/game/interactions'
import { useGameStore } from '@/lib/game/store'
import type { SpotifyAlbum } from '@/lib/types'

export default function AlbumSpine({
  album,
  position,
  index,
  onSelect,
}: {
  album: SpotifyAlbum
  position: [number, number, number]
  index: number
  onSelect: (album: SpotifyAlbum) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const heldAlbum = useGameStore((s) => s.heldAlbum)
  const setHeldAlbum = useGameStore((s) => s.setHeldAlbum)
  // Album is "out" if the player is holding it OR it's currently spinning
  // on the turntable — either way the slot on the shelf should be empty.
  const loadedAlbum = useGameStore((s) => s.loadedAlbum)
  const isHeld = heldAlbum?.id === album.id
  const isLoaded = loadedAlbum?.id === album.id
  const isOut = isHeld || isLoaded

  const artTex = useMemo(() => {
    if (album.artDataUrl) {
      const loader = new THREE.TextureLoader()
      return ps1Texture(loader.load(album.artDataUrl))
    }
    return makeAlbumPlaceholderTexture(index)
  }, [album.artDataUrl, index])

  // MeshBasicMaterial — unaffected by the warm pendant lights, so album colors
  // stay true to the source instead of getting tinted orange by the room.
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: artTex }),
    [artTex],
  )

  // Empty-slot material — a faint dark rectangle that reads as "this slot is
  // empty" against the back panel. Stays raycastable so the player can press
  // E on the gap to put the held record back.
  const emptyMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#0a0604',
        transparent: true,
        opacity: 0.55,
      }),
    [],
  )

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    if (isHeld) {
      // While held, the slot is the "put it back" affordance.
      const label = `Press E to put ${album.name} back`
      interactions.register(mesh.uuid, label, () => setHeldAlbum(null))
    } else if (isLoaded) {
      // On turntable — no slot interaction; the record lives on the deck now.
      interactions.unregister(mesh.uuid)
    } else {
      interactions.register(mesh.uuid, 'Press E to pick up', () => onSelect(album))
    }
    return () => interactions.unregister(mesh.uuid)
  }, [album, onSelect, isHeld, isLoaded, setHeldAlbum])

  // Face-out cover: 50×50cm slab with art facing +z (toward the player).
  // When the album is "out" (held or on turntable), render a thin recessed
  // placeholder instead of the cover so the shelf visibly has a missing record.
  if (isOut) {
    return (
      <mesh ref={meshRef} position={[position[0], position[1], position[2] - 0.04]} material={emptyMat}>
        <boxGeometry args={[0.48, 0.48, 0.004]} />
      </mesh>
    )
  }

  return (
    <mesh ref={meshRef} position={position} material={mat}>
      <boxGeometry args={[0.50, 0.50, 0.012]} />
    </mesh>
  )
}
