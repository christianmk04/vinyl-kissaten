'use client'

import { useState } from 'react'
import { useGameStore } from '@/lib/game/store'

export default function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const showCRTOverlay = useGameStore((s) => s.showCRTOverlay)
  const toggleCRTOverlay = useGameStore((s) => s.toggleCRTOverlay)
  const showBarrelDistortion = useGameStore((s) => s.showBarrelDistortion)
  const toggleBarrelDistortion = useGameStore((s) => s.toggleBarrelDistortion)
  const showFlicker = useGameStore((s) => s.showFlicker)
  const toggleFlicker = useGameStore((s) => s.toggleFlicker)
  const cycleSpeed = useGameStore((s) => s.cycleSpeed)
  const setCycleSpeed = useGameStore((s) => s.setCycleSpeed)
  const view = useGameStore((s) => s.view)

  // The CFG button shares the top-right corner with the mobile DECK / TRACKS
  // tab bar. There's no room for both on a phone-sized viewport (the tab bar
  // is 180px wide, CFG is ~70px, screen ~360px), and the visual-effect
  // toggles aren't meaningful while you're on the deck anyway. Suppress
  // here so tabs own that corner cleanly during turntable mode on touch.
  const isTouch =
    typeof window !== 'undefined' && 'ontouchstart' in window
  if (isTouch && view === 'turntable-top-down') return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 60,
        fontFamily: 'Courier New, monospace',
        fontSize: '10px',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'rgba(10, 8, 6, 0.7)',
          border: '1px solid #2a1810',
          color: '#7a6050',
          padding: '4px 8px',
          cursor: 'pointer',
          fontFamily: 'Courier New, monospace',
          fontSize: '10px',
          letterSpacing: '0.1em',
        }}
      >
        ⚙ CFG
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '28px',
            right: 0,
            background: 'rgba(10, 8, 6, 0.92)',
            border: '1px solid #2a1810',
            padding: '10px',
            minWidth: '160px',
            color: '#a08060',
          }}
        >
          <div style={{ marginBottom: '10px', color: '#e8d5a8', letterSpacing: '0.1em' }}>
            SETTINGS
          </div>
          {[
            { label: 'CRT Scanlines', val: showCRTOverlay, toggle: toggleCRTOverlay },
            { label: 'Barrel Distort', val: showBarrelDistortion, toggle: toggleBarrelDistortion },
            { label: 'Screen Flicker', val: showFlicker, toggle: toggleFlicker },
          ].map(({ label, val, toggle }) => (
            <label
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={val}
                onChange={toggle}
                style={{ accentColor: '#ffb56b' }}
              />
              {label}
            </label>
          ))}

          <div style={{ marginTop: '8px' }}>
            <div style={{ marginBottom: '4px' }}>
              DAY CYCLE: {cycleSpeed.toFixed(1)}×
            </div>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={cycleSpeed}
              onChange={(e) => setCycleSpeed(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#ffb56b' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
