'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGameStore } from '@/lib/game/store'
import { initAudio } from '@/lib/audio/howlerSetup'
import {
  fetchSavedAlbums,
  categorizeAlbums,
  downsampleArtwork,
} from '@/lib/spotify/library'
import { initPlayer } from '@/lib/spotify/player'
import type { SpotifyAlbum, SpotifyPlaybackState } from '@/lib/types'
import { startVinylEffects } from '@/lib/audio/vinylEffects'

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
import InstructionsScreen from '../ui/InstructionsScreen'
import MobileJoystick from '../ui/MobileJoystick'
import TurntableControls from '../ui/TurntableControls'
import SettingsMenu from '../ui/SettingsMenu'

// Bar counter and misc furniture
import BarCounter from './BarCounter'
import Posters from './Posters'
import NowPlayingBoard from './NowPlayingBoard'
import SpeakerStack from './SpeakerStack'
import MenuBoard from './MenuBoard'
import WallClock from './WallClock'

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
      <fog attach="fog" args={['#2a1810', 5, 14]} />

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
        <Posters />
        <NowPlayingBoard />
        <SpeakerStack />
        <MenuBoard />
        <WallClock />
        <HeldRecord />

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
  const guestMode = useGameStore((s) => s.guestMode)
  const setAlbums = useGameStore((s) => s.setAlbums)
  const setShelvesByCategory = useGameStore((s) => s.setShelvesByCategory)
  const setSpotifyDeviceId = useGameStore((s) => s.setSpotifyDeviceId)
  const setLibraryLoadState = useGameStore((s) => s.setLibraryLoadState)
  const setLibraryProgress = useGameStore((s) => s.setLibraryProgress)
  const setLibraryError = useGameStore((s) => s.setLibraryError)
  const loadedRef = useRef(false)

  useEffect(() => {
    // Two entry conditions for kicking off a load:
    //   - Spotify token present → fetch from Spotify API
    //   - Guest mode active     → fetch the static snapshot
    // Otherwise sit idle until the auth gate produces one of those.
    if (loadedRef.current) return
    if (!spotifyToken && !guestMode) return
    loadedRef.current = true

    setLibraryError(null)
    setLibraryLoadState('fetching')

    ;(async () => {
      try {
        // ── Source: snapshot (guest) vs Spotify API (signed-in) ────────────
        let albums: SpotifyAlbum[]
        if (guestMode) {
          const res = await fetch('/library.json', { cache: 'force-cache' })
          if (!res.ok) {
            throw new Error(`Snapshot not found (HTTP ${res.status}).`)
          }
          const data = (await res.json()) as { albums: SpotifyAlbum[] }
          albums = data.albums ?? []
        } else if (spotifyToken) {
          albums = await fetchSavedAlbums(spotifyToken)
        } else {
          albums = []
        }

        setLibraryLoadState('processing')
        setLibraryProgress({ loaded: 0, total: albums.length })

        // Downsample artwork with bounded concurrency.
        //
        // We previously fired Promise.all over every album, but each
        // downsample loops over 262k pixels and calls toDataURL — running
        // hundreds of those in parallel saturates the main thread so React
        // can't paint progress updates between them (the bar appears stuck
        // even though `processed` is climbing). Limiting to a small worker
        // pool plus a microtask-yield between items lets the renderer commit
        // the new progress value frequently.
        const withArt: typeof albums = new Array(albums.length)
        let processed = 0
        const CONCURRENCY = 4
        let cursor = 0
        const worker = async (): Promise<void> => {
          while (true) {
            const i = cursor++
            if (i >= albums.length) return
            const album = albums[i]
            const img = album.images[0]?.url
            const artDataUrl = img ? await downsampleArtwork(img) : undefined
            withArt[i] = { ...album, artDataUrl }
            processed += 1
            setLibraryProgress({ loaded: processed, total: albums.length })
            // Hand control back to the browser so React can paint the
            // updated progress before we crunch the next album.
            await new Promise((r) => setTimeout(r, 0))
          }
        }
        await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, albums.length) }, () => worker()),
        )
        setAlbums(withArt)
        setShelvesByCategory(categorizeAlbums(withArt))
        setLibraryLoadState('done')
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[library] load failed:', msg)
        setLibraryError(msg)
        // Still mark done so the user can dismiss the loading screen and see
        // the empty-library messaging on the instructions screen.
        setLibraryLoadState('done')
      }
    })()

    // Init Spotify Web Playback SDK in parallel with the library fetch — but
    // ONLY for signed-in users. Guests don't have a token (and aren't
    // necessarily Premium), and preview-mode playback runs through Web Audio
    // directly without ever touching the SDK.
    if (spotifyToken && !guestMode) {
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
    }
  }, [spotifyToken, guestMode, setLibraryLoadState, setLibraryProgress, setLibraryError, setAlbums, setShelvesByCategory, setSpotifyDeviceId])
}

// ─── Main Cafe component ───────────────────────────────────────────────────────
type IntroPhase = 'loading' | 'instructions' | 'ready'

export default function Cafe() {
  const [phase, setPhase] = useState<IntroPhase>('loading')
  const [audioStarted, setAudioStarted] = useState(false)
  const [hoverLabel, setHoverLabel] = useState<string | null>(null)
  const view = useGameStore((s) => s.view)
  const spotifyToken = useGameStore((s) => s.spotifyToken)
  const guestMode = useGameStore((s) => s.guestMode)
  // Either auth path satisfies the gate — Spotify sign-in or "enter as guest"
  const sessionReady = !!spotifyToken || guestMode

  // Only show mobile joystick on touch devices
  const mobile = typeof window !== 'undefined' && 'ontouchstart' in window

  useLibraryLoader()

  function handleUserGesture() {
    if (!audioStarted) {
      initAudio()
      startVinylEffects()
      setAudioStarted(true)
    }
  }

  return (
    <div
      style={{ width: '100vw', height: '100vh', background: '#1a1410' }}
      onClick={handleUserGesture}
    >
      {/* Loading + onboarding flow:
            1. SpotifyAuthGate is its own modal, shown until the user is signed in.
            2. Once signed in, LoadingScreen waits on the real library load
               (not a fixed timer) so users with big libraries see actual progress.
            3. After loading completes, InstructionsScreen shows controls,
               headphone tip, and an empty-library hint if they have no albums.
            We only mount LoadingScreen / InstructionsScreen once auth has
            resolved (Spotify sign-in OR guest mode), otherwise the user would
            see them flash before the auth gate. */}
      {sessionReady && phase === 'loading' && (
        <LoadingScreen onComplete={() => setPhase('instructions')} />
      )}
      {sessionReady && phase === 'instructions' && (
        <InstructionsScreen onDismiss={() => setPhase('ready')} />
      )}

      <SpotifyAuthGate />

      <Canvas
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: 75, near: 0.1, far: 20, position: [0, 1.65, 0] }}
        dpr={1}
        shadows
        style={{ position: 'absolute', inset: 0 }}
        onCreated={({ camera }) => {
          camera.rotation.order = 'YXZ'
          // Look slightly upward toward shelves at z≈-4.8
          camera.rotation.set(-0.12, 0, 0)
        }}
      >
        <Scene />
      </Canvas>

      {/* 2D UI overlays — native resolution */}
      <NowPlaying />
      <TurntableControls />
      <SettingsMenu />
      {mobile && <MobileJoystick />}

      {/* Crosshair — plus shape when idle, amber ring when hovering interactable */}
      {view !== 'turntable-top-down' && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 40,
            width: '20px',
            height: '20px',
          }}
        >
          {hoverLabel ? (
            // Amber lock-on ring
            <div style={{
              position: 'absolute',
              inset: 0,
              border: '2px solid #ffb56b',
              borderRadius: '50%',
              boxShadow: '0 0 6px rgba(255,181,107,0.8), inset 0 0 4px rgba(255,181,107,0.3)',
            }} />
          ) : (
            // White + crosshair
            <>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: '1.5px',
                background: 'rgba(255,255,255,0.9)',
                transform: 'translateY(-50%)',
                boxShadow: '0 0 3px rgba(0,0,0,0.9)',
              }} />
              <div style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: '1.5px',
                background: 'rgba(255,255,255,0.9)',
                transform: 'translateX(-50%)',
                boxShadow: '0 0 3px rgba(0,0,0,0.9)',
              }} />
            </>
          )}
        </div>
      )}

      {/* In turntable mode: show hint */}
      {view === 'turntable-top-down' && (
        <div style={{
          position: 'fixed',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'Courier New, monospace',
          fontSize: '11px',
          color: '#f0ddb0',
          letterSpacing: '0.1em',
          pointerEvents: 'none',
          zIndex: 60,
          textAlign: 'center',
          textShadow: '0 1px 6px #000, 0 0 20px #000',
          background: 'rgba(0,0,0,0.45)',
          padding: '5px 14px',
          borderRadius: '2px',
        }}>
          ENTER play/stop · F flip record · G pick up · ESC exit
        </div>
      )}

      {/* Drag hint — shown only after the intro flow is complete */}
      {phase === 'ready' && view === 'first-person' && !mobile && (
        <div style={{
          position: 'fixed',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'Courier New, monospace',
          fontSize: '10px',
          color: '#f0ddb0',
          letterSpacing: '0.1em',
          pointerEvents: 'none',
          zIndex: 40,
          textShadow: '0 1px 5px #000, 0 0 16px #000',
          background: 'rgba(0,0,0,0.4)',
          padding: '4px 12px',
          borderRadius: '2px',
        }}>
          DRAG to look · WASD to move · point crosshair at object · E to interact · [ ] skip track
        </div>
      )}

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
  const [sideVisible, setSideVisible] = useState(false)
  const [displaySide, setDisplaySide] = useState<'A' | 'B'>('A')
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show side indicator briefly whenever heldSide changes
  useEffect(() => {
    if (!heldAlbum) return
    setDisplaySide(heldSide)
    setSideVisible(true)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    fadeTimerRef.current = setTimeout(() => setSideVisible(false), 2000)
    return () => { if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current) }
  }, [heldSide, heldAlbum])

  if (!heldAlbum) return null
  return (
    <>
      {/* Main HUD — album name + controls */}
      <div
        style={{
          position: 'fixed',
          top: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'Courier New, monospace',
          fontSize: '10px',
          color: '#f0ddb0',
          letterSpacing: '0.08em',
          zIndex: 50,
          textAlign: 'center',
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.55)',
          padding: '5px 14px 6px',
          borderRadius: '2px',
          textShadow: '0 1px 4px #000',
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{ color: '#ffcc77', marginBottom: '3px', fontSize: '11px', fontWeight: 'bold' }}>
          {heldAlbum.name}
        </div>
        <div style={{ color: 'rgba(240,221,176,0.75)' }}>
          Walk to turntable to play · [F] Flip · [ESC] Put back
        </div>
      </div>

      {/* Fading side indicator — appears briefly when side changes */}
      <div
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'Courier New, monospace',
          fontSize: '13px',
          letterSpacing: '0.2em',
          color: '#ffcc77',
          zIndex: 50,
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.6)',
          padding: '6px 18px',
          borderRadius: '2px',
          textShadow: '0 1px 6px #000',
          transition: 'opacity 0.5s ease',
          opacity: sideVisible ? 1 : 0,
        }}
      >
        SIDE {displaySide}
      </div>
    </>
  )
}
