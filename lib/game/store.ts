import { create } from 'zustand'
import type {
  SpotifyAlbum,
  SpotifyTrack,
  GameView,
  RecordSide,
  TonearmState,
  PlatterRpm,
  SpotifyPlaybackState,
} from '@/lib/types'

interface GameStore {
  // ── Auth ──────────────────────────────────────────────────────────────────
  spotifyToken: string | null
  spotifyDeviceId: string | null
  isPremium: boolean | null
  setSpotifyToken: (token: string | null) => void
  setSpotifyDeviceId: (id: string | null) => void
  setIsPremium: (v: boolean) => void

  // ── Library ───────────────────────────────────────────────────────────────
  albums: SpotifyAlbum[]
  shelvesByCategory: Record<string, SpotifyAlbum[]>
  setAlbums: (albums: SpotifyAlbum[]) => void
  setShelvesByCategory: (map: Record<string, SpotifyAlbum[]>) => void

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
  setSpotifyToken: (token) => set({ spotifyToken: token }),
  setSpotifyDeviceId: (id) => set({ spotifyDeviceId: id }),
  setIsPremium: (v) => set({ isPremium: v }),

  // ── Library ───────────────────────────────────────────────────────────────
  albums: [],
  shelvesByCategory: {},
  setAlbums: (albums) => set({ albums }),
  setShelvesByCategory: (map) => set({ shelvesByCategory: map }),

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

  playbackState: null,
  setPlaybackState: (s) => set({ playbackState: s }),

  endOfSideReached: false,
  setEndOfSideReached: (v) => set({ endOfSideReached: v }),

  // ── World ─────────────────────────────────────────────────────────────────
  timeOfDay: 0.85, // start at dusk — most atmospheric
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
