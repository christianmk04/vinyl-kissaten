'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { usePlayerMovement } from '@/lib/game/usePlayerMovement'
import { interactions } from '@/lib/game/interactions'
import { mobileInput, resetMobileInput } from '@/lib/game/mobileInput'

const LOOK_SENSITIVITY = 0.0035
// Distance (px) a touch can move and still be treated as a tap rather than
// a drag-look. Anything past this threshold becomes a look gesture.
const TAP_SLOP = 8
const TAP_MAX_MS = 280

type LookState = {
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  startTime: number
  moved: boolean
}

// Mobile pointer/touch handling for the canvas. Listens to pointerdown/move/up
// on the canvas DOM element ONLY. The joystick + ACT button own their own
// pointer events at higher z-index, so they swallow their own touches before
// they reach the canvas. HTML overlays (auth gate, instructions, shelf nav,
// settings, turntable controls, NowPlaying) likewise sit above the canvas
// and never receive interference from the controls below.
//
// Critically: we do NOT call e.preventDefault() inside touchstart anywhere —
// doing so cancels the synthesized click events that overlay buttons rely on.
export default function MobileControls() {
  const { camera, raycaster, scene, gl } = useThree()
  const view = useGameStore((s) => s.view)

  // Active "look" pointer (one at a time — we ignore additional simultaneous
  // canvas touches so the player can't twist the camera by surprise).
  const lookRef = useRef<LookState | null>(null)
  // Accumulated look delta consumed once per frame in useFrame.
  const lookDeltaRef = useRef({ x: 0, y: 0 })
  const cameraRotRef = useRef({ yaw: 0, pitch: 0 })

  useEffect(() => {
    camera.rotation.order = 'YXZ'
  }, [camera])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.style.touchAction = 'none' // we handle touch ourselves

    const onPointerDown = (e: PointerEvent) => {
      // Only respond to touch / pen / first-button mouse on the canvas.
      // Multi-touch on the canvas: the SECOND simultaneous touch toggles
      // now-playing (the existing two-finger gesture).
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen' && e.pointerType !== 'mouse') return

      // Two-finger gesture: a second pointerdown fires while the first is
      // still capturing. Toggle the now-playing panel and bail.
      if (lookRef.current && e.pointerType === 'touch') {
        useGameStore.getState().toggleNowPlaying()
        return
      }

      try {
        canvas.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      lookRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        startTime: performance.now(),
        moved: false,
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const look = lookRef.current
      if (!look || e.pointerId !== look.pointerId) return

      const dx = e.clientX - look.lastX
      const dy = e.clientY - look.lastY

      // Once the pointer has moved past the tap threshold, latch into "drag-
      // look" mode so a flick at the end of a movement doesn't get
      // misclassified as a tap.
      if (!look.moved) {
        const totalDx = e.clientX - look.startX
        const totalDy = e.clientY - look.startY
        if (Math.hypot(totalDx, totalDy) > TAP_SLOP) {
          look.moved = true
        }
      }

      if (look.moved) {
        lookDeltaRef.current.x += dx * LOOK_SENSITIVITY
        lookDeltaRef.current.y += dy * LOOK_SENSITIVITY
      }

      look.lastX = e.clientX
      look.lastY = e.clientY
    }

    const onPointerUp = (e: PointerEvent) => {
      const look = lookRef.current
      if (!look || e.pointerId !== look.pointerId) return

      try {
        canvas.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }

      const elapsed = performance.now() - look.startTime
      // Tap = short time + minimal movement → fire interaction at tap point
      if (!look.moved && elapsed < TAP_MAX_MS) {
        fireInteraction(e.clientX, e.clientY)
      }
      lookRef.current = null
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
    }
  }, [gl])

  // ACT button bridge — fires either a turntable-control cycle (when the
  // top-down view is active and a record is loaded) or a center-of-screen
  // raycast interact, mirroring the desktop "E" key behaviour.
  useEffect(() => {
    const onInteract = () => {
      const currentView = useGameStore.getState().view
      if (currentView === 'turntable-top-down') {
        const s = useGameStore.getState()
        if (!s.loadedAlbum) return
        // Mobile shortcut: a single tap goes from rest → playing directly,
        // skipping the cosmetic 'cued' half-step. Touch users found the
        // cue-then-play double-tap unintuitive (no needle to lift here, the
        // PLAY label promises playback). The desktop tonearm meshes still
        // expose the full 3-step cycle for users who want it.
        if (s.tonearmState === 'playing') s.setTonearmState('rest')
        else s.setTonearmState('playing')
      } else {
        fireInteraction(window.innerWidth / 2, window.innerHeight / 2)
      }
    }
    document.addEventListener('mobile-interact', onInteract)
    return () => document.removeEventListener('mobile-interact', onInteract)
  }, [])

  // Reset joystick + look state when leaving the page / tab to avoid the
  // mobile equivalent of a "stuck Shift" key.
  useEffect(() => {
    const onBlur = () => {
      resetMobileInput()
      lookDeltaRef.current = { x: 0, y: 0 }
      if (lookRef.current) lookRef.current = null
    }
    const onVisibility = () => {
      if (document.hidden) onBlur()
    }
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  function fireInteraction(clientX: number, clientY: number) {
    const rect = gl.domElement.getBoundingClientRect()
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)
    const hits = raycaster.intersectObjects(scene.children, true)
    for (const hit of hits) {
      if (hit.distance > 3.5) break
      let obj: THREE.Object3D | null = hit.object
      while (obj) {
        if (interactions.has(obj.uuid)) {
          interactions.fire(obj.uuid)
          return
        }
        obj = obj.parent
      }
    }
  }

  // Apply accumulated look delta exactly once per frame so multiple
  // pointermoves between frames combine cleanly.
  useFrame(() => {
    if (view !== 'first-person') return
    if (lookDeltaRef.current.x !== 0 || lookDeltaRef.current.y !== 0) {
      cameraRotRef.current.yaw -= lookDeltaRef.current.x
      cameraRotRef.current.pitch = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, cameraRotRef.current.pitch - lookDeltaRef.current.y),
      )
      camera.rotation.y = cameraRotRef.current.yaw
      camera.rotation.x = cameraRotRef.current.pitch
      lookDeltaRef.current.x = 0
      lookDeltaRef.current.y = 0
    }
  })

  // Forward joystick deflection into shared movement code. Y is inverted
  // because pulling the thumb DOWN on screen produces a positive screen-y,
  // but we want that to mean "walk backwards" in world space.
  usePlayerMovement(() => ({
    forward: -mobileInput.joystick.y,
    right: mobileInput.joystick.x,
    slow: false,
  }))

  return null
}
