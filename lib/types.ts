export interface SpotifyTrack {
  id: string
  uri: string
  name: string
  duration_ms: number
  disc_number: number
  track_number: number
  artists: Array<{ id: string; name: string }>
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
export type PlatterRpm = 33 | 45

// Spotify Web Playback SDK types (partial)
declare global {
  interface Window {
    Spotify: {
      Player: new (options: SpotifyPlayerInit) => SpotifyPlayer
    }
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

export interface SpotifyPlayerInit {
  name: string
  getOAuthToken: (cb: (token: string) => void) => void
  volume?: number
}

export interface SpotifyPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  addListener(event: string, cb: (data: unknown) => void): void
  removeListener(event: string, cb?: (data: unknown) => void): void
  getCurrentState(): Promise<SpotifyPlaybackState | null>
  setVolume(volume: number): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  previousTrack(): Promise<void>
  nextTrack(): Promise<void>
}

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
