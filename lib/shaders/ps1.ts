import * as THREE from 'three'

// ─── Vertex snapping ─────────────────────────────────────────────────────────
// Snaps clip-space xy to a coarse integer grid, producing the iconic PS1 vertex
// wobble / shimmer as the camera moves. Lower snapStrength = more wobble.

export const vertexSnapChunk = /* glsl */ `
  // PS1 vertex snapping — inject after #include <project_vertex>
  #ifdef USE_PS1_SNAP
    vec4 snappedPos = gl_Position;
    snappedPos.xyz /= snappedPos.w;
    snappedPos.xy = floor(snappedPos.xy * PS1_SNAP_STRENGTH) / PS1_SNAP_STRENGTH;
    snappedPos.xyz *= snappedPos.w;
    gl_Position = snappedPos;
  #endif
`

// ─── Affine UV mapping ────────────────────────────────────────────────────────
// WebGL 2 always does perspective-correct UV interpolation. To fake affine
// (PS1-style, no perspective correction), we pass uv*w as a vec3 varying so
// GL's own perspective correction reconstructs screen-space linear interp.
// Vertex: vAffineUV = vec3(uv * gl_Position.w, gl_Position.w)
// Fragment: vec2 uv = vAffineUV.xy / vAffineUV.z

export const affineUVVertexChunk = /* glsl */ `
  #ifdef USE_AFFINE_UV
    vAffineUV = vec3(vMapUv * gl_Position.w, gl_Position.w);
  #endif
`

export const affineUVFragmentChunk = /* glsl */ `
  #ifdef USE_AFFINE_UV
    vec2 affineUv = vAffineUV.xy / vAffineUV.z;
  #endif
`

// ─── Post-process: dither + quantize ─────────────────────────────────────────
// Renders a fullscreen quad over the low-res render target.
// 1. Color quantize to ~5-bit per channel (32 levels)
// 2. 4×4 Bayer ordered dithering applied before quantize
// 3. Optional scanline darkening
// 4. Optional barrel distortion for CRT feel

export const ditherVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const ditherFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uColorDepth;
  uniform bool uScanlines;
  uniform bool uBarrel;
  uniform float uTime;
  uniform float uFlicker;

  varying vec2 vUv;

  // 4x4 Bayer threshold matrix (normalized 0..1)
  float bayer4x4(vec2 coord) {
    int x = int(mod(coord.x, 4.0));
    int y = int(mod(coord.y, 4.0));
    int index = y * 4 + x;
    float table[16];
    table[0]  =  0.0 / 16.0;
    table[1]  =  8.0 / 16.0;
    table[2]  =  2.0 / 16.0;
    table[3]  = 10.0 / 16.0;
    table[4]  = 12.0 / 16.0;
    table[5]  =  4.0 / 16.0;
    table[6]  = 14.0 / 16.0;
    table[7]  =  6.0 / 16.0;
    table[8]  =  3.0 / 16.0;
    table[9]  = 11.0 / 16.0;
    table[10] =  1.0 / 16.0;
    table[11] =  9.0 / 16.0;
    table[12] = 15.0 / 16.0;
    table[13] =  7.0 / 16.0;
    table[14] = 13.0 / 16.0;
    table[15] =  5.0 / 16.0;
    return table[index];
  }

  vec2 barrelDistort(vec2 uv) {
    vec2 cc = uv - 0.5;
    float dist = dot(cc, cc);
    return uv + cc * dist * 0.08;
  }

  void main() {
    vec2 uv = vUv;
    if (uBarrel) {
      uv = barrelDistort(uv);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
    }

    vec4 color = texture2D(tDiffuse, uv);

    // Screen-space pixel coord for dither
    vec2 screenCoord = uv * uResolution;

    // Dither offset: scale color (0..1) up to color-depth levels, add threshold,
    // then quantize. This shifts the quantization boundary by the dither matrix.
    float levels = uColorDepth; // e.g. 32.0 for 5-bit
    float threshold = bayer4x4(screenCoord) - 0.5; // -0.5 .. +0.5

    vec3 c = color.rgb;
    c = c * levels + threshold;
    c = floor(c) / levels;
    c = clamp(c, 0.0, 1.0);

    // Scanlines (every other screen row darkens slightly)
    if (uScanlines) {
      float line = mod(floor(screenCoord.y), 2.0);
      c *= mix(1.0, 0.84, line);
    }

    // Screen flicker
    c *= (1.0 - uFlicker * sin(uTime * 50.0) * 0.5);

    gl_FragColor = vec4(c, 1.0);
  }
`

// ─── Apply PS1 material mixin ─────────────────────────────────────────────────
// Call this on any THREE.Material to inject vertex snapping + affine UV via
// onBeforeCompile. snapStrength: higher = more snapping (160 is typical).

export function applyPS1Material(
  material: THREE.Material,
  options: {
    snapStrength?: number
    affineUV?: boolean
  } = {},
) {
  const { snapStrength = 160, affineUV = true } = options

  material.onBeforeCompile = (shader) => {
    // Declare custom varyings at top of both shaders
    const varyingDecl = affineUV
      ? 'varying vec3 vAffineUV;\n'
      : ''

    shader.vertexShader = varyingDecl + shader.vertexShader

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      // PS1 vertex snapping
      {
        vec4 sp = gl_Position;
        sp.xyz /= sp.w;
        sp.xy = floor(sp.xy * ${snapStrength.toFixed(1)}) / ${snapStrength.toFixed(1)};
        sp.xyz *= sp.w;
        gl_Position = sp;
      }
      ${affineUV ? '// Affine UV: pass uv*w so perspective correction = screen-linear\nvAffineUV = vec3(vMapUv * gl_Position.w, gl_Position.w);' : ''}
      `,
    )

    if (affineUV) {
      shader.fragmentShader = varyingDecl + shader.fragmentShader

      // Replace map sampling to use affine UV
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec2 affineUv = vAffineUV.xy / vAffineUV.z;
          vec4 sampledDiffuseColor = texture2D(map, affineUv);
          #ifdef DECODE_VIDEO_TEXTURE
            sampledDiffuseColor = vec4(mix(pow(sampledDiffuseColor.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), sampledDiffuseColor.rgb * 0.0773993808, vec3(lessThanEqual(sampledDiffuseColor.rgb, vec3(0.04045)))), sampledDiffuseColor.w);
          #endif
          diffuseColor *= sampledDiffuseColor;
        #endif
        `,
      )
    }
  }

  // Mark material as needing custom shader compilation
  material.needsUpdate = true
}

// ─── PS1 texture helper ───────────────────────────────────────────────────────
// Ensures a texture uses nearest-filter (no smoothing) — critical for the look.

export function ps1Texture<T extends THREE.Texture>(texture: T): T {
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  return texture
}

// ─── Procedural texture generators ───────────────────────────────────────────
// Creates simple low-res textures programmatically since we have no asset pipeline.

export function makeColorTexture(
  hex: string,
  width = 4,
  height = 4,
): THREE.DataTexture {
  const color = new THREE.Color(hex)
  const data = new Uint8Array(width * height * 3)
  for (let i = 0; i < width * height; i++) {
    data[i * 3] = Math.round(color.r * 255)
    data[i * 3 + 1] = Math.round(color.g * 255)
    data[i * 3 + 2] = Math.round(color.b * 255)
  }
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBFormat)
  tex.needsUpdate = true
  return ps1Texture(tex)
}

export function makeWoodTexture(): THREE.DataTexture {
  const w = 64
  const h = 64
  const data = new Uint8Array(w * h * 3)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      // Horizontal grain lines + slight noise
      const grain = Math.sin((y + x * 0.2) * 1.8) * 0.15
      const noise = (Math.random() - 0.5) * 0.08
      const base = new THREE.Color('#3a2418')
      const bright = new THREE.Color('#5a3828')
      const t = Math.max(0, Math.min(1, grain + noise + 0.5))
      const r = base.r + (bright.r - base.r) * t
      const g = base.g + (bright.g - base.g) * t
      const b = base.b + (bright.b - base.b) * t
      data[i] = Math.round(r * 255)
      data[i + 1] = Math.round(g * 255)
      data[i + 2] = Math.round(b * 255)
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBFormat)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return ps1Texture(tex)
}

export function makeRugTexture(): THREE.DataTexture {
  const w = 128
  const h = 128
  const data = new Uint8Array(w * h * 3)
  const colors = [
    new THREE.Color('#5c1f24'),
    new THREE.Color('#2d4a3a'),
    new THREE.Color('#3a2418'),
    new THREE.Color('#e8d5a8'),
    new THREE.Color('#3a5a6b'),
  ]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      // Persian-style concentric diamond pattern
      const cx = Math.abs(x - w / 2) / (w / 2)
      const cy = Math.abs(y - h / 2) / (h / 2)
      const d = Math.max(cx, cy)
      const ring = Math.floor(d * 5) % colors.length
      const border = ((x % 8 < 2) || (y % 8 < 2)) ? 3 : ring
      const c = colors[Math.min(border, colors.length - 1)]
      data[i] = Math.round(c.r * 255)
      data[i + 1] = Math.round(c.g * 255)
      data[i + 2] = Math.round(c.b * 255)
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBFormat)
  tex.needsUpdate = true
  return ps1Texture(tex)
}

export function makeRainSpriteSheet(): THREE.DataTexture {
  // 8-frame rain animation: 64×128 total (64×16 per frame, stacked)
  const fw = 64
  const fh = 16
  const frames = 8
  const w = fw
  const h = fh * frames
  const data = new Uint8Array(w * h * 4)

  for (let f = 0; f < frames; f++) {
    const yOffset = f * fh
    // Random rain streaks per frame
    const numDrops = 12
    for (let d = 0; d < numDrops; d++) {
      const dropX = Math.floor((Math.sin(d * 137.5 + f * 0.7) * 0.5 + 0.5) * fw)
      const dropY = Math.floor((Math.sin(d * 97.3 + f * 1.2) * 0.5 + 0.5) * fh)
      const len = 2 + Math.floor(Math.random() * 4)
      for (let l = 0; l < len; l++) {
        const px = dropX
        const py = dropY + l
        if (px < fw && py < fh) {
          const i = ((yOffset + py) * w + px) * 4
          const alpha = Math.max(0, 180 - l * 40)
          data[i] = 180
          data[i + 1] = 200
          data[i + 2] = 220
          data[i + 3] = alpha
        }
      }
    }
  }

  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.needsUpdate = true
  return ps1Texture(tex)
}

export function makeFloorPlankTexture(): THREE.DataTexture {
  const w = 64
  const h = 64
  const data = new Uint8Array(w * h * 3)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      const plankLine = y % 16 === 0 || x % 32 === 0
      const grain = Math.sin(x * 0.4 + y * 0.1) * 0.12 + (Math.random() - 0.5) * 0.06
      const base = plankLine ? new THREE.Color('#1e1008') : new THREE.Color('#3a2418')
      const t = Math.max(0, Math.min(1, grain + 0.5))
      const bright = new THREE.Color('#4a3020')
      data[i] = Math.round((base.r + (bright.r - base.r) * t) * 255)
      data[i + 1] = Math.round((base.g + (bright.g - base.g) * t) * 255)
      data[i + 2] = Math.round((base.b + (bright.b - base.b) * t) * 255)
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBFormat)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return ps1Texture(tex)
}

export function makeFaceTexture(eyeColor = '#222'): THREE.DataTexture {
  const w = 32
  const h = 32
  const data = new Uint8Array(w * h * 3)
  const skin = new THREE.Color('#c8a878')
  const eye = new THREE.Color(eyeColor)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      // Two dot eyes
      const isEye =
        ((x === 10 || x === 11) && (y === 14 || y === 15)) ||
        ((x === 20 || x === 21) && (y === 14 || y === 15))
      const c = isEye ? eye : skin
      data[i] = Math.round(c.r * 255)
      data[i + 1] = Math.round(c.g * 255)
      data[i + 2] = Math.round(c.b * 255)
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBFormat)
  tex.needsUpdate = true
  return ps1Texture(tex)
}

export function makeVinylLabelTexture(artDataUrl?: string): THREE.DataTexture {
  // Fallback label if no art — just a colored circle center
  const w = 32
  const h = 32
  const data = new Uint8Array(w * h * 3)
  const label = new THREE.Color('#c8a030')
  const black = new THREE.Color('#111111')
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      const dx = x - w / 2
      const dy = y - h / 2
      const d = Math.sqrt(dx * dx + dy * dy)
      const c = d < w / 2 ? label : black
      data[i] = Math.round(c.r * 255)
      data[i + 1] = Math.round(c.g * 255)
      data[i + 2] = Math.round(c.b * 255)
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBFormat)
  tex.needsUpdate = true
  return ps1Texture(tex)
}

export function makeAlbumPlaceholderTexture(index: number): THREE.DataTexture {
  const w = 128
  const h = 128
  const data = new Uint8Array(w * h * 3)
  const hues = [0, 30, 60, 120, 180, 210, 270, 300]
  const hue = hues[index % hues.length]
  const base = new THREE.Color().setHSL(hue / 360, 0.4, 0.2)
  const accent = new THREE.Color().setHSL(hue / 360, 0.6, 0.5)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      const stripe = Math.floor((x + y) / 16) % 2 === 0
      const c = stripe ? base : accent
      data[i] = Math.round(c.r * 255)
      data[i + 1] = Math.round(c.g * 255)
      data[i + 2] = Math.round(c.b * 255)
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBFormat)
  tex.needsUpdate = true
  return ps1Texture(tex)
}
