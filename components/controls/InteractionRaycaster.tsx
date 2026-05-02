'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { interactions } from '@/lib/game/interactions'

interface InteractionRaycasterProps {
  onHover: (label: string | null) => void
}

export default function InteractionRaycaster({ onHover }: InteractionRaycasterProps) {
  const { camera, raycaster, scene } = useThree()
  const lastLabel = useRef<string | null>(null)

  useFrame(() => {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
    const hits = raycaster.intersectObjects(scene.children, true)

    let found: string | null = null
    for (const hit of hits) {
      if (hit.distance > 2.5) break
      let obj: THREE.Object3D | null = hit.object
      while (obj) {
        if (interactions.has(obj.uuid)) {
          found = interactions.getLabel(obj.uuid)
          break
        }
        obj = obj.parent
      }
      if (found) break
    }

    if (found !== lastLabel.current) {
      lastLabel.current = found
      onHover(found)
    }
  })

  return null
}
