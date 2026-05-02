import type { SpotifyTrack } from '@/lib/types'

const SHORT_ALBUM_MS = 25 * 60 * 1000 // 25 minutes

export interface SideSplit {
  sideA: SpotifyTrack[]
  sideB: SpotifyTrack[]
}

export function splitSides(tracks: SpotifyTrack[]): SideSplit {
  if (tracks.length === 0) return { sideA: [], sideB: [] }

  // If disc_number info is present and there are multiple discs, use it
  const maxDisc = Math.max(...tracks.map((t) => t.disc_number ?? 1))
  if (maxDisc > 1) {
    return {
      sideA: tracks.filter((t) => (t.disc_number ?? 1) === 1),
      sideB: tracks.filter((t) => (t.disc_number ?? 1) === 2),
    }
  }

  // Short album: all on Side A
  const total = tracks.reduce((sum, t) => sum + t.duration_ms, 0)
  if (total < SHORT_ALBUM_MS) {
    return { sideA: tracks, sideB: [] }
  }

  // Split by cumulative duration at ~50%
  const half = total / 2
  let acc = 0
  let splitIdx = 1
  for (let i = 0; i < tracks.length - 1; i++) {
    acc += tracks[i].duration_ms
    if (acc >= half) {
      // Choose whichever boundary (before or after this track) is closer to half
      const beforeDist = Math.abs(acc - tracks[i].duration_ms - half)
      const afterDist = Math.abs(acc - half)
      splitIdx = afterDist < beforeDist ? i + 1 : i
      break
    }
  }
  splitIdx = Math.max(1, Math.min(splitIdx, tracks.length - 1))

  return {
    sideA: tracks.slice(0, splitIdx),
    sideB: tracks.slice(splitIdx),
  }
}

export function formatSideLabel(
  side: 'A' | 'B',
  currentTrackUri: string | undefined,
  tracks: SpotifyTrack[],
): string {
  if (!currentTrackUri) return `Side ${side}`
  const idx = tracks.findIndex((t) => t.uri === currentTrackUri)
  if (idx === -1) return `Side ${side}`
  return `Side ${side} · Track ${idx + 1} of ${tracks.length}`
}
