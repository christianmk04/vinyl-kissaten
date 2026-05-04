// Preview-mode playback: streams Spotify's 30-second mp3 preview URLs through
// a real <audio> element so the full Web Audio FX chain actually works
// (warmth/brightness EQ, RPM-mapped speed, pitch, wow & flutter LFO).
//
// This module owns its own <audio> tag and AudioContext — completely separate
// from the Spotify Web Playback SDK path. When the user toggles into preview
// mode, useTonearmPlayback routes through here instead of through the SDK.
//
// Key gotchas this code handles:
//   - AudioContext starts in 'suspended' state on modern browsers; we resume
//     it both at creation time and again right before each play().
//   - Spotify preview URLs may CORS-reject the crossOrigin='anonymous' header
//     in some regions/browsers; on play failure we retry without the header
//     (FX chain becomes inaudible since the source is then "tainted", but
//     at least the user hears their music).
//   - Spotify removed preview_url from many albums in 2024-2025; if the whole
//     side returns null, we fire onError so the UI can tell the user.

import type { SpotifyTrack } from '@/lib/types'
import * as Tone from 'tone'

let audio: HTMLAudioElement | null = null
let audioCtx: AudioContext | null = null
let cartridgeRolloff: BiquadFilterNode | null = null   // always-on -1.5 dB high-shelf @ 10 kHz (vinyl character)
let tonePresence: BiquadFilterNode | null = null       // peaking 3 kHz (TONE knob, lower band)
let toneAir: BiquadFilterNode | null = null            // high-shelf 12 kHz (TONE knob, upper band)
let pitchShifter: Tone.PitchShift | null = null       // true key-shift, independent of tempo
let fxConnected = false

let currentRpm: 33 | 45 | 78 = 33
let currentPitch = 0          // -1..+1 — scaled by pitchRange below
let currentPitchRange = 0.10  // 0.10 / 0.20 / 0.50 — LP1240-style ±10/20/50 %
let currentQuartzLock = false // when true, pitch fader is bypassed (locked to 0)
let currentWow = 0
let currentVolume = 0.8

let lfoIntervalId: ReturnType<typeof setInterval> | null = null
let lfoStartSec = 0

// Internal queue type — we may have resolved a preview URL from the embed
// fallback, so this carries the effective URL alongside the original track.
type QueueEntry = { track: SpotifyTrack; url: string }
let queue: QueueEntry[] = []
let queueIdx = 0
let onTrackChange: ((track: SpotifyTrack | null, index: number, total: number) => void) | null = null
let onSideEnd: (() => void) | null = null
let onError: ((message: string) => void) | null = null

// Cache resolved URLs across sessions in this tab — saves re-hitting the
// embed scraper if the user replays the same album.
const previewUrlCache = new Map<string, string | null>()

async function resolvePreviewUrl(track: SpotifyTrack): Promise<string | null> {
  if (track.preview_url) return track.preview_url
  if (previewUrlCache.has(track.id)) return previewUrlCache.get(track.id) ?? null
  try {
    const res = await fetch(`/api/spotify/preview?id=${encodeURIComponent(track.id)}`)
    if (!res.ok) {
      previewUrlCache.set(track.id, null)
      return null
    }
    const data = await res.json() as { url?: string | null }
    const url = data.url ?? null
    previewUrlCache.set(track.id, url)
    return url
  } catch (e) {
    console.warn('[previewPlayer] embed-scrape failed for', track.id, e)
    previewUrlCache.set(track.id, null)
    return null
  }
}

function ensureContext(): boolean {
  if (audio && audioCtx) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => null)
    }
    return true
  }
  try {
    audio = new Audio()
    audio.crossOrigin = 'anonymous'
    audio.preload = 'auto'
    audio.volume = currentVolume

    audioCtx = new AudioContext()
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => null)
    }

    try {
      const src = audioCtx.createMediaElementSource(audio)

      // Tell Tone.js to share our existing AudioContext rather than create its own.
      // This lets the PitchShift node coexist with our native Web Audio chain.
      Tone.setContext(audioCtx)

      // Audio chain:
      //   source → cartridge rolloff (always-on -1.5 dB @ 10 kHz, vinyl character)
      //          → tone presence (peaking @ 3 kHz, TONE knob)
      //          → tone air      (high-shelf @ 12 kHz, TONE knob)
      //          → Tone.PitchShift (key-shift, independent of tempo)
      //          → destination
      cartridgeRolloff = audioCtx.createBiquadFilter()
      cartridgeRolloff.type = 'highshelf'
      cartridgeRolloff.frequency.value = 10000
      cartridgeRolloff.gain.value = -1.5

      tonePresence = audioCtx.createBiquadFilter()
      tonePresence.type = 'peaking'
      tonePresence.frequency.value = 3000
      tonePresence.Q.value = 0.7
      tonePresence.gain.value = 0

      toneAir = audioCtx.createBiquadFilter()
      toneAir.type = 'highshelf'
      toneAir.frequency.value = 12000
      toneAir.gain.value = 0

      pitchShifter = new Tone.PitchShift({ pitch: 0, windowSize: 0.1, delayTime: 0, feedback: 0 })

      src.connect(cartridgeRolloff)
      cartridgeRolloff.connect(tonePresence)
      tonePresence.connect(toneAir)
      Tone.connect(toneAir, pitchShifter)
      pitchShifter.toDestination()
      fxConnected = true
    } catch (e) {
      // FX chain failed to build — element will play through default audio
      // path, FX won't be audible but music still works.
      console.warn('[previewPlayer] FX chain unavailable:', e)
      fxConnected = false
    }

    audio.addEventListener('ended', advanceQueue)
    audio.addEventListener('error', handleAudioError)

    lfoStartSec = performance.now() / 1000
    lfoIntervalId = setInterval(() => {
      if (!audio) return
      const elapsed = performance.now() / 1000 - lfoStartSec
      // playbackRate now drives ONLY: RPM (motor speed) and wow & flutter (LFO).
      // Pitch (key-shift) goes through Tone.PitchShift instead — that's why
      // pitch can change pitch without changing tempo.
      const rpmMult = currentRpm / 33
      let lfo = 0
      if (currentWow > 0) {
        const wow = Math.sin(elapsed * 3.0) * currentWow * 0.020
        const flutter = Math.sin(elapsed * 38.0) * currentWow * 0.005
        lfo = wow + flutter
      }
      const rate = Math.max(0.0625, Math.min(16, rpmMult + lfo))
      if (Math.abs(audio.playbackRate - rate) > 0.0005) {
        audio.playbackRate = rate
      }
    }, 80)

    return true
  } catch (e) {
    console.warn('[previewPlayer] init failed:', e)
    audio = null
    audioCtx = null
    cartridgeRolloff = null
    tonePresence = null
    toneAir = null
    if (pitchShifter) {
      pitchShifter.dispose()
      pitchShifter = null
    }
    fxConnected = false
    return false
  }
}

function handleAudioError(): void {
  if (!audio) return
  const err = audio.error
  console.warn('[previewPlayer] audio error code', err?.code, err?.message)
  if (audio.crossOrigin === 'anonymous') {
    console.warn('[previewPlayer] retrying without crossOrigin (FX will be silent)')
    audio.crossOrigin = null
    fxConnected = false
    const entry = queue[queueIdx]
    if (entry) {
      audio.src = entry.url
      audio.play().catch((playErr) => {
        console.warn('[previewPlayer] retry play failed:', playErr)
        if (onError) onError(`Preview playback failed: ${playErr.message ?? 'unknown error'}`)
      })
    }
  } else {
    if (onError) onError('Preview playback failed (browser rejected the audio source)')
  }
}

function advanceQueue(): void {
  queueIdx += 1
  if (queueIdx >= queue.length) {
    if (onSideEnd) onSideEnd()
    return
  }
  loadAndPlayCurrent()
}

function loadAndPlayCurrent(): void {
  if (!audio || !audioCtx) return
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => null)
  }
  const entry = queue[queueIdx]
  if (!entry) {
    if (onSideEnd) onSideEnd()
    return
  }
  audio.src = entry.url
  audio.play().catch((err: DOMException) => {
    console.warn('[previewPlayer] play() rejected:', err.name, err.message)
    if (onError) onError(`Could not start preview: ${err.message}`)
  })
  if (onTrackChange) onTrackChange(entry.track, queueIdx, queue.length)
}

export function setCallbacks(cb: {
  onTrackChange?: (track: SpotifyTrack | null, index: number, total: number) => void
  onSideEnd?: () => void
  onError?: (message: string) => void
}): void {
  onTrackChange = cb.onTrackChange ?? null
  onSideEnd = cb.onSideEnd ?? null
  onError = cb.onError ?? null
}

export async function playSide(tracks: SpotifyTrack[]): Promise<boolean> {
  if (!ensureContext()) {
    if (onError) onError('Audio engine failed to initialize')
    return false
  }

  const apiCount = tracks.filter((t) => !!t.preview_url).length

  // Resolve missing previews via the embed-scrape fallback in parallel
  const resolved = await Promise.all(
    tracks.map(async (t) => {
      const url = await resolvePreviewUrl(t)
      return url ? { track: t, url } : null
    }),
  )

  const entries = resolved.filter((e): e is QueueEntry => e !== null)
  console.info(
    `[previewPlayer] Side has ${tracks.length} tracks · ${apiCount} via API · ${entries.length} total playable (${entries.length - apiCount} recovered from embed)`,
  )

  if (entries.length === 0) {
    if (onError) onError(
      'No previews available for this album, even via the embed fallback. Try a different album, or switch to SPOTIFY mode.',
    )
    if (onSideEnd) onSideEnd()
    return false
  }

  queue = entries
  queueIdx = 0
  loadAndPlayCurrent()
  return true
}

export function pause(): void {
  audio?.pause()
}

export function resume(): boolean {
  if (!audio || !audioCtx) return false
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => null)
  }
  audio.play().catch((err: DOMException) => {
    console.warn('[previewPlayer] resume play() rejected:', err.message)
  })
  return true
}

export function stop(): void {
  if (!audio) return
  audio.pause()
  audio.currentTime = 0
  audio.removeAttribute('src')
  queue = []
  queueIdx = 0
}

export function isPlaying(): boolean {
  return !!audio && !audio.paused && audio.readyState >= 2
}

export function nextTrack(): void {
  advanceQueue()
}

export function previousTrack(): void {
  if (queueIdx > 0) {
    queueIdx -= 1
    loadAndPlayCurrent()
  }
}

// Jump to a specific position in the side queue (used by NowPlaying track-list clicks).
// The index refers to the original side-tracks order — we map it onto the resolved
// queue, which may be shorter if some tracks failed to resolve a preview URL.
export function playTrackAt(originalIndex: number): void {
  // queue[i].track was the source SpotifyTrack — find the queue entry whose
  // track matches the requested index by id. Falls back to clamped index if no
  // exact match (e.g. user clicked an unplayable track that got filtered out).
  if (queue.length === 0) return
  let target = -1
  for (let i = 0; i < queue.length; i++) {
    if (queue[i].track.track_number - 1 === originalIndex) {
      target = i
      break
    }
  }
  if (target === -1) {
    // Clamp to nearest valid index
    target = Math.max(0, Math.min(queue.length - 1, originalIndex))
  }
  queueIdx = target
  loadAndPlayCurrent()
}

export function setVolume(v: number): void {
  currentVolume = v
  if (audio) audio.volume = v
}

export function setRpm(r: 33 | 45 | 78): void { currentRpm = r }
export function setWowFlutter(w: number): void { currentWow = w }

// Pitch — true key-shift via phase vocoder, independent of tempo.
// Range buttons select how many semitones the fader covers:
//   ±10% range → ±1 semitone (subtle, beat-matching)
//   ±20% range → ±2 semitones (one whole step either way)
//   ±50% range → ±6 semitones (half-octave, dramatic)
function rangeToSemitones(rangePct: number): number {
  if (rangePct >= 0.50) return 6
  if (rangePct >= 0.20) return 2
  return 1
}

export function setPitch(p: number): void {
  currentPitch = p
  if (pitchShifter) {
    const effective = currentQuartzLock ? 0 : p
    const semitones = effective * rangeToSemitones(currentPitchRange)
    pitchShifter.pitch = semitones
  }
}

export function setPitchRange(rangePct: 10 | 20 | 50): void {
  currentPitchRange = rangePct / 100
  // Re-apply current pitch under the new range
  if (pitchShifter) {
    const effective = currentQuartzLock ? 0 : currentPitch
    pitchShifter.pitch = effective * rangeToSemitones(currentPitchRange)
  }
}

export function setQuartzLock(locked: boolean): void {
  currentQuartzLock = locked
  if (pitchShifter) {
    pitchShifter.pitch = locked ? 0 : currentPitch * rangeToSemitones(currentPitchRange)
  }
}

// Tone (legacy export name `setBrightness` for store compatibility).
// Combines a peaking presence band at 3 kHz and an air shelf at 12 kHz so the
// knob shapes upper-register tone rather than just shelf-cutting treble.
export function setBrightness(b: number): void {
  if (tonePresence) tonePresence.gain.value = b * 3.5
  if (toneAir) toneAir.gain.value = b * 4.5
}

export function isReady(): boolean {
  return audio !== null && audioCtx !== null
}

export function isFxConnected(): boolean {
  return fxConnected
}

// ─── Live playback introspection (used by the NowPlaying scrub bar) ──────────
// Returned in milliseconds for easy compatibility with the Spotify SDK API
// shape, which the rest of the UI is built around.
export function getCurrentTimeMs(): number {
  if (!audio || !isFinite(audio.currentTime)) return 0
  return audio.currentTime * 1000
}

export function getDurationMs(): number {
  if (!audio || !isFinite(audio.duration)) return 0
  return audio.duration * 1000
}

export function getCurrentTrack(): SpotifyTrack | null {
  return queue[queueIdx]?.track ?? null
}

export function getQueueIndex(): number {
  return queueIdx
}

export function getQueueLength(): number {
  return queue.length
}

export function dispose(): void {
  if (lfoIntervalId !== null) {
    clearInterval(lfoIntervalId)
    lfoIntervalId = null
  }
  if (audio) {
    audio.removeEventListener('ended', advanceQueue)
    audio.removeEventListener('error', handleAudioError)
    audio.pause()
    audio = null
  }
  if (audioCtx) {
    audioCtx.close().catch(() => null)
    audioCtx = null
  }
  if (pitchShifter) {
    pitchShifter.dispose()
    pitchShifter = null
  }
  cartridgeRolloff = null
  tonePresence = null
  toneAir = null
  fxConnected = false
  queue = []
  queueIdx = 0
}
