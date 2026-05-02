'use client'

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { usePlayerMovement } from '@/lib/game/usePlayerMovement'
import { interactions } from '@/lib/game/interactions'

const JOYSTICK_RADIUS = 60
const LOOK_SENSITIVITY = 0.003

export default function MobileControls() {
  const { camera, raycaster, scene } = useThree()
  const view = useGameStore((s) => s.view)

  // Joystick state
  const joystickRef = useRef({ x: 0, y: 0, active: false, touchId: -1 })
  const lookRef = useRef({ startX: 0, startY: 0, touchId: -1, active: false })
  const lookDeltaRef = useRef({ x: 0, y: 0 })
  const cameraRotRef = useRef({ yaw: 0, pitch: 0 })

  useEffect(() => {
    const joystickEl = document.getElementById('joystick-zone')
    if (!joystickEl) return

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        const x = touch.clientX
        const isLeftSide = x < window.innerWidth * 0.5

        if (isLeftSide && joystickRef.current.touchId === -1) {
          joystickRef.current = {
            x: 0,
            y: 0,
            active: true,
            touchId: touch.identifier,
          }
          updateJoystickOrigin(touch.clientX, touch.clientY)
        } else if (!isLeftSide && lookRef.current.touchId === -1) {
          lookRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            touchId: touch.identifier,
            active: true,
          }
        }
      }

      // Two-finger tap → toggle now-playing
      if (e.touches.length === 2) {
        useGameStore.getState().toggleNowPlaying()
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
          // Update thumb position visually
          const thumb = document.getElementById('joystick-thumb')
          if (thumb) {
            thumb.style.transform = `translate(${Math.cos(angle) * clamped}px, ${Math.sin(angle) * clamped}px)`
          }
        }

        if (touch.identifier === lookRef.current.touchId) {
          const dx = touch.clientX - lookRef.current.startX
          const dy = touch.clientY - lookRef.current.startY
          lookDeltaRef.current.x += dx * LOOK_SENSITIVITY
          lookDeltaRef.current.y += dy * LOOK_SENSITIVITY
          lookRef.current.startX = touch.clientX
          lookRef.current.startY = touch.clientY
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        if (touch.identifier === joystickRef.current.touchId) {
          joystickRef.current = { x: 0, y: 0, active: false, touchId: -1 }
          const thumb = document.getElementById('joystick-thumb')
          if (thumb) thumb.style.transform = 'translate(0px, 0px)'
        }
        if (touch.identifier === lookRef.current.touchId) {
          lookRef.current = { startX: 0, startY: 0, touchId: -1, active: false }
        }
      }
    }

    // Tap to interact
    const handleTap = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.changedTouches[0]
        const nx = (touch.clientX / window.innerWidth) * 2 - 1
        const ny = -(touch.clientY / window.innerHeight) * 2 + 1
        raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)
        const hits = raycaster.intersectObjects(scene.children, true)
        for (const hit of hits) {
          if (hit.distance > 2.5) break
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
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
    document.addEventListener('touchend', handleTap)
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchend', handleTap)
    }
  }, [])

  // Apply look rotation from accumulated delta
  useFrame(() => {
    if (lookDeltaRef.current.x !== 0 || lookDeltaRef.current.y !== 0) {
      cameraRotRef.current.yaw -= lookDeltaRef.current.x
      cameraRotRef.current.pitch = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, cameraRotRef.current.pitch - lookDeltaRef.current.y),
      )
      camera.rotation.order = 'YXZ'
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
    el.style.left = `${x - 60}px`
    el.style.top = `${y - 60}px`
  }
}
