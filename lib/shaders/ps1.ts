import * as THREE from 'three'

// ─── Vertex snapping ─────────────────────────────────────────────────────────
export const vertexSnapChunk = /* glsl */ `
  #ifdef USE_PS1_SNAP
    vec4 snappedPos = gl_Position;
    snappedPos.xyz /= snappedPos.w;
    snappedPos.xy = floor(snappedPos.xy * PS1_SNAP_STRENGTH) / PS1_SNAP_STRENGTH;
    snappedPos.xyz *= snappedPos.w;
    gl_Position = snappedPos;
  #endif
`

// ─── Affine UV mapping ────────────────────────────────────────────────────────
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
    vec2 screenCoord = uv * uResolution;

    float levels = uColorDepth;
    float threshold = bayer4x4(screenCoord) - 0.5;

    vec3 c = color.rgb;
    c = c * levels + threshold;
    c = floor(c) / levels;
    c = clamp(c, 0.0, 1.0);

    if (uScanlines) {
      float line = mod(floor(screenCoord.y), 2.0);
      c *= mix(1.0, 0.84, line);
    }

    c *= (1.0 - uFlicker * sin(uTime * 50.0) * 0.5);

    c = clamp(c, 0.0, 1.0);

    gl_FragColor = vec4(c, 1.0);
  }
`

// ─── Apply PS1 material mixin ─────────────────────────────────────────────────
export function applyPS1Material(
  material: THREE.Material,
  options: {
    snapStrength?: number
    affineUV?: boolean
  } = {},
) {
  const { snapStrength = 160, affineUV = true } = options

  material.onBeforeCompile = (shader) => {
    const varyingDecl = affineUV ? 'varying vec3 vAffineUV;\n' : ''

    shader.vertexShader = varyingDecl + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      {
        vec4 sp = gl_Position;
        sp.xyz /= sp.w;
        sp.xy = floor(sp.xy * ${snapStrength.toFixed(1)}) / ${snapStrength.toFixed(1)};
        sp.xyz *= sp.w;
        gl_Position = sp;
      }
      ${affineUV ? 'vAffineUV = vec3(vMapUv * gl_Position.w, gl_Position.w);' : ''}
      `,
    )

    if (affineUV) {
      shader.fragmentShader = varyingDecl + shader.fragmentShader
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

  material.needsUpdate = true
}

// ─── PS1 texture helper ───────────────────────────────────────────────────────
export function ps1Texture<T extends THREE.Texture>(texture: T): T {
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  return texture
}

// ─── Procedural texture generators ───────────────────────────────────────────
// All use RGBAFormat (4 channels) — THREE.RGBFormat was removed in r152+.

export function makeColorTexture(
  hex: string,
  width = 4,
  height = 4,
): THREE.DataTexture {
  const color = new THREE.Color(hex)
  const data = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = Math.round(color.r * 255)
    data[i * 4 + 1] = Math.round(color.g * 255)
    data[i * 4 + 2] = Math.round(color.b * 255)
    data[i * 4 + 3] = 255
  }
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
  tex.needsUpdate = true
  return ps1Texture(tex)
}

export function makeWoodTexture(): THREE.DataTexture {
  const w = 64
  const h = 64
  const data = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const grain = Math.sin((y + x * 0.2) * 1.8) * 0.15
      const noise = (Math.random() - 0.5) * 0.08
      const base = new THREE.Color('#7a5838')
      const bright = new THREE.Color('#a07848')
      const t = Math.max(0, Math.min(1, grain + noise + 0.5))
      const r = base.r + (bright.r - base.r) * t
      const g = base.g + (bright.g - base.g) * t
      const b = base.b + (bright.b - base.b) * t
      data[i] = Math.round(r * 255)
      data[i + 1] = Math.round(g * 255)
      data[i + 2] = Math.round(b * 255)
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return ps1Texture(tex)
}

export function makeRugTexture(): THREE.DataTexture {
  const w = 128
  const h = 128
  const data = new Uint8Array(w * h * 4)
  const colors = [
    new THREE.Color('#5c1f24'),
    new THREE.Color('#2d4a3a'),
    new THREE.Color('#3a2418'),
    new THREE.Color('#e8d5a8'),
    new THREE.Color('#3a5a6b'),
  ]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const cx = Math.abs(x - w / 2) / (w / 2)
      const cy = Math.abs(y - h / 2) / (h / 2)
      const d = Math.max(cx, cy)
      const ring = Math.floor(d * 5) % colors.length
      const border = (x % 8 < 2 || y % 8 < 2) ? 3 : ring
      const c = colors[Math.min(border, colors.length - 1)]
      data[i] = Math.round(c.r * 255)
      data[i + 1] = Math.round(c.g * 255)
      data[i + 2] = Math.round(c.b * 255)
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
  tex.needsUpdate = true
  return ps1Texture(tex)
}

export function makeRainSpriteSheet(): THREE.DataTexture {
  const fw = 64
  const fh = 16
  const frames = 8
  const w = fw
  const h = fh * frames
  const data = new Uint8Array(w * h * 4)

  for (let f = 0; f < frames; f++) {
    const yOffset = f * fh
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
  const data = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const plankLine = y % 16 === 0 || x % 32 === 0
      const grain = Math.sin(x * 0.4 + y * 0.1) * 0.12 + (Math.random() - 0.5) * 0.06
      const base = plankLine ? new THREE.Color('#3a2010') : new THREE.Color('#7a5030')
      const t = Math.max(0, Math.min(1, grain + 0.5))
      const bright = new THREE.Color('#9a7050')
      data[i] = Math.round((base.r + (bright.r - base.r) * t) * 255)
      data[i + 1] = Math.round((base.g + (bright.g - base.g) * t) * 255)
      data[i + 2] = Math.round((base.b + (bright.b - base.b) * t) * 255)
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return ps1Texture(tex)
}

export function makeFaceTexture(eyeColor = '#222'): THREE.DataTexture {
  const w = 32
  const h = 32
  const data = new Uint8Array(w * h * 4)
  const skin = new THREE.Color('#c8a878')
  const eye = new THREE.Color(eyeColor)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const isEye =
        ((x === 10 || x === 11) && (y === 14 || y === 15)) ||
        ((x === 20 || x === 21) && (y === 14 || y === 15))
      const c = isEye ? eye : skin
      data[i] = Math.round(c.r * 255)
      data[i + 1] = Math.round(c.g * 255)
      data[i + 2] = Math.round(c.b * 255)
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
  tex.needsUpdate = true
  return ps1Texture(tex)
}

export function makeVinylLabelTexture(): THREE.DataTexture {
  const w = 32
  const h = 32
  const data = new Uint8Array(w * h * 4)
  const label = new THREE.Color('#c8a030')
  const black = new THREE.Color('#111111')
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const dx = x - w / 2
      const dy = y - h / 2
      const d = Math.sqrt(dx * dx + dy * dy)
      const c = d < w / 2 ? label : black
      data[i] = Math.round(c.r * 255)
      data[i + 1] = Math.round(c.g * 255)
      data[i + 2] = Math.round(c.b * 255)
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
  tex.needsUpdate = true
  return ps1Texture(tex)
}

export function makeAlbumPlaceholderTexture(index: number): THREE.DataTexture {
  const w = 64
  const h = 64
  const data = new Uint8Array(w * h * 4)
  const hues = [0, 30, 60, 120, 180, 210, 270, 300]
  const hue = hues[index % hues.length]
  // Solid dark square with subtle inner border — looks like an unlabeled record
  const bg = new THREE.Color().setHSL(hue / 360, 0.25, 0.12)
  const border = new THREE.Color().setHSL(hue / 360, 0.4, 0.28)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const isBorder = x < 4 || x >= w - 4 || y < 4 || y >= h - 4
      const c = isBorder ? border : bg
      data[i] = Math.round(c.r * 255)
      data[i + 1] = Math.round(c.g * 255)
      data[i + 2] = Math.round(c.b * 255)
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
  tex.needsUpdate = true
  return ps1Texture(tex)
}
