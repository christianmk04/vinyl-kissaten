'use client'

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  ditherVertexShader,
  ditherFragmentShader,
} from '@/lib/shaders/ps1'

interface PS1PipelineProps {
  scanlines?: boolean
  barrel?: boolean
  flicker?: boolean
}

// Internal resolution — the whole PS1 look lives here
const RENDER_W = 320
const RENDER_H = 240

export default function PS1Pipeline({
  scanlines = false,
  barrel = false,
  flicker = false,
}: PS1PipelineProps) {
  const { gl, scene, camera, size } = useThree()

  const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null)
  const quadSceneRef = useRef<THREE.Scene | null>(null)
  const quadCameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const quadMeshRef = useRef<THREE.Mesh | null>(null)
  const uniformsRef = useRef<Record<string, THREE.IUniform> | null>(null)

  useEffect(() => {
    // Low-res render target — 320×240, nearest filter = chunky pixels
    const rt = new THREE.WebGLRenderTarget(RENDER_W, RENDER_H, {
      magFilter: THREE.NearestFilter,
      minFilter: THREE.NearestFilter,
      generateMipmaps: false,
    })
    renderTargetRef.current = rt

    // Fullscreen quad scene for the post-process pass
    const qScene = new THREE.Scene()
    const qCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const uniforms: Record<string, THREE.IUniform> = {
      tDiffuse: { value: rt.texture },
      uResolution: { value: new THREE.Vector2(RENDER_W, RENDER_H) },
      uColorDepth: { value: 32.0 }, // 5-bit per channel
      uScanlines: { value: scanlines },
      uBarrel: { value: barrel },
      uTime: { value: 0 },
      uFlicker: { value: 0 },
    }
    uniformsRef.current = uniforms

    const mat = new THREE.ShaderMaterial({
      vertexShader: ditherVertexShader,
      fragmentShader: ditherFragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
    })

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
    quad.frustumCulled = false
    qScene.add(quad)

    quadSceneRef.current = qScene
    quadCameraRef.current = qCamera
    quadMeshRef.current = quad

    return () => {
      rt.dispose()
      mat.dispose()
      quad.geometry.dispose()
    }
  }, [])

  // Sync toggles
  useEffect(() => {
    if (!uniformsRef.current) return
    uniformsRef.current.uScanlines.value = scanlines
    uniformsRef.current.uBarrel.value = barrel
  }, [scanlines, barrel])

  useFrame(({ clock }) => {
    const rt = renderTargetRef.current
    const qScene = quadSceneRef.current
    const qCamera = quadCameraRef.current
    const uniforms = uniformsRef.current
    if (!rt || !qScene || !qCamera || !uniforms) return

    uniforms.uTime.value = clock.getElapsedTime()
    uniforms.uFlicker.value = flicker ? 0.005 : 0

    // 1. Render world scene to low-res target
    gl.setRenderTarget(rt)
    gl.render(scene, camera)

    // 2. Post-process: dither + upscale to screen
    gl.setRenderTarget(null)
    gl.render(qScene, qCamera)
  }, 1) // priority 1 = runs after default render priority 0

  return null
}
