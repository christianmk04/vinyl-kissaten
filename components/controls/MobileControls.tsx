'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { usePlayerMovement } from '@/lib/game/usePlayerMovement'
import { interactions } from '@/lib/game/interactions'

const JOYSTICK_RADIUS = 55
const LOOK_SENSITIVITY = 0.003

export default function MobileControls() {
  const { camera, raycaster, scene } = useThree()
  const view = useGameStore((s) => s.view)

  const joystickRef = useRef({ x: 0, y: 0, touchId: -1 })
  const lookRef = useRef({ startX: 0, startY: 0, touchId: -1 })
  const lookDeltaRef = useRef({ x: 0, y: 0 })
  const cameraRotRef = useRef({ yaw: 0, pitch: 0 })

  useEffect(() => {
    camera.rotation.order = 'YXZ'
  }, [camera])

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()

      // Two-finger tap → toggle now-playing
      if (e.touches.length === 2) {
        useGameStore.getState().toggleNowPlaying()
        return
      }

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        const isLeft = touch.clientX < window.innerWidth * 0.45

        if (isLeft && joystickRef.current.touchId === -1) {
          joystickRef.current.touchId = touch.identifier
          joystickRef.current.x = 0
          joystickRef.current.y = 0
          updateJoystickOrigin(touch.clientX, touch.clientY)
        } else if (!isLeft && lookRef.current.touchId === -1) {
          lookRef.current = { startX: touch.clientX, startY: touch.clientY, touchId: touch.identifier }
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]

        if (touch.identifier === joystickRef.current.touchId) {
          const originEl = document.getElementById('joystick-origin')
          if (!originEl) continue
          const rect = originEl.getBoundingClientRect()
          const ox = rect.left + rect.width / 2
          const oy = rect.top + rect.height / 2
          const dx = touch.clientX - ox
          const dy = touch.clientY - oy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const clamped = Math.min(dist, JOYSTICK_RADIUS)
          const angle = Math.atan2(dy, dx)
          joystickRef.current.x = (Math.cos(angle) * clamped) / JOYSTICK_RADIUS
          joystickRef.current.y = (Math.sin(angle) * clamped) / JOYSTICK_RADIUS
          const thumb = document.getElementById('joystick-thumb')
          if (thumb) {
            thumb.style.transform = `translate(${Math.cos(angle) * clamped}px, ${Math.sin(angle) * clamped}px)`
          }
        }

        if (touch.identifier === lookRef.current.touchId) {
          lookDeltaRef.current.x += (touch.clientX - lookRef.current.startX) * LOOK_SENSITIVITY
          lookDeltaRef.current.y += (touch.clientY - lookRef.current.startY) * LOOK_SENSITIVITY
          lookRef.current.startX = touch.clientX
          lookRef.current.startY = touch.clientY
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        if (touch.identifier === joystickRef.current.touchId) {
          joystickRef.current = { x: 0, y: 0, touchId: -1 }
          const thumb = document.getElementById('joystick-thumb')
          if (thumb) thumb.style.transform = 'translate(0px, 0px)'
        }
        if (touch.identifier === lookRef.current.touchId) {
          lookRef.current = { startX: 0, startY: 0, touchId: -1 }
        }
      }
    }

    // Single tap on right side → interact (separate from joystick end)
    const handleTap = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        // Only treat as interaction tap if it was a short, non-moved right-side touch
        if (touch.clientX > window.innerWidth * 0.45) {
          fireInteraction(touch.clientX, touch.clientY)
        }
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
    // Don't attach handleTap to touchend for ALL touches — use a dedicated listener
    // for right-side single tap only, to avoid joystick-release triggering interaction
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  // Interact button fires from center OR handles turntable
  useEffect(() => {
    const onInteract = () => {
      const currentView = useGameStore.getState().view
      if (currentView === 'turntable-top-down') {
        // Cycle tonearm state
        const s = useGameStore.getState()
        if (!s.loadedAlbum) return
        if (s.tonearmState === 'rest') s.setTonearmState('cued')
        else if (s.tonearmState === 'cued') s.setTonearmState('playing')
        else s.setTonearmState('rest')
      } else {
        fireInteraction(window.innerWidth / 2, window.innerHeight / 2)
      }
    }
    document.addEventListener('mobile-interact', onInteract)
    return () => document.removeEventListener('mobile-interact', onInteract)
  }, [])

  function fireInteraction(clientX: number, clientY: number) {
    const nx = (clientX / window.innerWidth) * 2 - 1
    const ny = -(clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)
    const hits = raycaster.intersectObjects(scene.children, true)
    for (const hit of hits) {
      if (hit.distance > 3.5) break
      let obj: THREE.Object3D | null = hit.object
      while (obj) {
        if (interactions.has(obj.uuid)) { interactions.fire(obj.uuid); return }
        obj = obj.parent
      }
    }
  }

  useFrame(() => {
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

  usePlayerMovement(() => ({
    forward: -joystickRef.current.y,
    right: joystickRef.current.x,
    slow: false,
  }))

  return null
}

function updateJoystickOrigin(x: number, y: number) {
  const el = document.getElementById('joystick-origin')
  if (el) {
    el.style.left = `${x - 65}px`
    el.style.top = `${y - 65}px`
  }
}
