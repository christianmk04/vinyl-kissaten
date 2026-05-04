// Vinyl-style audio effects on top of the Spotify Web Playback SDK.
//
// Strategy:
//   • Spotify's SDK plays through a hidden <audio> element that we can find via
//     document.querySelectorAll('audio'). HTMLAudioElement.playbackRate works
//     across track loads, but the SDK can reset it on chunk/track boundaries —
//     so we re-apply it on a 100ms interval rather than just once on slider change.
//   • A single combined playbackRate accounts for RPM, pitch, and the wow & flutter
//     LFO, so they can't fight each other.
//   • Tone (high-shelf + peaking) EQ goes through a Web Audio graph via
//     createMediaElementSource(). On most browsers the SDK's audio is in a
//     cross-origin iframe and this fails — EQ becomes a no-op, rate-only
//     pitch/RPM/flutter still work where the iframe isn't blocking us.

let audioCtx: AudioContext | null = null
let brightnessFilter: BiquadFilterNode | null = null
let connectedAudio: HTMLAudioElement | null = null

let currentRpm: 33 | 45 | 78 = 33
let currentPitch = 0
let currentWowFlutter = 0
let currentBrightness = 0

let intervalId: ReturnType<typeof setInterval> | null = null
let startTimeSec = 0
let lastFoundAudio = false
let lastConnectAttempted = false

// Spotify's Web Playback SDK plays audio via DRM-protected MSE inside a
// cross-origin iframe (https://sdk.scdn.co/embedded/...). Same-origin policy
// prevents us from reading <audio> elements inside that iframe — so on most
// modern Chromium/WebKit installs `findSpotifyAudio()` will return null and
// pitch/EQ have nowhere to attach. We still scan the main document and any
// same-origin iframes that happen to be present, just in case.
function findSpotifyAudio(): HTMLAudioElement | null {
  const docs: Document[] = [document]
  // Try same-origin iframes; cross-origin access throws and is caught.
  for (const iframe of Array.from(document.querySelectorAll('iframe'))) {
    try {
      const d = iframe.contentDocument
      if (d) docs.push(d)
    } catch {
      // cross-origin — skip
    }
  }

  for (const d of docs) {
    const all = Array.from(d.querySelectorAll('audio'))
    for (const a of all) {
      if (!a.paused && a.readyState >= 2) return a
    }
    if (all[0]) return all[0]
  }
  return null
}

export type EffectsStatus = 'idle' | 'rate' | 'full' | 'blocked'

export function getEffectsStatus(): EffectsStatus {
  if (!lastConnectAttempted) return 'idle'
  if (!lastFoundAudio) return 'blocked'
  if (brightnessFilter !== null) return 'full'
  return 'rate'
}

function tryConnectEQ(audio: HTMLAudioElement): void {
  if (connectedAudio === audio) return
  // Each MediaElement can only be connected once — if we already connected a
  // different element earlier, we can't re-connect this one. Just skip.
  if (connectedAudio) return

  try {
    if (!audioCtx) {
      audioCtx = new AudioContext()
    }
    const src = audioCtx.createMediaElementSource(audio)
    brightnessFilter = audioCtx.createBiquadFilter()
    brightnessFilter.type = 'highshelf'
    brightnessFilter.frequency.value = 3200
    brightnessFilter.gain.value = currentBrightness * 8

    src.connect(brightnessFilter)
    brightnessFilter.connect(audioCtx.destination)
    connectedAudio = audio
  } catch {
    brightnessFilter = null
  }
}

function computeCombinedRate(elapsedSec: number): number {
  // Treat 33 RPM as the "source" speed of every record.
  const rpmMult = currentRpm / 33
  const pitchMult = 1.0 + currentPitch * 0.5
  const lfo = currentWowFlutter > 0
    ? Math.sin(elapsedSec * 3.7) * currentWowFlutter * 0.018
    : 0
  return Math.max(0.0625, Math.min(16, rpmMult * pitchMult + lfo))
}

export function startVinylEffects(): void {
  if (intervalId !== null) return
  startTimeSec = performance.now() / 1000

  intervalId = setInterval(() => {
    lastConnectAttempted = true
    const audio = findSpotifyAudio()
    if (!audio) {
      lastFoundAudio = false
      return
    }
    lastFoundAudio = true
    tryConnectEQ(audio)

    const elapsed = performance.now() / 1000 - startTimeSec
    const rate = computeCombinedRate(elapsed)
    if (Math.abs(audio.playbackRate - rate) > 0.0005) {
      audio.playbackRate = rate
    }
  }, 100)
}

export function stopVinylEffects(): void {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

export function setRpm(rpm: 33 | 45 | 78): void {
  currentRpm = rpm
}

export function setPitchAmount(p: number): void {
  currentPitch = p
}

export function setWowFlutterAmount(w: number): void {
  currentWowFlutter = w
}

export function setBrightnessAmount(b: number): void {
  currentBrightness = b
  if (brightnessFilter) brightnessFilter.gain.value = b * 8
}

export function isEQConnected(): boolean {
  return brightnessFilter !== null
}
