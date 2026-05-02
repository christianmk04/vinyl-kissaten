'use client'

import { useGameStore } from '@/lib/game/store'
import { formatSideLabel } from '@/lib/spotify/sides'
import { getTimeLabel } from '@/lib/game/dayNight'

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

  if (!showNowPlaying || !loadedAlbum) return null

  const track = playbackState?.track_window?.current_track
  const pos = playbackState?.position ?? 0
  const dur = playbackState?.duration ?? 1
  const progress = Math.min(1, pos / dur)

  const sideTracks = loadedSide === 'A' ? sideATracks : sideBTracks
  const sideLabel = formatSideLabel(
    loadedSide,
    track?.uri,
    sideTracks,
  )
  const timeLabel = getTimeLabel(timeOfDay)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        width: '240px',
        background: 'rgba(20, 12, 6, 0.88)',
        border: '1px solid #3a2418',
        padding: '12px',
        fontFamily: 'Courier New, monospace',
        zIndex: 50,
        imageRendering: 'pixelated',
      }}
    >
      {/* Album art */}
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
        <div style={{ overflow: 'hidden' }}>
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
          marginBottom: '6px',
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

      {/* Side label + time */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '9px',
          color: '#6a5040',
        }}
      >
        <span style={{ color: '#c8a060' }}>{sideLabel}</span>
        <span>{timeLabel}</span>
      </div>

      {/* Status indicator */}
      <div style={{ fontSize: '8px', color: '#4a3828', marginTop: '4px' }}>
        {isPlaying ? '▶ PLAYING' : '■ STOPPED'}
        {endOfSideReached && (
          <span style={{ color: '#cc8833', marginLeft: '8px' }}>
            FLIP RECORD? [F]
          </span>
        )}
      </div>
    </div>
  )
}
