'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { applyPS1Material, makeAlbumPlaceholderTexture, ps1Texture } from '@/lib/shaders/ps1'
import { interactions } from '@/lib/game/interactions'
import type { SpotifyAlbum } from '@/lib/types'

interface AlbumSpineProps {
  album: SpotifyAlbum
  position: [number, number, number]
  index: number
  onSelect: (album: SpotifyAlbum) => void
}

export default function AlbumSpine({ album, position, index, onSelect }: AlbumSpineProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const artTex = useMemo(() => {
    if (album.artDataUrl) {
      const loader = new THREE.TextureLoader()
      const tex = loader.load(album.artDataUrl)
      return ps1Texture(tex)
    }
    return makeAlbumPlaceholderTexture(index)
  }, [album.artDataUrl, index])

  const mat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({
      map: artTex,
      flatShading: true,
    })
    applyPS1Material(m, { snapStrength: 80 })
    return m
  }, [artTex])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    interactions.register(mesh.uuid, 'Press E to pick up', () => onSelect(album))
    return () => interactions.unregister(mesh.uuid)
  }, [album, onSelect])

  const artistName = album.artists[0]?.name ?? ''
  const shortTitle = album.name.length > 12 ? album.name.slice(0, 11) + '…' : album.name

  return (
    <group position={position}>
      {/* Spine box — 3cm wide, 28cm tall, 28cm deep */}
      <mesh ref={meshRef} material={mat}>
        <boxGeometry args={[0.03, 0.28, 0.28]} />
      </mesh>
      {/* Artist name on spine (very tiny, rotated) */}
      <Text
        position={[0.02, 0, 0]}
        rotation={[0, Math.PI / 2, -Math.PI / 2]}
        fontSize={0.018}
        color="#e8d5a8"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.25}
        letterSpacing={0.02}
      >
        {shortTitle}
      </Text>
    </group>
  )
}
