'use client'

import { Howl, Howler } from 'howler'

// All sounds are lazy-initialized on first use.
// Audio files must be CC0 — see CREDITS.md for attributions.

let initialized = false

const sounds: Record<string, Howl> = {}

// Ambient defaults — single source of truth for the "cafe is alive but quiet"
// volumes. Music playback fades these to 0 so the record gets the listener's
// full attention; lifting the needle restores them.
const AMBIENT_RAIN = 0.4
const AMBIENT_CHATTER = 0.25
const AMBIENT_FADE_MS = 1200

function make(src: string, options: Partial<ConstructorParameters<typeof Howl>[0]> = {}): Howl {
  return new Howl({ src: [src], ...options })
}

export function initAudio() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  sounds.rain = make('/audio/rain.mp3', { loop: true, volume: 0 })
  sounds.chatter = make('/audio/chatter.mp3', { loop: true, volume: 0 })
  sounds.espresso = make('/audio/espresso.mp3', { volume: 0.3 })
  sounds.footstep = make('/audio/footsteps_wood.mp3', { volume: 0.2 })
  sounds.needleDrop = make('/audio/needle_drop.mp3', { volume: 0.7 })
  sounds.needleLift = make('/audio/needle_lift.mp3', { volume: 0.5 })
  sounds.switchClick = make('/audio/switch_click.mp3', { volume: 0.6 })
  sounds.recordFlip = make('/audio/record_flip.mp3', { volume: 0.4 })

  // Fade in ambient sounds over 2s, using the same defaults that
  // unduckChat() restores to so the cafe sounds the same on first load and
  // after a record stops.
  sounds.rain.play()
  sounds.rain.fade(0, AMBIENT_RAIN, 2000)
  sounds.chatter.play()
  sounds.chatter.fade(0, AMBIENT_CHATTER, 2000)

  // Random espresso machine one-shot every 30–90s
  scheduleEspresso()
}

function scheduleEspresso() {
  const delay = 30000 + Math.random() * 60000
  setTimeout(() => {
    if (sounds.espresso) sounds.espresso.play()
    scheduleEspresso()
  }, delay)
}

export function playSound(name: keyof typeof sounds) {
  sounds[name]?.play()
}

export function playFootstep() {
  const s = sounds.footstep
  if (!s) return
  s.rate(0.95 + Math.random() * 0.1)
  s.play()
}

// Called when a record starts playing. Silences the cafe ambience (rain on
// the window + low patron chatter) so the music isn't fighting them. We
// fade rather than stop() the loops so resuming after a track is gapless.
//
// Name kept for backwards compatibility with existing call sites — it now
// silences ALL ambience, not just chatter.
export function duckChatForMusic() {
  sounds.chatter?.fade(sounds.chatter.volume() as number, 0, AMBIENT_FADE_MS)
  sounds.rain?.fade(sounds.rain.volume() as number, 0, AMBIENT_FADE_MS)
}

// Called when the tonearm leaves "playing". Brings ambience back from
// silence to its idle defaults.
export function unduckChat() {
  sounds.chatter?.fade(sounds.chatter.volume() as number, AMBIENT_CHATTER, AMBIENT_FADE_MS)
  sounds.rain?.fade(sounds.rain.volume() as number, AMBIENT_RAIN, AMBIENT_FADE_MS)
}

export function setMasterVolume(v: number) {
  Howler.volume(v)
}

// Globally mute every Howl instance. Used by the visibility / blur handler in
// Cafe.tsx so the cafe goes silent the instant the user switches tabs or
// sends the browser to the background, and unmutes on return. Howler.mute is
// preferable to per-Howl pause/play here because:
//   1. Looping ambience (rain, chatter) keeps its phase, so no audible
//      restart when the tab comes back.
//   2. Any one-shot SFX scheduled while hidden (e.g. the espresso timer
//      firing on a throttled setTimeout) silently no-ops instead of
//      producing a delayed bark when the user returns.
export function setHowlerMuted(muted: boolean) {
  Howler.mute(muted)
}
