'use client'

import { useEffect, useRef } from 'react'
import { mobileInput } from '@/lib/game/mobileInput'
import { useGameStore } from '@/lib/game/store'

const JOYSTICK_RADIUS = 55 // px — max distance from origin the thumb travels

// Visual joystick (left bottom) + ACT button (right bottom).
//
// Why this owns its own pointer handlers (instead of MobileControls listening
// document-wide like before): the previous implementation called
// `e.preventDefault()` on every document-level touchstart, which cancels the
// synthesized `click` event the browser would otherwise fire. That broke
// every tappable HTML element on mobile (auth gate, instructions screen,
// shelf nav buttons, settings, etc.). Scoping touch handling to the
// joystick element + the canvas (in MobileControls) means HTML overlays
// receive their pointer events normally.
export default function MobileJoystick() {
  const originRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  // We track the active pointer ID so a second finger landing on the
  // joystick doesn't fight the first.
  const pointerIdRef = useRef<number | null>(null)

  // Hide the joystick when the player is at the turntable (top-down view) —
  // there's nothing to walk to from here, the deck is the entire screen, so
  // the joystick is just visual clutter overlapping the now-playing panel.
  // The ACT button stays so the user has a one-tap PLAY/PAUSE.
  const view = useGameStore((s) => s.view)
  const isAtTurntable = view === 'turntable-top-down'
  const isPlaying = useGameStore((s) => s.isPlaying)
  const tonearmState = useGameStore((s) => s.tonearmState)

  // ACT button label: in the cafe it's a generic "ACT" tap. At the deck it's
  // the primary play/pause/cue cycle, so we surface that intent directly.
  let actLabel = 'ACT'
  if (isAtTurntable) {
    if (tonearmState === 'playing' || isPlaying) actLabel = 'STOP'
    else if (tonearmState === 'cued') actLabel = 'PLAY'
    else actLabel = 'PLAY'
  }

  useEffect(() => {
    const origin = originRef.current
    const thumb = thumbRef.current
    if (!origin || !thumb) return

    const onDown = (e: PointerEvent) => {
      if (pointerIdRef.current !== null) return
      pointerIdRef.current = e.pointerId
      try {
        origin.setPointerCapture(e.pointerId)
      } catch {
        /* setPointerCapture can throw if the pointer is gone already; ignore */
      }
      updateFromPointer(e)
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return
      updateFromPointer(e)
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return
      pointerIdRef.current = null
      mobileInput.joystick.x = 0
      mobileInput.joystick.y = 0
      thumb.style.transform = 'translate(0px, 0px)'
      try {
        origin.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    function updateFromPointer(e: PointerEvent) {
      if (!origin || !thumb) return
      const rect = origin.getBoundingClientRect()
      const ox = rect.left + rect.width / 2
      const oy = rect.top + rect.height / 2
      const dx = e.clientX - ox
      const dy = e.clientY - oy
      const dist = Math.hypot(dx, dy)
      const clamped = Math.min(dist, JOYSTICK_RADIUS)
      const angle = Math.atan2(dy, dx)
      const tx = Math.cos(angle) * clamped
      const ty = Math.sin(angle) * clamped
      thumb.style.transform = `translate(${tx}px, ${ty}px)`
      mobileInput.joystick.x = tx / JOYSTICK_RADIUS
      mobileInput.joystick.y = ty / JOYSTICK_RADIUS
    }

    origin.addEventListener('pointerdown', onDown)
    origin.addEventListener('pointermove', onMove)
    origin.addEventListener('pointerup', onUp)
    origin.addEventListener('pointercancel', onUp)
    return () => {
      origin.removeEventListener('pointerdown', onDown)
      origin.removeEventListener('pointermove', onMove)
      origin.removeEventListener('pointerup', onUp)
      origin.removeEventListener('pointercancel', onUp)
    }
  }, [])

  function onInteract(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault()
    document.dispatchEvent(new CustomEvent('mobile-interact'))
  }

  return (
    <>
      {/* Joystick origin — interactive (captures its own pointer events).
          Hidden at the turntable since walking is meaningless there. */}
      <div
        ref={originRef}
        id="joystick-origin"
        style={{
          position: 'fixed',
          bottom: '30px',
          left: '30px',
          width: '130px',
          height: '130px',
          borderRadius: '50%',
          background: 'rgba(232, 213, 168, 0.08)',
          border: '1px solid rgba(232, 213, 168, 0.3)',
          display: isAtTurntable ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          touchAction: 'none', // tells the browser we'll handle the touch
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div
          ref={thumbRef}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'rgba(255, 181, 107, 0.45)',
            border: '2px solid rgba(255, 181, 107, 0.8)',
            transition: 'transform 0.05s linear',
            willChange: 'transform',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ACT button — keeps its own pointer-down so a tap fires the
          interaction immediately without waiting for the synthetic click */}
      <button
        id="interact-btn"
        onPointerDown={onInteract}
        style={{
          position: 'fixed',
          bottom: '40px',
          right: '40px',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(255, 181, 107, 0.18)',
          border: '2px solid rgba(255, 181, 107, 0.6)',
          color: '#e8d5a8',
          fontFamily: 'Courier New, monospace',
          fontSize: '11px',
          letterSpacing: '0.05em',
          cursor: 'pointer',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'none',
        }}
      >
        {actLabel}
      </button>

      {/* Subtle right-side hint — hidden at the turntable, where the visible
          deck + on-screen "ACT cue/play/rest..." hint already explains what
          the button does. */}
      {!isAtTurntable && (
        <div
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '120px',
            fontFamily: 'Courier New, monospace',
            fontSize: '9px',
            color: 'rgba(138, 112, 96, 0.5)',
            letterSpacing: '0.1em',
            pointerEvents: 'none',
            zIndex: 60,
          }}
        >
          DRAG TO LOOK · TAP TO INTERACT
        </div>
      )}
    </>
  )
}
