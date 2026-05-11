'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import { useGameStore } from '@/lib/game/store'
import { formatSideLabel } from '@/lib/spotify/sides'
import { getTimeLabel } from '@/lib/game/dayNight'
import * as preview from '@/lib/audio/previewPlayer'

const SCRUB_TICK_MS = 250

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Hook: ticks 4× per second to refresh the scrub bar by reading currentTime
// directly off the preview <audio> element.
function useLiveScrub(): { pos: number; dur: number } {
  const [tick, setTick] = useState({ pos: 0, dur: 0 })
  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const loop = () => {
      if (stopped) return
      const p = preview.getCurrentTimeMs()
      const d = preview.getDurationMs()
      setTick((prev) => (prev.pos === p && prev.dur === d ? prev : { pos: p, dur: d }))
      timer = setTimeout(loop, SCRUB_TICK_MS)
    }
    loop()
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [])
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

  const view = useGameStore((s) => s.view)
  const mobileTurntableTab = useGameStore((s) => s.mobileTurntableTab)
  const live = useLiveScrub()

  if (!showNowPlaying || !loadedAlbum) return null

  const isTouch =
    typeof window !== 'undefined' && 'ontouchstart' in window
  // Mobile show-rules:
  //   • cafe view: never (it's clutter on a phone — duplicate of info on the
  //     deck and competes with the joystick / ACT button for screen space).
  //   • turntable + DECK tab: hidden (controls panel takes the same slot).
  //   • turntable + TRACKS tab: shown at top-right under the tab bar.
  // Desktop ignores both rules and always renders.
  const isMobileTurntable = isTouch && view === 'turntable-top-down'
  if (isTouch && !isMobileTurntable) return null
  if (isMobileTurntable && mobileTurntableTab !== 'tracks') return null

  const track = playbackState?.track_window?.current_track
  // Prefer the live-polled position/duration; fall back to whatever was
  // last synthesized into playbackState if polling hasn't started yet.
  const pos = live.pos > 0 || live.dur > 0 ? live.pos : (playbackState?.position ?? 0)
  const dur = live.dur > 0 ? live.dur : (playbackState?.duration ?? 1)
  const progress = dur > 0 ? Math.min(1, pos / dur) : 0

  const sideTracks = loadedSide === 'A' ? sideATracks : sideBTracks
  const sideLabel = formatSideLabel(loadedSide, track?.uri, sideTracks)
  const timeLabel = getTimeLabel(timeOfDay)

  function handleSkipNext() {
    preview.nextTrack()
  }

  function handleSkipPrev() {
    preview.previousTrack()
  }

  function handlePlayTrack(index: number) {
    preview.playTrackAt(index)
  }

  // Three layouts to consider:
  //  - Desktop (any view): bottom-left, 260px wide. Original spec.
  //  - Mobile cafe view: bottom-left but lifted above the joystick (which
  //    sits at bottom:30 height:130 → top edge ~160px), clamped width so it
  //    can't crash into the PLAY button on narrow screens.
  //  - Mobile turntable view (TRACKS tab): top-right under the tab bar,
  //    matching the deck-controls panel anchor so flipping tabs feels like
  //    the same surface swapping content.
  const panelStyle: React.CSSProperties = isMobileTurntable
    ? { top: '60px', right: '16px', width: '220px', maxHeight: 'calc(100vh - 76px)', overflowY: 'auto' }
    : isTouch
      ? { bottom: '180px', left: '12px', width: 'min(220px, calc(100vw - 140px))' }
      : { bottom: '24px', left: '24px', width: '260px' }

  return (
    <div
      style={{
        position: 'fixed',
        ...panelStyle,
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
