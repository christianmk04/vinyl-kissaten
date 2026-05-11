'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { fetchAlbumTracks } from '@/lib/spotify/library'
import { splitSides } from '@/lib/spotify/sides'
import { playSound, duckChatForMusic, unduckChat } from '@/lib/audio/howlerSetup'
import * as preview from '@/lib/audio/previewPlayer'
import type { SpotifyAlbum, SpotifyTrack } from '@/lib/types'

// Resolve the track list for a loaded album. Snapshots (guest mode) bake the
// full track list into album.tracks so we can skip the API call entirely.
// Signed-in users with a fresh /me/albums response don't have tracks attached,
// so we fall back to fetching from Spotify when needed.
async function resolveTracks(
  album: SpotifyAlbum,
  spotifyToken: string | null,
): Promise<SpotifyTrack[]> {
  if (album.tracks && album.tracks.length > 0) return album.tracks
  if (!spotifyToken) return []
  return fetchAlbumTracks(album.id, spotifyToken)
}

// Frontal camera: standing in front of turntable, looking down at the deck
const FRONTAL_POS = new THREE.Vector3(3.1, 1.55, 1.2)
const FRONTAL_LOOK = new THREE.Vector3(3.0, 0.87, 0.0)

export default function TurntableTopDown() {
  const { camera } = useThree()
  const view = useGameStore((s) => s.view)
  const savedCamPos = useRef(new THREE.Vector3())
  const savedCamRot = useRef(new THREE.Euler())
  // Only trigger exit lerp when actually leaving turntable view
  const wasInTurntableRef = useRef(false)
  const exitingRef = useRef(false)

  useEffect(() => {
    if (view === 'turntable-top-down') {
      savedCamPos.current.copy(camera.position)
      savedCamRot.current.copy(camera.rotation)
      wasInTurntableRef.current = true
      exitingRef.current = false
    } else if (wasInTurntableRef.current) {
      // Only run exit animation when actually leaving turntable, not on initial mount
      wasInTurntableRef.current = false
      exitingRef.current = true
    }
  }, [view])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view === 'turntable-top-down') {
        useGameStore.getState().setView('first-person')
      }
      // Enter / Space: 2-mode toggle rest↔playing
      if ((e.key === 'Enter' || e.key === ' ') && view === 'turntable-top-down') {
        e.preventDefault()
        const s = useGameStore.getState()
        if (!s.loadedAlbum) return
        s.setTonearmState(s.tonearmState === 'playing' ? 'rest' : 'playing')
      }
      // F — flip loaded record (only when tonearm at rest)
      if ((e.key === 'f' || e.key === 'F') && view === 'turntable-top-down') {
        const s = useGameStore.getState()
        if (s.tonearmState === 'rest' && s.loadedAlbum) s.flipLoadedRecord()
      }
      // G — pick up record from turntable (allowed regardless of tonearm state)
      if ((e.key === 'g' || e.key === 'G') && view === 'turntable-top-down') {
        const s = useGameStore.getState()
        if (s.loadedAlbum) {
          s.pickUpFromTurntable()
          s.setView('first-person')
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [view])

  useFrame(() => {
    if (view === 'turntable-top-down') {
      camera.position.lerp(FRONTAL_POS, 0.1)
      camera.lookAt(FRONTAL_LOOK)
    } else if (exitingRef.current) {
      // Only lerp position back — DesktopControls handles rotation via lookRef
      camera.position.lerp(savedCamPos.current, 0.12)
      if (camera.position.distanceTo(savedCamPos.current) < 0.05) {
        camera.position.copy(savedCamPos.current)
        exitingRef.current = false
      }
    }
  })

  return null
}

// ─── Hook: tonearm state → preview-mode playback ──────────────────────────────
//
// All playback runs through the Web-Audio preview path. This used to also
// branch into a Spotify Web Playback SDK path for full-track LISTEN mode,
// but the SDK was desktop-only (didn't work on mobile browsers) and added
// significant complexity for a feature only a fraction of users could even
// use, so it was removed in favor of a single, consistent audio engine.

export function useTonearmPlayback() {
  const tonearmState = useGameStore((s) => s.tonearmState)
  const loadedAlbum = useGameStore((s) => s.loadedAlbum)
  const loadedSide = useGameStore((s) => s.loadedSide)
  const spotifyToken = useGameStore((s) => s.spotifyToken)
  const setSideTracks = useGameStore((s) => s.setSideTracks)
  const setIsPlaying = useGameStore((s) => s.setIsPlaying)
  const setEndOfSideReached = useGameStore((s) => s.setEndOfSideReached)
  const setTonearmState = useGameStore((s) => s.setTonearmState)
  const setPlaybackState = useGameStore((s) => s.setPlaybackState)
  const prevTonearmRef = useRef<string>('rest')
  // Tracks which album+side has been loaded so we can resume vs restart
  const loadedKeyRef = useRef<string>('')

  // Wire preview player callbacks once. onTrackChange synthesizes a
  // SpotifyPlaybackState-shaped object so the rest of the UI (NowPlaying,
  // end-of-side detection, track highlight) reads from a single source.
  useEffect(() => {
    preview.setCallbacks({
      onTrackChange: (track, idx, total) => {
        if (!track) {
          setPlaybackState(null)
          return
        }
        const album = useGameStore.getState().loadedAlbum
        setPlaybackState({
          context: { uri: album?.uri ?? '' },
          track_window: {
            current_track: {
              id: track.id,
              uri: track.uri,
              name: track.name,
              duration_ms: track.duration_ms,
              artists: track.artists.map((a) => ({ name: a.name })),
              album: {
                name: album?.name ?? '',
                images: album?.images ?? [],
              },
            },
            // Synthesize a placeholder for next/previous so end-of-side
            // detection still works (next_tracks empty = end of side)
            next_tracks: idx + 1 < total ? [{ uri: 'next' }] : [],
            previous_tracks: idx > 0 ? [{ uri: 'prev' }] : [],
          },
          position: 0,
          duration: track.duration_ms,
          paused: false,
          shuffle: false,
          repeat_mode: 0,
        })
      },
      onSideEnd: () => {
        setEndOfSideReached(true)
        setTonearmState('rest')
        setIsPlaying(false)
        setPlaybackState(null)
      },
      onError: (msg) => {
        console.warn('[preview]', msg)
        useGameStore.getState().setPreviewError(msg)
        setTonearmState('rest')
        setIsPlaying(false)
      },
    })
  }, [setEndOfSideReached, setTonearmState, setIsPlaying, setPlaybackState])

  // Clear tracks + resume state + stale playback metadata whenever a new
  // album is placed. Without clearing playbackState, the NowPlaying panel
  // would keep showing the previous album's track name & artist.
  useEffect(() => {
    setSideTracks([], [])
    loadedKeyRef.current = ''
    preview.stop()
    setPlaybackState(null)
    setIsPlaying(false)
  }, [loadedAlbum?.id, setSideTracks, setPlaybackState, setIsPlaying])

  useEffect(() => {
    const prev = prevTonearmRef.current
    prevTonearmRef.current = tonearmState

    // Stop transition runs FIRST so picking up the record (which clears
    // loadedAlbum and sets tonearm to 'rest' simultaneously) actually halts
    // playback. Without this, the early `if (!loadedAlbum) return` would
    // short-circuit before the stop code below ran.
    if (prev === 'playing' && tonearmState !== 'playing') {
      preview.stop()
      unduckChat()
      setIsPlaying(false)
      loadedKeyRef.current = ''
      return
    }

    if (!loadedAlbum) return

    if (tonearmState === 'playing' && prev !== 'playing') {
      useGameStore.getState().setPreviewError(null)
      const key = `${loadedAlbum.id}::${loadedSide}`
      if (loadedKeyRef.current === key && preview.isReady()) {
        preview.resume()
        duckChatForMusic()
        setIsPlaying(true)
      } else {
        loadedKeyRef.current = key
        resolveTracks(loadedAlbum, spotifyToken).then(async (tracks) => {
          const { sideA, sideB } = splitSides(tracks)
          setSideTracks(sideA, sideB)
          const sideTracks = loadedSide === 'A' ? sideA : sideB
          if (sideTracks.length === 0) return
          const ok = await preview.playSide(sideTracks)
          if (ok) {
            duckChatForMusic()
            setIsPlaying(true)
          }
        })
      }
    }
  }, [tonearmState, loadedAlbum, loadedSide, spotifyToken, setSideTracks, setIsPlaying])
}
