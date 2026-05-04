'use client'

import { Text } from '@react-three/drei'
import { useGameStore } from '@/lib/game/store'

// Mounted on the right-side wall facing the listening area.
// Shows whatever's currently loaded on the turntable. When the player isn't
// playing anything, falls back to a "no record" line so the board reads as
// always-installed cafe furniture rather than disappearing.
export default function NowPlayingBoard() {
  const loadedAlbum = useGameStore((s) => s.loadedAlbum)
  const loadedSide = useGameStore((s) => s.loadedSide)
  const playbackState = useGameStore((s) => s.playbackState)

  const trackName =
    playbackState?.track_window?.current_track?.name ?? loadedAlbum?.name ?? '—'
  const artist =
    playbackState?.track_window?.current_track?.artists?.[0]?.name ??
    loadedAlbum?.artists?.[0]?.name ??
    'NO RECORD LOADED'
  const albumName = loadedAlbum?.name ?? ''
  const year = loadedAlbum?.release_date?.slice(0, 4) ?? ''
  const sideLabel = loadedAlbum ? `SIDE ${loadedSide}` : ''

  // Right wall, back half. Larger board with bigger text so it reads from the
  // central seating area, not just from up close.
  return (
    <group position={[3.93, 1.7, -2.4]} rotation={[0, -Math.PI / 2, 0]}>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[1.40, 0.95, 0.03]} />
        <meshLambertMaterial color="#2a1810" flatShading />
      </mesh>
      {/* Chalkboard surface */}
      <mesh position={[0, 0, 0.017]}>
        <planeGeometry args={[1.30, 0.85]} />
        <meshLambertMaterial color="#1a221c" flatShading />
      </mesh>

      {/* Header */}
      <Text
        position={[0, 0.34, 0.022]}
        fontSize={0.07}
        color="#e0c878"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
      >
        ♪ NOW PLAYING
      </Text>

      {/* Divider */}
      <mesh position={[0, 0.26, 0.020]}>
        <planeGeometry args={[1.10, 0.006]} />
        <meshBasicMaterial color="#7a6040" />
      </mesh>

      {/* Track — large so it reads from the seating area */}
      <Text
        position={[0, 0.12, 0.022]}
        fontSize={0.085}
        color="#f0ddb0"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.20}
      >
        {trackName}
      </Text>

      {/* Artist */}
      <Text
        position={[0, -0.02, 0.022]}
        fontSize={0.060}
        color="#c8a060"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.20}
      >
        {artist}
      </Text>

      {/* Album · year */}
      <Text
        position={[0, -0.16, 0.022]}
        fontSize={0.042}
        color="#8a7050"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.20}
      >
        {albumName ? `${albumName}${year ? ` · ${year}` : ''}` : ''}
      </Text>

      {/* Side label, bottom */}
      <Text
        position={[0, -0.32, 0.022]}
        fontSize={0.048}
        color="#cc8833"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.12}
      >
        {sideLabel}
      </Text>
    </group>
  )
}
