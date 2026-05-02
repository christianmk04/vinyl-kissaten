'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { playTracks, pausePlayback, setSpotifyVolume } from '@/lib/spotify/player'
import { fetchAlbumTracks } from '@/lib/spotify/library'
import { splitSides } from '@/lib/spotify/sides'
import { playSound, duckChatForMusic, unduckChat } from '@/lib/audio/howlerSetup'

// Camera target for turntable top-down view
const TOP_DOWN_POS = new THREE.Vector3(3, 2.8, 0)
const TOP_DOWN_LOOK = new THREE.Vector3(3, 0.87, 0)

export default function TurntableTopDown() {
  const { camera } = useThree()
  const view = useGameStore((s) => s.view)
  const savedCamPos = useRef(new THREE.Vector3())
  const savedCamRot = useRef(new THREE.Euler())
  const enteringRef = useRef(false)
  const exitingRef = useRef(false)

  useEffect(() => {
    if (view === 'turntable-top-down') {
      savedCamPos.current.copy(camera.position)
      savedCamRot.current.copy(camera.rotation)
      enteringRef.current = true
      exitingRef.current = false
    } else {
      exitingRef.current = true
      enteringRef.current = false
    }
  }, [view])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view === 'turntable-top-down') {
        useGameStore.getState().setView('first-person')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [view])

  useFrame(() => {
    if (view === 'turntable-top-down') {
      camera.position.lerp(TOP_DOWN_POS, 0.1)
      camera.lookAt(TOP_DOWN_LOOK)
    } else if (exitingRef.current) {
      camera.position.lerp(savedCamPos.current, 0.1)
      if (camera.position.distanceTo(savedCamPos.current) < 0.05) {
        exitingRef.current = false
      }
    }
  })

  return null
}

// ─── Hook: tonearm state → Spotify playback ───────────────────────────────────

export function useTonearmPlayback() {
  const tonearmState = useGameStore((s) => s.tonearmState)
  const loadedAlbum = useGameStore((s) => s.loadedAlbum)
  const loadedSide = useGameStore((s) => s.loadedSide)
  const spotifyToken = useGameStore((s) => s.spotifyToken)
  const spotifyDeviceId = useGameStore((s) => s.spotifyDeviceId)
  const setSideTracks = useGameStore((s) => s.setSideTracks)
  const setIsPlaying = useGameStore((s) => s.setIsPlaying)
  const prevTonearmRef = useRef<string>('rest')

  useEffect(() => {
    const prev = prevTonearmRef.current
    prevTonearmRef.current = tonearmState

    if (!loadedAlbum || !spotifyToken || !spotifyDeviceId) return

    if (tonearmState === 'playing' && prev !== 'playing') {
      // Load tracks and play the correct side
      fetchAlbumTracks(loadedAlbum.id, spotifyToken).then((tracks) => {
        const { sideA, sideB } = splitSides(tracks)
        setSideTracks(sideA, sideB)
        const sideTracks = loadedSide === 'A' ? sideA : sideB
        if (sideTracks.length === 0) return
        const uris = sideTracks.map((t) => t.uri)
        playTracks(spotifyToken, spotifyDeviceId, uris)
        duckChatForMusic()
        setIsPlaying(true)
      })
    } else if (tonearmState === 'rest' && prev === 'playing') {
      pausePlayback(spotifyToken)
      unduckChat()
      setIsPlaying(false)
    }
  }, [tonearmState, loadedAlbum, loadedSide])
}
