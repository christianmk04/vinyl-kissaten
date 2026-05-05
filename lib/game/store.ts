import { create } from 'zustand'
import type {
  SpotifyAlbum,
  SpotifyTrack,
  GameView,
  RecordSide,
  TonearmState,
  PlatterRpm,
  SpotifyPlaybackState,
  PlaybackMode,
} from '@/lib/types'

interface GameStore {
  // ── Auth ──────────────────────────────────────────────────────────────────
  spotifyToken: string | null
  spotifyDeviceId: string | null
  isPremium: boolean | null
  // Guest mode = visitor browsing the host's pre-baked library snapshot
  // (public/library.json) with 30s previews, no Spotify account needed.
  // When true, the app skips the Web Playback SDK and reads tracks from the
  // snapshot directly. Forced in tandem with playbackMode='preview'.
  guestMode: boolean
  setSpotifyToken: (token: string | null) => void
  setSpotifyDeviceId: (id: string | null) => void
  setIsPremium: (v: boolean) => void
  setGuestMode: (v: boolean) => void

  // ── Library ───────────────────────────────────────────────────────────────
  albums: SpotifyAlbum[]
  shelvesByCategory: Record<string, SpotifyAlbum[]>
  setAlbums: (albums: SpotifyAlbum[]) => void
  setShelvesByCategory: (map: Record<string, SpotifyAlbum[]>) => void

  // ── Library load progress (for loading screen) ────────────────────────────
  libraryLoadState: 'pending' | 'fetching' | 'processing' | 'done' | 'error'
  libraryProgress: { loaded: number; total: number }
  libraryError: string | null
  setLibraryLoadState: (s: 'pending' | 'fetching' | 'processing' | 'done' | 'error') => void
  setLibraryProgress: (p: { loaded: number; total: number }) => void
  setLibraryError: (e: string | null) => void

  // ── Game state ────────────────────────────────────────────────────────────
  view: GameView
  setView: (v: GameView) => void

  heldAlbum: SpotifyAlbum | null
  heldSide: RecordSide
  setHeldAlbum: (album: SpotifyAlbum | null) => void
  flipHeldRecord: () => void

  loadedAlbum: SpotifyAlbum | null
  loadedSide: RecordSide
  setLoadedAlbum: (album: SpotifyAlbum | null) => void
  flipLoadedRecord: () => void
  pickUpFromTurntable: () => void

  sideATracks: SpotifyTrack[]
  sideBTracks: SpotifyTrack[]
  setSideTracks: (a: SpotifyTrack[], b: SpotifyTrack[]) => void

  isPlaying: boolean
  setIsPlaying: (v: boolean) => void

  platterRpm: PlatterRpm
  setPlatterRpm: (rpm: PlatterRpm) => void

  tonearmState: TonearmState
  setTonearmState: (s: TonearmState) => void

  volume: number
  setVolume: (v: number) => void

  autoFlip: boolean
  setAutoFlip: (v: boolean) => void

  // 'spotify' = full tracks via Web Playback SDK (no FX — DRM-locked stream)
  // 'preview' = 30-second mp3 previews via Web Audio (full FX chain works)
  playbackMode: PlaybackMode
  setPlaybackMode: (m: PlaybackMode) => void

  previewError: string | null
  setPreviewError: (msg: string | null) => void

  // ── Playback state (from SDK) ─────────────────────────────────────────────
  playbackState: SpotifyPlaybackState | null
  setPlaybackState: (s: SpotifyPlaybackState | null) => void

  // End-of-side detection
  endOfSideReached: boolean
  setEndOfSideReached: (v: boolean) => void

  // ── World ─────────────────────────────────────────────────────────────────
  timeOfDay: number
  cycleSpeed: number
  setTimeOfDay: (t: number) => void
  setCycleSpeed: (s: number) => void

  // ── UI ────────────────────────────────────────────────────────────────────
  showNowPlaying: boolean
  toggleNowPlaying: () => void

  showCRTOverlay: boolean
  toggleCRTOverlay: () => void

  showBarrelDistortion: boolean
  toggleBarrelDistortion: () => void

  showFlicker: boolean
  toggleFlicker: () => void

  // ── Turntable audio/visual knobs ─────────────────────────────────────────
  brightness: number  // -1..+1  tone — peaking presence + air shelf
  pitch: number       // -1..+1  pitch fader position (scaled by pitchRange)
  pitchRange: 10 | 20 | 50  // LP1240-style pitch fader range in percent
  quartzLock: boolean // LP1240 quartz lock — bypasses pitch fader when true
  wowFlutter: number  // 0..1  LFO depth on playback rate
  setBrightness: (v: number) => void
  setPitch: (v: number) => void
  setPitchRange: (r: 10 | 20 | 50) => void
  setQuartzLock: (b: boolean) => void
  setWowFlutter: (v: number) => void

  // Shelf detail context
  activeShelfCategory: string | null
  activeShelfPage: number
  setActiveShelf: (category: string | null, page?: number) => void
  nextShelfPage: () => void
  prevShelfPage: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  spotifyToken: null,
  spotifyDeviceId: null,
  isPremium: null,
  guestMode: false,
  setSpotifyToken: (token) => set({ spotifyToken: token }),
  setSpotifyDeviceId: (id) => set({ spotifyDeviceId: id }),
  setIsPremium: (v) => set({ isPremium: v }),
  setGuestMode: (v) => set({ guestMode: v }),

  // ── Library ───────────────────────────────────────────────────────────────
  albums: [],
  shelvesByCategory: {},
  setAlbums: (albums) => set({ albums }),
  setShelvesByCategory: (map) => set({ shelvesByCategory: map }),

  libraryLoadState: 'pending',
  libraryProgress: { loaded: 0, total: 0 },
  libraryError: null,
  setLibraryLoadState: (s) => set({ libraryLoadState: s }),
  setLibraryProgress: (p) => set({ libraryProgress: p }),
  setLibraryError: (e) => set({ libraryError: e }),

  // ── Game state ────────────────────────────────────────────────────────────
  view: 'first-person',
  setView: (v) => set({ view: v }),

  heldAlbum: null,
  heldSide: 'A',
  setHeldAlbum: (album) => set({ heldAlbum: album, heldSide: 'A' }),
  flipHeldRecord: () =>
    set((s) => ({ heldSide: s.heldSide === 'A' ? 'B' : 'A' })),

  loadedAlbum: null,
  loadedSide: 'A',
  setLoadedAlbum: (album) => set({ loadedAlbum: album, loadedSide: 'A' }),
  flipLoadedRecord: () =>
    set((s) => ({ loadedSide: s.loadedSide === 'A' ? 'B' : 'A' })),
  pickUpFromTurntable: () =>
    set((s) => ({
      heldAlbum: s.loadedAlbum,
      heldSide: s.loadedSide,
      loadedAlbum: null,
      tonearmState: 'rest' as TonearmState,
    })),

  sideATracks: [],
  sideBTracks: [],
  setSideTracks: (a, b) => set({ sideATracks: a, sideBTracks: b }),

  isPlaying: false,
  setIsPlaying: (v) => set({ isPlaying: v }),

  platterRpm: 33,
  setPlatterRpm: (rpm) => set({ platterRpm: rpm }),

  tonearmState: 'rest',
  setTonearmState: (s) => set({ tonearmState: s }),

  volume: 0.8,
  setVolume: (v) => set({ volume: v }),

  autoFlip: false,
  setAutoFlip: (v) => set({ autoFlip: v }),

  playbackMode: 'spotify',
  setPlaybackMode: (m) => set({ playbackMode: m }),

  previewError: null,
  setPreviewError: (msg) => set({ previewError: msg }),

  playbackState: null,
  setPlaybackState: (s) => set({ playbackState: s }),

  endOfSideReached: false,
  setEndOfSideReached: (v) => set({ endOfSideReached: v }),

  // ── World ─────────────────────────────────────────────────────────────────
  timeOfDay: 0.65, // start at late afternoon — warm and visible
  cycleSpeed: 1,
  setTimeOfDay: (t) => set({ timeOfDay: t }),
  setCycleSpeed: (s) => set({ cycleSpeed: s }),

  // ── UI ────────────────────────────────────────────────────────────────────
  showNowPlaying: true,
  toggleNowPlaying: () => set((s) => ({ showNowPlaying: !s.showNowPlaying })),

  showCRTOverlay: false,
  toggleCRTOverlay: () => set((s) => ({ showCRTOverlay: !s.showCRTOverlay })),

  showBarrelDistortion: false,
  toggleBarrelDistortion: () =>
    set((s) => ({ showBarrelDistortion: !s.showBarrelDistortion })),

  showFlicker: false,
  toggleFlicker: () => set((s) => ({ showFlicker: !s.showFlicker })),

  brightness: 0,
  pitch: 0,
  pitchRange: 10,
  quartzLock: false,
  wowFlutter: 0,
  setBrightness: (v) => set({ brightness: v }),
  setPitch: (v) => set({ pitch: v }),
  setPitchRange: (r) => set({ pitchRange: r }),
  setQuartzLock: (b) => set({ quartzLock: b }),
  setWowFlutter: (v) => set({ wowFlutter: v }),

  activeShelfCategory: null,
  activeShelfPage: 0,
  setActiveShelf: (category, page = 0) =>
    set({ activeShelfCategory: category, activeShelfPage: page }),
  nextShelfPage: () => set((s) => ({ activeShelfPage: s.activeShelfPage + 1 })),
  prevShelfPage: () =>
    set((s) => ({
      activeShelfPage: Math.max(0, s.activeShelfPage - 1),
    })),
}))
