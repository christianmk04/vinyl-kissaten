'use client'

import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/lib/game/store'
import { formatSideLabel } from '@/lib/spotify/sides'
import { getTimeLabel } from '@/lib/game/dayNight'
import { getPlayer } from '@/lib/spotify/player'
import * as preview from '@/lib/audio/previewPlayer'

const SCRUB_TICK_MS = 250

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Hook: ticks 4× per second to refresh the scrub bar for whichever playback
// path is active. Spotify SDK's player_state_changed only fires on track-level
// state changes (play/pause/skip) — its `position` field is a snapshot, not
// a live counter — so we poll getCurrentState() to refresh it. Preview mode
// reads currentTime directly off the <audio> element.
function useLiveScrub(isPlaying: boolean, mode: 'spotify' | 'preview'): { pos: number; dur: number } {
  const [tick, setTick] = useState({ pos: 0, dur: 0 })
  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying
  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const loop = () => {
      if (stopped) return
      if (mode === 'preview') {
        const p = preview.getCurrentTimeMs()
        const d = preview.getDurationMs()
        setTick((prev) => (prev.pos === p && prev.dur === d ? prev : { pos: p, dur: d }))
      } else {
        const player = getPlayer()
        if (player) {
          player
            .getCurrentState()
            .then((state) => {
              if (stopped) return
              if (!state) {
                setTick((prev) => (prev.pos === 0 && prev.dur === 0 ? prev : { pos: 0, dur: 0 }))
                return
              }
              setTick({ pos: state.position, dur: state.duration })
              // Keep the store's playbackState fresh too, so other consumers
              // (end-of-side detection in Cafe.tsx) see live progress.
              useGameStore.getState().setPlaybackState(state)
            })
            .catch(() => null)
        }
      }
      timer = setTimeout(loop, SCRUB_TICK_MS)
    }
    loop()
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [mode])
  return tick
}

export default function NowPlaying() {
  const showNowPlaying = useGameStore((s) => s.showNowPlaying)
  const playbackState = useGameStore((s) => s.playbackState)
  const loadedAlbum = useGameStore((s) => s.loadedAlbum)
  const loadedSide = useGameStore((s) => s.loadedSide)
  const sideATracks = useGameStore((s) => s.sideATracks)
  const sideBTracks = useGameStore((s) => s.sideBTracks)
  const isPlaying = useGameStore((s) => s.isPlaying)
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const endOfSideReached = useGameStore((s) => s.endOfSideReached)
  const spotifyToken = useGameStore((s) => s.spotifyToken)
  const spotifyDeviceId = useGameStore((s) => s.spotifyDeviceId)
  const playbackMode = useGameStore((s) => s.playbackMode)

  const live = useLiveScrub(isPlaying, playbackMode)

  if (!showNowPlaying || !loadedAlbum) return null

  const track = playbackState?.track_window?.current_track
  // Prefer the live-polled position/duration; fall back to whatever the
  // Spotify SDK last told us if polling hasn't started yet.
  const pos = live.pos > 0 || live.dur > 0 ? live.pos : (playbackState?.position ?? 0)
  const dur = live.dur > 0 ? live.dur : (playbackState?.duration ?? 1)
  const progress = dur > 0 ? Math.min(1, pos / dur) : 0

  const sideTracks = loadedSide === 'A' ? sideATracks : sideBTracks
  const sideLabel = formatSideLabel(loadedSide, track?.uri, sideTracks)
  const timeLabel = getTimeLabel(timeOfDay)

  function handleSkipNext() {
    if (playbackMode === 'preview') {
      preview.nextTrack()
    } else {
      const p = getPlayer()
      if (p) p.nextTrack().catch(() => null)
    }
  }

  function handleSkipPrev() {
    if (playbackMode === 'preview') {
      preview.previousTrack()
    } else {
      const p = getPlayer()
      if (p) p.previousTrack().catch(() => null)
    }
  }

  function handlePlayTrack(index: number) {
    if (playbackMode === 'preview') {
      preview.playTrackAt(index)
      return
    }
    if (!spotifyToken || !spotifyDeviceId || sideTracks.length === 0) return
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${spotifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: sideTracks.map((t) => t.uri),
        offset: { position: index },
      }),
    }).catch(() => null)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        width: '260px',
        background: 'rgba(20, 12, 6, 0.92)',
        border: '1px solid #3a2418',
        padding: '12px',
        fontFamily: 'Courier New, monospace',
        zIndex: 50,
        imageRendering: 'pixelated',
      }}
    >
      {/* Album art + track info */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
        {loadedAlbum.artDataUrl && (
          <img
            src={loadedAlbum.artDataUrl}
            width={48}
            height={48}
            style={{ imageRendering: 'pixelated', flexShrink: 0 }}
            alt=""
          />
        )}
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div
            style={{
              fontSize: '10px',
              color: '#e8d5a8',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {track?.name ?? loadedAlbum.name}
          </div>
          <div style={{ fontSize: '9px', color: '#7a6050', marginTop: '2px' }}>
            {track?.artists?.[0]?.name ?? loadedAlbum.artists[0]?.name}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '3px',
          background: '#3a2418',
          marginBottom: '3px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progress * 100}%`,
            background: '#ffb56b',
          }}
        />
      </div>

      {/* Elapsed / total time */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '8px',
          color: '#6a5040',
          marginBottom: '6px',
        }}
      >
        <span>{formatMs(pos)}</span>
        <span>{formatMs(dur)}</span>
      </div>

      {/* Transport controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '6px' }}>
        <button
          onClick={handleSkipPrev}
          title="Previous track  [ [ ]"
          style={{
            background: 'none',
            border: 'none',
            color: '#8a7060',
            cursor: 'pointer',
            fontSize: '13px',
            padding: '2px 4px',
            lineHeight: 1,
          }}
        >
          ◀◀
        </button>
        <button
          onClick={handleSkipNext}
          title="Next track  [ ] ]"
          style={{
            background: 'none',
            border: 'none',
            color: '#8a7060',
            cursor: 'pointer',
            fontSize: '13px',
            padding: '2px 4px',
            lineHeight: 1,
          }}
        >
          ▶▶
        </button>
      </div>

      {/* Side label + time */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '9px',
          color: '#6a5040',
          marginBottom: '4px',
        }}
      >
        <span style={{ color: '#c8a060' }}>{sideLabel}</span>
        <span>{timeLabel}</span>
      </div>

      {/* Status */}
      <div style={{ fontSize: '8px', color: '#4a3828' }}>
        {isPlaying ? '▶ PLAYING' : '■ STOPPED'}
        {endOfSideReached && (
          <span style={{ color: '#cc8833', marginLeft: '8px' }}>
            FLIP RECORD? [F]
          </span>
        )}
      </div>

      {/* Track list for current side */}
      {sideTracks.length > 0 && (
        <div
          style={{
            marginTop: '8px',
            borderTop: '1px solid #2a1810',
            paddingTop: '6px',
            maxHeight: '130px',
            overflowY: 'auto',
          }}
        >
          {sideTracks.map((t, i) => {
            const isCurrent = track?.uri === t.uri
            return (
              <div
                key={t.id}
                onClick={() => handlePlayTrack(i)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '2px 4px',
                  marginBottom: '1px',
                  fontSize: '8px',
                  color: isCurrent ? '#ffb56b' : '#5a4030',
                  background: isCurrent ? 'rgba(255,181,107,0.08)' : 'transparent',
                  borderLeft: isCurrent ? '2px solid #ffb56b' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {i + 1}. {t.name}
                </span>
                <span style={{ marginLeft: '6px', flexShrink: 0, color: '#3a2818' }}>
                  {formatMs(t.duration_ms)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
