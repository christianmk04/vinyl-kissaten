'use client'

import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { usePlayerMovement } from '@/lib/game/usePlayerMovement'
import { interactions } from '@/lib/game/interactions'
// PointerLockControls from drei is a React component, access its instance type via useRef
// The actual instance is THREE.PointerLockControls from the three-stdlib it wraps

export default function DesktopControls() {
  const { camera, raycaster, scene } = useThree()
  const view = useGameStore((s) => s.view)
  const plcRef = useRef<any>(null) // drei PointerLockControls ref

  const keys = useRef({
    w: false, s: false, a: false, d: false,
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    Shift: false,
  })

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key in keys.current) {
        (keys.current as Record<string, boolean>)[e.key] = true
      }
      // E to interact
      if (e.key === 'e' || e.key === 'E') fireInteraction()
      // F to flip held record
      if (e.key === 'f' || e.key === 'F') {
        useGameStore.getState().flipHeldRecord()
      }
      // Tab to toggle now-playing
      if (e.key === 'Tab') {
        e.preventDefault()
        useGameStore.getState().toggleNowPlaying()
      }
      // Esc exits turntable view
      if (e.key === 'Escape' && view === 'turntable-top-down') {
        useGameStore.getState().setView('first-person')
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key in keys.current) {
        (keys.current as Record<string, boolean>)[e.key] = false
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [view])

  function fireInteraction() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
    const hits = raycaster.intersectObjects(scene.children, true)
    for (const hit of hits) {
      if (hit.distance > 2.5) break
      const uuid = hit.object.uuid
      if (interactions.has(uuid)) {
        interactions.fire(uuid)
        break
      }
      // Walk up parent chain
      let obj: THREE.Object3D | null = hit.object.parent
      while (obj) {
        if (interactions.has(obj.uuid)) {
          interactions.fire(obj.uuid)
          return
        }
        obj = obj.parent
      }
    }
  }

  // Left-click also fires interaction
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (e.button === 0 && plcRef.current?.isLocked) {
        fireInteraction()
      }
      // Right-click flips held record
      if (e.button === 2) {
        useGameStore.getState().flipHeldRecord()
      }
    }
    window.addEventListener('click', click)
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      useGameStore.getState().flipHeldRecord()
    })
    return () => window.removeEventListener('click', click)
  }, [])

  usePlayerMovement(() => {
    const k = keys.current
    return {
      forward: (k.w || k.ArrowUp ? 1 : 0) - (k.s || k.ArrowDown ? 1 : 0),
      right: (k.d || k.ArrowRight ? 1 : 0) - (k.a || k.ArrowLeft ? 1 : 0),
      slow: k.Shift,
    }
  })

  return (
    <PointerLockControls
      ref={plcRef}
      makeDefault
    />
  )
}
