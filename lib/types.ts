export interface SpotifyTrack {
  id: string
  uri: string
  name: string
  duration_ms: number
  disc_number: number
  track_number: number
  artists: Array<{ id: string; name: string }>
  // 30-second mp3 preview — null for tracks without a preview clip.
  // Used by preview-mode playback for full Web Audio FX chain access.
  preview_url: string | null
}

export interface SpotifyAlbum {
  id: string
  uri: string
  name: string
  artists: Array<{ id: string; name: string }>
  images: Array<{ url: string; width: number; height: number }>
  genres: string[]
  total_tracks: number
  release_date: string
  tracks?: SpotifyTrack[]
  // downsampled art cached as data URL
  artDataUrl?: string
}

export type GameView = 'first-person' | 'shelf-detail' | 'turntable-top-down'
export type RecordSide = 'A' | 'B'
export type TonearmState = 'rest' | 'cued' | 'playing'
export type PlatterRpm = 33 | 45 | 78

// Now-playing snapshot. This shape originally came from the Spotify Web
// Playback SDK; after dropping the SDK we kept the same fields and now
// synthesize this object in previewPlayer's onTrackChange callback so the
// UI (NowPlaying panel, end-of-side detection) stays mode-agnostic.
export interface SpotifyPlaybackState {
  context: { uri: string }
  track_window: {
    current_track: {
      id: string
      uri: string
      name: string
      duration_ms: number
      artists: Array<{ name: string }>
      album: { name: string; images: Array<{ url: string }> }
    }
    next_tracks: Array<{ uri: string }>
    previous_tracks: Array<{ uri: string }>
  }
  position: number
  duration: number
  paused: boolean
  shuffle: boolean
  repeat_mode: number
}
