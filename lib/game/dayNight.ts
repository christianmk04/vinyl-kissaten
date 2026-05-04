import * as THREE from 'three'

// timeOfDay: 0..1 maps to a 24-hour cycle (0 = midnight, 0.5 = noon)
// Full cycle = 6 real minutes by default → increment per 60fps frame = 1/(60*360)

export const CYCLE_INCREMENT_60FPS = 1 / (60 * 360) // ~0.0000463

// Returns the window/exterior light color for a given timeOfDay value
export function getWindowColor(t: number): THREE.Color {
  const night = new THREE.Color('#0a0a1a')
  const preDawn = new THREE.Color('#2a1a3a')
  const dawn = new THREE.Color('#ff8833')
  const day = new THREE.Color('#6688bb')
  const dusk = new THREE.Color('#ff5511')

  if (t < 0.15) {
    // Night
    return night.clone()
  } else if (t < 0.3) {
    // Pre-dawn purple
    const tt = (t - 0.15) / 0.15
    return night.clone().lerp(preDawn, tt)
  } else if (t < 0.4) {
    // Dawn orange
    const tt = (t - 0.3) / 0.1
    return preDawn.clone().lerp(dawn, tt)
  } else if (t < 0.5) {
    // Dawn → day
    const tt = (t - 0.4) / 0.1
    return dawn.clone().lerp(day, tt)
  } else if (t < 0.8) {
    // Daytime
    return day.clone()
  } else if (t < 0.9) {
    // Dusk
    const tt = (t - 0.8) / 0.1
    return day.clone().lerp(dusk, tt)
  } else {
    // Night
    const tt = (t - 0.9) / 0.1
    return dusk.clone().lerp(night, tt)
  }
}

// Returns ambient intensity modifier for time of day (dim at night, brighter at noon)
export function getAmbientIntensity(t: number): number {
  if (t < 0.3) return 4          // night: dim but visible
  if (t < 0.5) return 4 + (t - 0.3) * 30  // dawn ramp
  if (t < 0.8) return 10         // afternoon: warm and bright
  return 10 - (t - 0.8) * 30    // dusk ramp (floor at 1 near midnight)
}

// Simple time-of-day label for the now-playing card
export function getTimeLabel(t: number): string {
  const hour = Math.floor(t * 24)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h}${suffix}`
}
