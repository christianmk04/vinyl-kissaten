'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { initAudio } from '@/lib/audio/howlerSetup'
import {
  fetchSavedAlbums,
  categorizeAlbums,
  downsampleArtwork,
} from '@/lib/spotify/library'
import { initPlayer } from '@/lib/spotify/player'
import { splitSides } from '@/lib/spotify/sides'
import type { SpotifyPlaybackState } from '@/lib/types'

// Scene components
import PS1Pipeline from './PS1Pipeline'
import Room from './Room'
import Lighting from './Lighting'
import RainWindow from './RainWindow'
import DustMotes from './DustMotes'

// Furniture
import TurntableTable from '../turntable/TurntableTable'
import TurntableTopDown, { useTonearmPlayback } from '../turntable/TurntableTopDown'
import VinylLibrary from '../shelves/VinylLibrary'
import AlbumDetail from '../shelves/AlbumDetail'
import Patron from '../patrons/Patron'
import HeldRecord from '../ui/HeldRecord'

// Controls
import DesktopControls from '../controls/DesktopControls'
import MobileControls from '../controls/MobileControls'
import InteractionRaycaster from '../controls/InteractionRaycaster'

// UI overlays
import SpotifyAuthGate from '../ui/SpotifyAuthGate'
import NowPlaying from '../ui/NowPlaying'
import InteractionPrompt from '../ui/InteractionPrompt'
import LoadingScreen from '../ui/LoadingScreen'
import MobileJoystick from '../ui/MobileJoystick'
import TurntableControls from '../ui/TurntableControls'
import SettingsMenu from '../ui/SettingsMenu'

// Bar counter and misc furniture
import BarCounter from './BarCounter'

const isMobile =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || window.innerWidth < 768)

function Scene() {
  const [hoverLabel, setHoverLabel] = useState<string | null>(null)
  const showCRT = useGameStore((s) => s.showCRTOverlay)
  const showBarrel = useGameStore((s) => s.showBarrelDistortion)
  const showFlicker = useGameStore((s) => s.showFlicker)

  // Wire tonearm state → Spotify playback
  useTonearmPlayback()

  // End-of-side detection from playback state
  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prev) => {
      const ps = state.playbackState
      if (!ps || ps === prev.playbackState) return
      const { track_window, position, duration } = ps
      const nextTracks = track_window?.next_tracks ?? []
      const sideTracks =
        state.loadedSide === 'A' ? state.sideATracks : state.sideBTracks
      const currentUri = track_window?.current_track?.uri

      if (
        nextTracks.length === 0 &&
        currentUri &&
        sideTracks.length > 0 &&
        duration > 0 &&
        duration - position < 2000
      ) {
        if (!state.endOfSideReached) {
          state.setEndOfSideReached(true)
          state.setTonearmState('rest')
          if (state.autoFlip) {
            setTimeout(() => {
              useGameStore.getState().flipLoadedRecord()
              useGameStore.getState().setEndOfSideReached(false)
            }, 1200)
          }
        }
      }
    })
    return unsub
  }, [])

  return (
    <>
      <PS1Pipeline scanlines={showCRT} barrel={showBarrel} flicker={showFlicker} />

      {/* Fog */}
      <fog attach="fog" args={['#1a1410', 3, 12]} />

      {/* Scene */}
      <Suspense fallback={null}>
        <Room />
        <Lighting />
        <RainWindow />
        <DustMotes />
        <VinylLibrary />
        <AlbumDetail />
        <TurntableTable />
        <TurntableTopDown />
        <BarCounter />
        <HeldRecord />

        {/* Patrons */}
        <Patron
          position={[-1.5, 0, -2]}
          rotation={0.3}
          outfitColor="#5c1f24"
          item="cup"
          offset={0}
        />
        <Patron
          position={[0, 0, -1.5]}
          rotation={-0.2}
          outfitColor="#2d4a3a"
          item="newspaper"
          offset={1.7}
        />
        <Patron
          position={[-2, 0, 1.5]}
          rotation={0.8}
          outfitColor="#2a2a32"
          item="none"
          offset={3.2}
        />

        {/* Controls */}
        {isMobile ? <MobileControls /> : <DesktopControls />}
        <InteractionRaycaster onHover={setHoverLabel} />
      </Suspense>

      {/* HUD: crosshair */}
      {/* (rendered as HTML overlay, not in canvas) */}
    </>
  )
}

// ─── Library loader hook ───────────────────────────────────────────────────────
function useLibraryLoader() {
  const spotifyToken = useGameStore((s) => s.spotifyToken)
  const setAlbums = useGameStore((s) => s.setAlbums)
  const setShelvesByCategory = useGameStore((s) => s.setShelvesByCategory)
  const setSpotifyDeviceId = useGameStore((s) => s.setSpotifyDeviceId)
  const setPlaybackState = useGameStore((s) => s.setPlaybackState)
  const setIsPlaying = useGameStore((s) => s.setIsPlaying)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!spotifyToken || loadedRef.current) return
    loadedRef.current = true

    fetchSavedAlbums(spotifyToken).then(async (albums) => {
      // Downsample artwork for all albums
      const withArt = await Promise.all(
        albums.map(async (album) => {
          const img = album.images[0]?.url
          const artDataUrl = img ? await downsampleArtwork(img) : undefined
          return { ...album, artDataUrl }
        }),
      )
      setAlbums(withArt)
      setShelvesByCategory(categorizeAlbums(withArt))
    })

    // Init Spotify Web Playback SDK
    initPlayer(
      spotifyToken,
      (state: SpotifyPlaybackState | null) => {
        useGameStore.getState().setPlaybackState(state)
        if (state) {
          useGameStore.getState().setIsPlaying(!state.paused)
        }
      },
      (deviceId: string) => {
        setSpotifyDeviceId(deviceId)
      },
      (err: string) => {
        console.error('Spotify player error:', err)
      },
    )
  }, [spotifyToken])
}

// ─── Main Cafe component ───────────────────────────────────────────────────────
export default function Cafe() {
  const [loaded, setLoaded] = useState(false)
  const [audioStarted, setAudioStarted] = useState(false)
  const [hoverLabel, setHoverLabel] = useState<string | null>(null)

  // Only show mobile joystick on touch devices
  const mobile = typeof window !== 'undefined' && 'ontouchstart' in window

  useLibraryLoader()

  function handleUserGesture() {
    if (!audioStarted) {
      initAudio()
      setAudioStarted(true)
    }
  }

  return (
    <div
      style={{ width: '100vw', height: '100vh', background: '#1a1410' }}
      onClick={handleUserGesture}
    >
      {!loaded && <LoadingScreen onComplete={() => setLoaded(true)} />}

      <SpotifyAuthGate />

      <Canvas
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: 75, near: 0.1, far: 20, position: [0, 1.65, 3] }}
        dpr={1}
        shadows
        style={{ position: 'absolute', inset: 0 }}
      >
        <Scene />
      </Canvas>

      {/* 2D UI overlays — native resolution */}
      <NowPlaying />
      <TurntableControls />
      <SettingsMenu />
      {mobile && <MobileJoystick />}

      {/* Crosshair */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '8px',
          height: '8px',
          pointerEvents: 'none',
          zIndex: 40,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '1px',
            background: 'rgba(232, 213, 168, 0.5)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: '1px',
            background: 'rgba(232, 213, 168, 0.5)',
          }}
        />
      </div>

      {/* Interaction prompt */}
      <InteractionPrompt label={hoverLabel} />

      {/* Held record HUD hints */}
      <HeldRecordHUD />
    </div>
  )
}

function HeldRecordHUD() {
  const heldAlbum = useGameStore((s) => s.heldAlbum)
  const heldSide = useGameStore((s) => s.heldSide)
  if (!heldAlbum) return null
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: '#8a7060',
        letterSpacing: '0.1em',
        zIndex: 50,
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      <div style={{ color: '#e8d5a8', marginBottom: '2px' }}>
        {heldAlbum.name} — Side {heldSide}
      </div>
      <div>
        Walk to turntable to play · [F] Flip · [ESC] Put back
      </div>
    </div>
  )
}
