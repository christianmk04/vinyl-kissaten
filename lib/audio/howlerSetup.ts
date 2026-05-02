'use client'

import { Howl, Howler } from 'howler'

// All sounds are lazy-initialized on first use.
// Audio files must be CC0 — see CREDITS.md for attributions.

let initialized = false

const sounds: Record<string, Howl> = {}

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

  // Fade in ambient sounds over 2s
  sounds.rain.play()
  sounds.rain.fade(0, 0.4, 2000)
  sounds.chatter.play()
  sounds.chatter.fade(0, 0.25, 2000)

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

export function duckChatForMusic() {
  sounds.chatter?.fade(0.25, 0.08, 1000)
}

export function unduckChat() {
  sounds.chatter?.fade(0.08, 0.25, 1000)
}

export function setMasterVolume(v: number) {
  Howler.volume(v)
}
