'use client'

import { useGameStore } from '@/lib/game/store'
import { setSpotifyVolume } from '@/lib/spotify/player'
import { playSound } from '@/lib/audio/howlerSetup'

export default function TurntableControls() {
  const view = useGameStore((s) => s.view)
  const platterRpm = useGameStore((s) => s.platterRpm)
  const setPlatterRpm = useGameStore((s) => s.setPlatterRpm)
  const volume = useGameStore((s) => s.volume)
  const setVolume = useGameStore((s) => s.setVolume)
  const autoFlip = useGameStore((s) => s.autoFlip)
  const setAutoFlip = useGameStore((s) => s.setAutoFlip)
  const setView = useGameStore((s) => s.setView)
  const spotifyToken = useGameStore((s) => s.spotifyToken)
  const spotifyDeviceId = useGameStore((s) => s.spotifyDeviceId)
  const endOfSideReached = useGameStore((s) => s.endOfSideReached)
  const flipLoadedRecord = useGameStore((s) => s.flipLoadedRecord)
  const setEndOfSideReached = useGameStore((s) => s.setEndOfSideReached)
  const tonearmState = useGameStore((s) => s.tonearmState)
  const setTonearmState = useGameStore((s) => s.setTonearmState)

  if (view !== 'turntable-top-down') return null

  function handleVolumeChange(v: number) {
    setVolume(v)
    if (spotifyToken) {
      setSpotifyVolume(spotifyToken, v)
    }
  }

  function handleFlip() {
    flipLoadedRecord()
    setEndOfSideReached(false)
    setTonearmState('rest')
    playSound('recordFlip')
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        background: 'rgba(10, 8, 6, 0.85)',
        border: '1px solid #2a1810',
        padding: '12px',
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
        color: '#a08060',
        zIndex: 50,
        minWidth: '180px',
      }}
    >
      <div style={{ marginBottom: '8px', color: '#e8d5a8', letterSpacing: '0.1em' }}>
        TURNTABLE
      </div>

      {/* RPM toggle */}
      <div style={{ marginBottom: '8px' }}>
        <span style={{ marginRight: '8px' }}>RPM:</span>
        {([33, 45] as const).map((rpm) => (
          <button
            key={rpm}
            onClick={() => { setPlatterRpm(rpm); playSound('switchClick') }}
            style={{
              background: platterRpm === rpm ? '#ffb56b' : '#1a1008',
              color: platterRpm === rpm ? '#1a0800' : '#7a5030',
              border: '1px solid #3a2010',
              padding: '2px 8px',
              marginRight: '4px',
              fontFamily: 'Courier New, monospace',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            {rpm}
          </button>
        ))}
      </div>

      {/* Volume */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ marginBottom: '4px' }}>VOL: {Math.round(volume * 100)}</div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#ffb56b' }}
        />
      </div>

      {/* Auto-flip toggle */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox"
            checked={autoFlip}
            onChange={(e) => setAutoFlip(e.target.checked)}
            style={{ accentColor: '#ffb56b' }}
          />
          AUTO-FLIP
        </label>
      </div>

      {/* Flip button (when end of side) */}
      {endOfSideReached && (
        <button
          onClick={handleFlip}
          style={{
            background: '#cc8833',
            color: '#1a0800',
            border: 'none',
            padding: '6px 12px',
            fontFamily: 'Courier New, monospace',
            fontSize: '10px',
            cursor: 'pointer',
            width: '100%',
            marginBottom: '8px',
            letterSpacing: '0.1em',
          }}
        >
          FLIP RECORD [F]
        </button>
      )}

      {/* Tonearm status */}
      <div style={{ color: '#5a4030', fontSize: '9px', marginBottom: '8px' }}>
        TONEARM: {tonearmState.toUpperCase()}
        {' · '}
        <span
          style={{ cursor: 'pointer', color: '#7a6040' }}
          onClick={() => { setTonearmState('rest'); playSound('switchClick') }}
        >
          [LIFT]
        </span>
      </div>

      {/* Exit button */}
      <button
        onClick={() => setView('first-person')}
        style={{
          background: 'transparent',
          color: '#6a5040',
          border: '1px solid #2a1810',
          padding: '4px 12px',
          fontFamily: 'Courier New, monospace',
          fontSize: '9px',
          cursor: 'pointer',
          width: '100%',
          letterSpacing: '0.1em',
        }}
      >
        STAND BACK [ESC]
      </button>
    </div>
  )
}
