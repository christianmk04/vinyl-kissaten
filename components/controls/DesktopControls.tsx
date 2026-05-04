'use client'

import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/game/store'
import { usePlayerMovement } from '@/lib/game/usePlayerMovement'
import { interactions } from '@/lib/game/interactions'
import { getPlayer } from '@/lib/spotify/player'
import * as preview from '@/lib/audio/previewPlayer'

const LOOK_SENSITIVITY = 0.005

export default function DesktopControls() {
  const { camera, raycaster, scene, gl } = useThree()
  const view = useGameStore((s) => s.view)

  const keys = useRef({
    w: false, s: false, a: false, d: false,
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    Shift: false,
  })

  const lookRef = useRef({ yaw: 0, pitch: -0.12 })
  const isDragging = useRef(false)

  // ── Drag-to-look ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = gl.domElement
    camera.rotation.order = 'YXZ'

    const onPointerDown = (e: PointerEvent) => {
      if (useGameStore.getState().view !== 'first-person') return
      // Ignore right-click (reserved for record flip)
      if (e.button === 2) return
      isDragging.current = true
      canvas.setPointerCapture(e.pointerId)
      canvas.style.cursor = 'grabbing'
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return
      if (useGameStore.getState().view !== 'first-person') return
      lookRef.current.yaw -= e.movementX * LOOK_SENSITIVITY
      lookRef.current.pitch = Math.max(
        -Math.PI / 2.5,
        Math.min(Math.PI / 2.5, lookRef.current.pitch - e.movementY * LOOK_SENSITIVITY),
      )
      camera.rotation.y = lookRef.current.yaw
      camera.rotation.x = lookRef.current.pitch
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging.current) return
      isDragging.current = false
      try { canvas.releasePointerCapture(e.pointerId) } catch (_) { /* noop */ }
      canvas.style.cursor = useGameStore.getState().view === 'turntable-top-down' ? 'default' : 'grab'
    }

    canvas.style.cursor = view === 'turntable-top-down' ? 'default' : 'grab'

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
  }, [camera, gl, view])

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = keys.current as Record<string, boolean>
      if (e.key in k) k[e.key] = true

      if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') fireInteraction()
      if (e.key === 'f' || e.key === 'F') useGameStore.getState().flipHeldRecord()
      if (e.key === 'Tab') { e.preventDefault(); useGameStore.getState().toggleNowPlaying() }
      if (e.key === 'Escape') {
        const s = useGameStore.getState()
        if (s.view === 'turntable-top-down') {
          s.setView('first-person')
        } else if (s.heldAlbum) {
          s.setHeldAlbum(null)
        }
      }
      // Track navigation — branches on playback mode
      if (e.key === ']') {
        if (useGameStore.getState().playbackMode === 'preview') {
          preview.nextTrack()
        } else {
          const p = getPlayer()
          if (p) p.nextTrack().catch(() => null)
        }
      }
      if (e.key === '[') {
        if (useGameStore.getState().playbackMode === 'preview') {
          preview.previousTrack()
        } else {
          const p = getPlayer()
          if (p) p.previousTrack().catch(() => null)
        }
      }
    }
    const up = (e: KeyboardEvent) => {
      const k = keys.current as Record<string, boolean>
      if (e.key in k) k[e.key] = false
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [view])

  // ── Right-click flip ───────────────────────────────────────────────────────
  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      e.preventDefault()
      useGameStore.getState().flipHeldRecord()
    }
    window.addEventListener('contextmenu', onContext)
    return () => window.removeEventListener('contextmenu', onContext)
  }, [])

  function fireInteraction() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
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

  usePlayerMovement(() => {
    const k = keys.current
    return {
      forward: (k.w || k.ArrowUp ? 1 : 0) - (k.s || k.ArrowDown ? 1 : 0),
      right: (k.d || k.ArrowRight ? 1 : 0) - (k.a || k.ArrowLeft ? 1 : 0),
      slow: k.Shift,
    }
  })

  return null
}
