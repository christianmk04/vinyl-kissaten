'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import { useGameStore } from '@/lib/game/store'
import { playSound } from '@/lib/audio/howlerSetup'
import {
  startVinylEffects,
  setRpm,
  setPitchAmount,
  setBrightnessAmount,
  getEffectsStatus,
} from '@/lib/audio/vinylEffects'
import * as preview from '@/lib/audio/previewPlayer'

const ROW: React.CSSProperties = { marginBottom: '8px' }
const LABEL: React.CSSProperties = { display: 'block', marginBottom: '3px', color: '#7a6040', fontSize: '9px', letterSpacing: '0.08em' }
const SLIDER: React.CSSProperties = { width: '100%', accentColor: '#ffb56b' }
const DIVIDER: React.CSSProperties = { borderTop: '1px solid #2a1810', margin: '8px 0' }

function signedPct(v: number) {
  const pct = Math.round(v * 100)
  return (pct >= 0 ? '+' : '') + pct
}

export default function TurntableControls() {
  const view = useGameStore((s) => s.view)
  const platterRpm = useGameStore((s) => s.platterRpm)
  const setPlatterRpm = useGameStore((s) => s.setPlatterRpm)
  const volume = useGameStore((s) => s.volume)
  const setVolume = useGameStore((s) => s.setVolume)
  const autoFlip = useGameStore((s) => s.autoFlip)
  const setAutoFlip = useGameStore((s) => s.setAutoFlip)
  const setView = useGameStore((s) => s.setView)
  const endOfSideReached = useGameStore((s) => s.endOfSideReached)
  const flipLoadedRecord = useGameStore((s) => s.flipLoadedRecord)
  const setEndOfSideReached = useGameStore((s) => s.setEndOfSideReached)
  const tonearmState = useGameStore((s) => s.tonearmState)
  const setTonearmState = useGameStore((s) => s.setTonearmState)

  const brightness = useGameStore((s) => s.brightness)
  const setBrightness = useGameStore((s) => s.setBrightness)
  const pitch = useGameStore((s) => s.pitch)
  const setPitch = useGameStore((s) => s.setPitch)
  const pitchRange = useGameStore((s) => s.pitchRange)

  const previewError = useGameStore((s) => s.previewError)
  const mobileTurntableTab = useGameStore((s) => s.mobileTurntableTab)

  const [fxStatus, setFxStatus] = useState<'idle' | 'rate' | 'full' | 'blocked'>('idle')
  useEffect(() => {
    if (view !== 'turntable-top-down') return
    const id = setInterval(() => setFxStatus(getEffectsStatus()), 500)
    return () => clearInterval(id)
  }, [view])

  if (view !== 'turntable-top-down') return null

  function handleVolumeChange(v: number) {
    setVolume(v)
    preview.setVolume(v)
  }

  function handleRpm(rpm: 33 | 45 | 78) {
    setPlatterRpm(rpm)
    startVinylEffects()
    setRpm(rpm)
    preview.setRpm(rpm)
    playSound('switchClick')
  }

  function handlePitch(v: number) {
    setPitch(v)
    startVinylEffects()
    setPitchAmount(v)
    preview.setPitch(v)
  }

  function handleBrightness(v: number) {
    setBrightness(v)
    startVinylEffects()
    setBrightnessAmount(v)
    preview.setBrightness(v)
  }

  function handleFlip() {
    flipLoadedRecord()
    setEndOfSideReached(false)
    setTonearmState('rest')
    playSound('recordFlip')
  }

  // On touch devices, the bottom-right is reserved for the big PLAY button
  // and the bottom-left for the now-playing panel (and hint text). Anchor the
  // controls panel to the top-right instead so the three never stack on each
  // other on a phone-sized screen. We also cap the height with overflow so
  // long FX columns don't run off-screen.
  const isTouch =
    typeof window !== 'undefined' && 'ontouchstart' in window

  // On mobile, this panel lives behind the DECK tab and yields the screen to
  // NowPlaying when the user is on the TRACKS tab. Desktop ignores the tab
  // state entirely and always renders.
  if (isTouch && mobileTurntableTab !== 'deck') return null

  return (
    <div style={{
      position: 'fixed',
      // Mobile sits below the tab bar (top:16, height ~32). Desktop unchanged.
      ...(isTouch
        ? { top: '60px', right: '16px', maxHeight: 'calc(100vh - 76px)', overflowY: 'auto' as const }
        : { bottom: '16px', right: '16px' }),
      background: 'rgba(8, 6, 4, 0.92)',
      border: '1px solid #2a1810',
      padding: '12px 14px',
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      color: '#a08060',
      zIndex: 50,
      width: isTouch ? '180px' : '200px',
    }}>
      <div style={{ marginBottom: '10px', color: '#e8d5a8', letterSpacing: '0.12em', fontSize: '11px' }}>
        TURNTABLE
      </div>

      {previewError && (
        <div style={{
          marginBottom: '10px',
          padding: '5px 7px',
          background: 'rgba(120, 40, 30, 0.4)',
          border: '1px solid #6a2a20',
          color: '#ddaa88',
          fontSize: '8px',
          lineHeight: '1.4',
        }}>
          ⚠ {previewError}
        </div>
      )}

      <div style={ROW}>
        <span style={LABEL}>VOLUME  {Math.round(volume * 100)}</span>
        <input
          type="range" min={0} max={1} step={0.05} value={volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          style={SLIDER}
        />
      </div>

      <div style={DIVIDER} />

      {/* RPM presets — change song speed */}
      <div style={ROW}>
        <span style={LABEL}>RPM</span>
        {([33, 45, 78] as const).map((rpm) => (
          <button
            key={rpm}
            onClick={() => handleRpm(rpm)}
            style={{
              background: platterRpm === rpm ? '#ffb56b' : '#1a1008',
              color: platterRpm === rpm ? '#1a0800' : '#7a5030',
              border: '1px solid #3a2010',
              padding: '2px 7px',
              marginRight: '4px',
              fontFamily: 'Courier New, monospace',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >{rpm}</button>
        ))}
      </div>

      {/* Pitch fader — simple ±50% slider */}
      <div style={ROW}>
        <span style={LABEL}>
          PITCH  {signedPct(pitch * (pitchRange / 100))}%
        </span>
        <input
          type="range" min={-1} max={1} step={0.01} value={pitch}
          onChange={(e) => handlePitch(Number(e.target.value))}
          style={SLIDER}
        />
      </div>

      {/* Tone — peaking presence + air shelf */}
      <div style={ROW}>
        <span style={LABEL}>TONE  {signedPct(brightness)}</span>
        <input
          type="range" min={-1} max={1} step={0.05} value={brightness}
          onChange={(e) => handleBrightness(Number(e.target.value))}
          style={SLIDER}
        />
      </div>

      <div style={DIVIDER} />

      <div style={ROW}>
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox" checked={autoFlip}
            onChange={(e) => setAutoFlip(e.target.checked)}
            style={{ accentColor: '#ffb56b' }}
          />
          AUTO-FLIP
        </label>
      </div>

      {endOfSideReached && (
        <button
          onClick={handleFlip}
          style={{
            background: '#cc8833', color: '#1a0800', border: 'none',
            padding: '6px 12px', fontFamily: 'Courier New, monospace', fontSize: '10px',
            cursor: 'pointer', width: '100%', marginBottom: '8px', letterSpacing: '0.1em',
          }}
        >
          FLIP RECORD [F]
        </button>
      )}

      {/* FX status — honest readout of whether the Web Audio FX chain is
          actually wired into the playback. CORS-tainted preview URLs can
          downgrade us to rate-only or no-FX; this surfaces that. */}
      <div style={{
        color: fxStatus === 'full' ? '#7aaa55' : fxStatus === 'rate' ? '#ccaa55' : '#aa6644',
        fontSize: '8px',
        marginBottom: '6px',
        lineHeight: '1.35',
        letterSpacing: '0.05em',
      }}>
        {fxStatus === 'full' && '● VINYL FX: ACTIVE (RPM · pitch · tone)'}
        {fxStatus === 'rate' && '● VINYL FX: RATE ONLY (CORS-tainted source)'}
        {fxStatus === 'blocked' && '● VINYL FX: BLOCKED'}
        {fxStatus === 'idle' && '● VINYL FX: IDLE'}
      </div>

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

      <button
        onClick={() => setView('first-person')}
        style={{
          background: 'transparent', color: '#6a5040', border: '1px solid #2a1810',
          padding: '4px 12px', fontFamily: 'Courier New, monospace', fontSize: '9px',
          cursor: 'pointer', width: '100%', letterSpacing: '0.1em',
        }}
      >
        STAND BACK [ESC]
      </button>
    </div>
  )
}
